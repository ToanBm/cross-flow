import { Request, Response } from 'express';
import { getActivityForAddress } from '../services/activityService';
import { isValidAddress } from '../utils/blockchain';

/**
 * GET /api/activity/:address
 * Returns merged activity (transfers + payments + cashouts) for an address.
 * Query params:
 * - limit: number (default 50, max 200)
 * - sync: 'true' | 'false' (default true)
 */
export async function getActivity(req: Request, res: Response) {
  try {
    const { address } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const sync = req.query.sync !== 'false';

    if (!address || !isValidAddress(address)) {
      return res.status(400).json({ error: 'Invalid address' });
    }

    const result = await getActivityForAddress({
      address,
      limit,
      sync,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[ActivityController] Error:', error);
    const msg = error?.message || 'Failed to load activity';
    // Surface upstream RPC outage as 502 to make it obvious
    if (msg.includes('502') || msg.includes('Bad Gateway') || error?.code === 'SERVER_ERROR') {
      return res.status(502).json({ error: msg });
    }
    return res.status(500).json({ error: msg });
  }
}


