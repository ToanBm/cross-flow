import { Request, Response } from 'express';
import { linkWalletToEmail } from '../services/userWalletLinkService';

export async function linkWallet(req: Request, res: Response) {
  try {
    const body = req.body || {};
    const user_email = String(body.user_email || '').trim().toLowerCase();
    const wallet_address = String(body.wallet_address || '').trim().toLowerCase();

    if (!user_email || !user_email.includes('@')) {
      return res.status(400).json({ error: 'Invalid user email' });
    }
    if (!wallet_address || !wallet_address.startsWith('0x') || wallet_address.length !== 42) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }

    const result = await linkWalletToEmail({ user_email, wallet_address });
    if (!result.ok) {
      return res.status(409).json({
        error:
          result.conflict === 'wallet'
            ? 'This wallet is already linked to another email.'
            : 'This email is already linked to a different wallet.',
        conflict: result.conflict,
        existing: result.existing,
      });
    }

    return res.json({ ok: true, link: result.link, isNew: result.isNew });
  } catch (error: any) {
    console.error('[UserWalletLinkController] link error:', error);
    return res.status(500).json({ error: error.message || 'Failed to link wallet' });
  }
}


