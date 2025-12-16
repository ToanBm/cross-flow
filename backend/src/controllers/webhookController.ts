import { Request, Response } from 'express';
import { verifyWebhookSignature } from '../utils/stripe';
import { getCashoutByPayoutId, updateCashout } from '../services/cashoutService';
import { getPaymentByPaymentIntentId, updatePayment } from '../services/paymentService';
import { updateActivityByPaymentIntentId } from '../services/activityHistoryService';
import { transferTokenFromOfframp, waitForTransaction } from '../utils/blockchain';
import { stripeWebhookSecret } from '../config/stripe';
import logger from '../utils/logger';
import type Stripe from 'stripe';

// Extend Request type to include rawBody
interface WebhookRequest extends Request {
  rawBody?: string;
}

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(req: WebhookRequest, res: Response) {
  try {
    // Debug logs
    console.log('--- WEBHOOK RECEIVED ---');
    console.log('URL:', req.originalUrl);
    console.log('rawBody exists:', !!req.rawBody);
    console.log('rawBody length:', req.rawBody?.length || 0);
    
    const signature = req.headers['stripe-signature'] as string;
    console.log('Signature:', signature ? signature.substring(0, 50) + '...' : 'MISSING');

    if (!signature) {
      logger.error('Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Use rawBody saved by express.json verify callback
    const payload = req.rawBody;

    if (!payload) {
      logger.error('rawBody is undefined - verify callback not working');
      return res.status(400).json({ error: 'Raw body not available' });
    }

    // Debug: check webhook secret
    const secret = stripeWebhookSecret || '';
    console.log(`Secret: start='${secret.substring(0, 10)}', end='${secret.substring(secret.length - 5)}', len=${secret.length}`);

    // Verify webhook signature
    const event = verifyWebhookSignature(
      payload,
      signature,
      stripeWebhookSecret
    ) as Stripe.Event;

    console.log('✅ Signature verified!');
    logger.info('Webhook event verified', { type: event.type, id: event.id });

    // Handle different event types
    switch (event.type) {
      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      case 'payout.canceled':
        await handlePayoutCanceled(event.data.object as Stripe.Payout);
        break;

      case 'payment_intent.succeeded':
        logger.debug('Handling payment_intent.succeeded');
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        logger.info('payment_intent.succeeded handled successfully');
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.canceled':
        await handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        // Unhandled event type - ignore
        break;
    }

    // Always return 200 to acknowledge receipt
    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error', { error: error.message, stack: error.stack });
    
    // Still return 200 to prevent Stripe from retrying
    // Log error for manual investigation
    res.status(200).json({ 
      received: true, 
      error: error.message 
    });
  }
}

/**
 * Handle payout.paid event
 */
async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    const cashout = await getCashoutByPayoutId(payout.id);

    if (!cashout) {
      console.warn(`Cashout not found for payout ${payout.id}`);
      return;
    }

    await updateCashout(cashout.id!, {
      status: 'paid',
      completed_at: new Date(),
    });
  } catch (error) {
    logger.error('Error handling payout.paid', { error, payoutId: payout.id });
    throw error;
  }
}

/**
 * Handle payout.failed event
 */
async function handlePayoutFailed(payout: Stripe.Payout) {
  try {
    const cashout = await getCashoutByPayoutId(payout.id);

    if (!cashout) {
      logger.warn(`Cashout not found for payout ${payout.id}`);
      return;
    }

    const failureCode = payout.failure_code || 'unknown';
    const failureMessage = payout.failure_message || 'Payout failed';

    await updateCashout(cashout.id!, {
      status: 'failed',
      error_message: `Stripe payout failed: ${failureCode} - ${failureMessage}`,
    });
  } catch (error) {
    logger.error('Error handling payout.failed', { error, payoutId: payout.id });
    throw error;
  }
}

/**
 * Handle payout.canceled event
 */
async function handlePayoutCanceled(payout: Stripe.Payout) {
  try {
    const cashout = await getCashoutByPayoutId(payout.id);

    if (!cashout) {
      logger.warn(`Cashout not found for payout ${payout.id}`);
      return;
    }

    await updateCashout(cashout.id!, {
      status: 'canceled',
      error_message: 'Stripe payout was canceled',
    });
  } catch (error) {
    logger.error('Error handling payout.canceled', { error, payoutId: payout.id });
    throw error;
  }
}

/**
 * Handle payment_intent.succeeded event
 * Transfer USDT from offramp wallet to user wallet
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    logger.info('handlePaymentIntentSucceeded called', { 
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata 
    });
    
    const payment = await getPaymentByPaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
      return;
    }

    // Check if already processed
    if (payment.status === 'completed' || payment.tx_hash) {
      logger.info('Payment already processed', { 
        paymentId: payment.id, 
        status: payment.status, 
        txHash: payment.tx_hash 
      });
      return;
    }

    // Update status to processing
    await updatePayment(payment.id!, {
      status: 'processing',
    });

    // Get wallet address from metadata
    const walletAddress = paymentIntent.metadata?.wallet_address || payment.wallet_address;

    if (!walletAddress) {
      throw new Error('Wallet address not found in payment intent metadata');
    }

    // Get token info from metadata
    const tokenSymbol = paymentIntent.metadata?.token_symbol || 'AlphaUSD';
    // Get token address from metadata, or fallback to config by symbol
    let tokenAddress = paymentIntent.metadata?.token_address;
    
    if (!tokenAddress) {
      // Fallback: get from config by token symbol
      const { getTokenAddress } = await import('../config/blockchain');
      tokenAddress = getTokenAddress(tokenSymbol);
      logger.info('Token address not in metadata, using config', { tokenSymbol, tokenAddress });
    }
    
    logger.info('Token transfer info', { 
      tokenSymbol, 
      tokenAddress, 
      walletAddress,
      paymentIntentMetadata: paymentIntent.metadata 
    });
    
    // Transfer token from offramp wallet to user wallet
    // Convert amount to string if needed (database might return number)
    const amountStablecoin = typeof payment.amount_usdt === 'string' 
      ? payment.amount_usdt 
      : String(payment.amount_usdt);
    
    logger.info('Transferring token', { amountStablecoin, tokenSymbol, tokenAddress, walletAddress, paymentId: payment.id });
    
    let tx;
    try {
      tx = await transferTokenFromOfframp(walletAddress, amountStablecoin, tokenAddress);
      logger.info('Transaction created', { txHash: tx.hash, paymentId: payment.id });
    } catch (error: any) {
      logger.error('Failed to create transaction', { error: error.message, paymentId: payment.id });
      throw new Error(`Failed to create token transfer transaction: ${error.message}`);
    }

    // Wait for transaction confirmation
    logger.debug('Waiting for transaction confirmation', { txHash: tx.hash });
    let receipt;
    try {
      receipt = await waitForTransaction(tx.hash);
      if (receipt) {
        logger.info('Transaction receipt received', {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          status: receipt.status,
        });
      }
    } catch (error: any) {
      logger.error('Failed to wait for transaction', { error: error.message, txHash: tx.hash });
      throw new Error(`Failed to confirm transaction: ${error.message}`);
    }

    if (!receipt || receipt.status !== 1) {
      logger.error('Transaction failed on-chain', { status: receipt?.status, txHash: tx.hash });
      throw new Error(`Transaction failed on-chain. Status: ${receipt?.status}`);
    }

    // Update payment with transaction hash
    logger.info('Updating payment with transaction hash', { paymentId: payment.id, txHash: receipt.hash });
    await updatePayment(payment.id!, {
      tx_hash: receipt.hash,
      block_number: receipt.blockNumber,
      status: 'completed',
      completed_at: new Date(),
    });
    logger.info('Payment updated successfully', { paymentId: payment.id });

    // Update activity history with tx_hash
    try {
      await updateActivityByPaymentIntentId(paymentIntent.id, {
        tx_hash: receipt.hash,
        status: 'success',
      });
      logger.info('Activity history updated with tx_hash', { paymentIntentId: paymentIntent.id, txHash: receipt.hash });
    } catch (activityError) {
      logger.warn('Failed to update activity history (non-critical)', { error: activityError });
    }
  } catch (error: any) {
    logger.error('Error handling payment_intent.succeeded', { 
      error: error.message, 
      stack: error.stack,
      paymentIntentId: paymentIntent.id 
    });

    // Update payment status to failed
    try {
      const payment = await getPaymentByPaymentIntentId(paymentIntent.id);
      if (payment) {
        await updatePayment(payment.id!, {
          status: 'failed',
          error_message: error.message || 'Failed to transfer USDT',
        });
      }
    } catch (updateError) {
      logger.error('Failed to update payment status', { error: updateError, paymentIntentId: paymentIntent.id });
    }

    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await getPaymentByPaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
      return;
    }

    const failureMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    await updatePayment(payment.id!, {
      status: 'failed',
      error_message: `Stripe payment failed: ${failureMessage}`,
    });
  } catch (error) {
    logger.error('Error handling payment_intent.payment_failed', { error, paymentIntentId: paymentIntent.id });
    throw error;
  }
}

/**
 * Handle payment_intent.canceled event
 */
async function handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
  try {
    const payment = await getPaymentByPaymentIntentId(paymentIntent.id);

    if (!payment) {
      logger.warn(`Payment not found for payment intent ${paymentIntent.id}`);
      return;
    }

    await updatePayment(payment.id!, {
      status: 'canceled',
      error_message: 'Payment intent was canceled',
    });
  } catch (error) {
    logger.error('Error handling payment_intent.canceled', { error, paymentIntentId: paymentIntent.id });
    throw error;
  }
}

