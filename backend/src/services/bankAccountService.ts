import db from '../config/database';

const isSQLite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

export type BankAccountRecord = {
  id: number;
  user_email: string;
  bank_account_id: string;
  connected_account_id: string;
  currency: string;
  country: string;
  account_holder_name?: string | null;
  created_at?: any;
  updated_at?: any;
};

export type CreateBankAccountInput = {
  user_email: string;
  bank_account_id: string;
  connected_account_id: string;
  currency: string;
  country: string;
  account_holder_name?: string | null;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getBankAccountsByEmail(userEmail: string): Promise<BankAccountRecord[]> {
  const email = normalizeEmail(userEmail);
  if (isSQLite) {
    return (db as any)
      .prepare(
        `SELECT * FROM bank_accounts
         WHERE user_email = ?
         ORDER BY created_at DESC`,
      )
      .all(email) as BankAccountRecord[];
  }

  const result = await (db as any).query(
    `SELECT * FROM bank_accounts
     WHERE user_email = $1
     ORDER BY created_at DESC`,
    [email],
  );

  return result.rows as BankAccountRecord[];
}

export async function upsertBankAccount(input: CreateBankAccountInput): Promise<BankAccountRecord> {
  const email = normalizeEmail(input.user_email);

  if (isSQLite) {
    const nowIso = new Date().toISOString();

    (db as any)
      .prepare(
        `INSERT INTO bank_accounts (
          user_email,
          bank_account_id,
          connected_account_id,
          currency,
          country,
          account_holder_name,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_email, bank_account_id) DO UPDATE SET
          connected_account_id = excluded.connected_account_id,
          currency = excluded.currency,
          country = excluded.country,
          account_holder_name = excluded.account_holder_name,
          updated_at = excluded.updated_at`,
      )
      .run(
        email,
        input.bank_account_id,
        input.connected_account_id,
        input.currency,
        input.country,
        input.account_holder_name ?? null,
        nowIso,
        nowIso,
      );

    const row = (db as any)
      .prepare(
        `SELECT * FROM bank_accounts
         WHERE user_email = ? AND bank_account_id = ?`,
      )
      .get(email, input.bank_account_id) as BankAccountRecord;

    return row;
  }

  const result = await (db as any).query(
    `INSERT INTO bank_accounts (
      user_email,
      bank_account_id,
      connected_account_id,
      currency,
      country,
      account_holder_name
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_email, bank_account_id) DO UPDATE SET
      connected_account_id = EXCLUDED.connected_account_id,
      currency = EXCLUDED.currency,
      country = EXCLUDED.country,
      account_holder_name = EXCLUDED.account_holder_name,
      updated_at = NOW()
    RETURNING *`,
    [
      email,
      input.bank_account_id,
      input.connected_account_id,
      input.currency,
      input.country,
      input.account_holder_name ?? null,
    ],
  );

  return result.rows[0] as BankAccountRecord;
}


