import db from '../config/database';

const isSQLite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

export type ActivityHistoryRecord = {
  id: number;
  wallet_address: string;
  activity_type: 'send' | 'deposit' | 'withdraw';
  token_address: string | null;
  token_symbol: string | null;
  amount: number;
  amount_fiat: number | null;
  currency: string | null;
  to_address: string | null;
  from_address: string | null;
  tx_hash: string | null;
  payment_intent_id: string | null;
  payout_id: string | null;
  status: 'pending' | 'success' | 'failed';
  memo: string | null;
  created_at: Date | string;
};

export type CreateActivityInput = {
  wallet_address: string;
  activity_type: 'send' | 'deposit' | 'withdraw';
  token_address?: string | null;
  token_symbol?: string | null;
  amount: number;
  amount_fiat?: number | null;
  currency?: string | null;
  to_address?: string | null;
  from_address?: string | null;
  tx_hash?: string | null;
  payment_intent_id?: string | null;
  payout_id?: string | null;
  status?: 'pending' | 'success' | 'failed';
  memo?: string | null;
};

/**
 * Save activity to history
 */
export async function saveActivity(input: CreateActivityInput): Promise<ActivityHistoryRecord> {
  const now = new Date();

  if (isSQLite) {
    const stmt = (db as any).prepare(`
      INSERT INTO activity_history (
        wallet_address, activity_type, token_address, token_symbol,
        amount, amount_fiat, currency, to_address, from_address,
        tx_hash, payment_intent_id, payout_id, status, memo, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      input.wallet_address.toLowerCase(),
      input.activity_type,
      input.token_address || null,
      input.token_symbol || null,
      input.amount,
      input.amount_fiat || null,
      input.currency || null,
      input.to_address || null,
      input.from_address || null,
      input.tx_hash || null,
      input.payment_intent_id || null,
      input.payout_id || null,
      input.status || 'success',
      input.memo || null,
      now.toISOString(),
    );

    const record = (db as any)
      .prepare('SELECT * FROM activity_history WHERE id = ? LIMIT 1')
      .get(result.lastInsertRowid) as ActivityHistoryRecord;

    return record;
  } else {
    // PostgreSQL
    const result = await (db as any).query(
      `INSERT INTO activity_history (
        wallet_address, activity_type, token_address, token_symbol,
        amount, amount_fiat, currency, to_address, from_address,
        tx_hash, payment_intent_id, payout_id, status, memo, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        input.wallet_address.toLowerCase(),
        input.activity_type,
        input.token_address || null,
        input.token_symbol || null,
        input.amount,
        input.amount_fiat || null,
        input.currency || null,
        input.to_address || null,
        input.from_address || null,
        input.tx_hash || null,
        input.payment_intent_id || null,
        input.payout_id || null,
        input.status || 'success',
        input.memo || null,
        now,
      ],
    );

    return result.rows[0] as ActivityHistoryRecord;
  }
}

/**
 * Get activity history for a wallet address
 */
export async function getActivityHistory(
  walletAddress: string,
  limit: number = 50,
  offset: number = 0,
): Promise<{ activities: ActivityHistoryRecord[]; total: number }> {
  const normalizedAddress = walletAddress.toLowerCase();

  if (isSQLite) {
    // Get total count
    const countResult = (db as any)
      .prepare('SELECT COUNT(*) as total FROM activity_history WHERE wallet_address = ?')
      .get(normalizedAddress);
    const total = countResult.total || 0;

    // Get activities
    const activities = (db as any)
      .prepare(
        'SELECT * FROM activity_history WHERE wallet_address = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      )
      .all(normalizedAddress, limit, offset) as ActivityHistoryRecord[];

    return { activities, total };
  } else {
    // PostgreSQL
    const countResult = await (db as any).query(
      'SELECT COUNT(*) as total FROM activity_history WHERE wallet_address = $1',
      [normalizedAddress],
    );
    const total = parseInt(countResult.rows[0].total) || 0;

    const result = await (db as any).query(
      'SELECT * FROM activity_history WHERE wallet_address = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [normalizedAddress, limit, offset],
    );

    return { activities: result.rows as ActivityHistoryRecord[], total };
  }
}

