import { Request, Response } from 'express';
import { saveActivity, getActivityHistory } from '../services/activityHistoryService';

/**
 * POST /api/activity/log
 * Log a user activity (send/deposit/withdraw)
 */
export async function logActivity(req: Request, res: Response) {
  try {
    const {
      wallet_address,
      activity_type,
      token_address,
      token_symbol,
      amount,
      amount_fiat,
      currency,
      to_address,
      from_address,
      tx_hash,
      payment_intent_id,
      payout_id,
      status,
      memo,
    } = req.body;

    // Validation
    if (!wallet_address || typeof wallet_address !== 'string') {
      return res.status(400).json({ error: 'wallet_address is required' });
    }

    if (!activity_type || !['send', 'deposit', 'withdraw'].includes(activity_type)) {
      return res.status(400).json({ error: 'activity_type must be: send, deposit, or withdraw' });
    }

    if (!amount || Number.isNaN(Number(amount))) {
      return res.status(400).json({ error: 'amount is required and must be a number' });
    }

    const record = await saveActivity({
      wallet_address,
      activity_type,
      token_address: token_address || null,
      token_symbol: token_symbol || null,
      amount: Number(amount),
      amount_fiat: amount_fiat ? Number(amount_fiat) : null,
      currency: currency || null,
      to_address: to_address || null,
      from_address: from_address || null,
      tx_hash: tx_hash || null,
      payment_intent_id: payment_intent_id || null,
      payout_id: payout_id || null,
      status: status || 'success',
      memo: memo || null,
    });

    res.json({ activity: record });
  } catch (error: any) {
    console.error('[ActivityHistoryController] log error:', error);
    res.status(500).json({ error: error.message || 'Failed to log activity' });
  }
}

/**
 * GET /api/activity
 * Get activity history for a wallet address
 */
export async function getActivity(req: Request, res: Response) {
  try {
    const walletAddress = req.query.wallet_address as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!walletAddress) {
      return res.status(400).json({ error: 'wallet_address query parameter is required' });
    }

    const result = await getActivityHistory(walletAddress, limit, offset);

    res.json({
      activities: result.activities,
      total: result.total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[ActivityHistoryController] get error:', error);
    res.status(500).json({ error: error.message || 'Failed to get activity history' });
  }
}

