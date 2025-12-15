import { Request, Response } from 'express';
import {
  getBankAccountsByEmail,
  upsertBankAccount,
} from '../services/bankAccountService';
import { getStripe } from '../config/stripe';

export async function listBankAccounts(req: Request, res: Response) {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const accounts = await getBankAccountsByEmail(email);
    return res.json({ bankAccounts: accounts });
  } catch (error: any) {
    console.error('[BankAccountController] list error:', error);
    return res.status(500).json({ error: error.message || 'Failed to load bank accounts' });
  }
}

export async function createOrUpdateBankAccount(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const user_email = String(body.user_email || '').trim().toLowerCase();
    const bank_account_id = String(body.bank_account_id || '').trim();
    const connected_account_id = String(body.connected_account_id || '').trim();
    let currency = String(body.currency || '').trim();
    let country = String(body.country || '').trim();
    const account_holder_name =
      body.account_holder_name !== undefined && body.account_holder_name !== null
        ? String(body.account_holder_name)
        : null;

    if (!user_email || !user_email.includes('@')) {
      return res.status(400).json({ error: 'Invalid user email' });
    }
    if (!bank_account_id) return res.status(400).json({ error: 'bank_account_id is required' });
    if (!connected_account_id) return res.status(400).json({ error: 'connected_account_id is required' });

    // If currency/country are missing (re-link flow), infer from Stripe using acct_ + ba_
    if (!currency || !country) {
      try {
        const stripe = getStripe();
        const ext = await stripe.accounts.retrieveExternalAccount(connected_account_id, bank_account_id);
        // ext is a BankAccount or Card; we only support bank accounts here
        const extAny: any = ext as any;
        if (!currency && extAny?.currency) currency = String(extAny.currency).toUpperCase();
        if (!country && extAny?.country) country = String(extAny.country).toUpperCase();
      } catch (e: any) {
        // Keep error message user-friendly; include details for debugging
        return res.status(400).json({
          error: 'Unable to infer bank account details from Stripe. Please verify acct_... and ba_... are correct.',
          details: e?.message || String(e),
        });
      }
    }

    if (!currency) return res.status(400).json({ error: 'currency is required' });
    if (!country) return res.status(400).json({ error: 'country is required' });

    const record = await upsertBankAccount({
      user_email,
      bank_account_id,
      connected_account_id,
      currency,
      country,
      account_holder_name,
    });

    return res.json({ bankAccount: record });
  } catch (error: any) {
    console.error('[BankAccountController] create/update error:', error);
    return res.status(500).json({ error: error.message || 'Failed to save bank account' });
  }
}


