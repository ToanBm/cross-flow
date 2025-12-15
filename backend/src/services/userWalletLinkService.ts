import db from '../config/database';

const isSQLite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

export type UserWalletLink = {
  id: number;
  user_email: string;
  wallet_address: string;
  created_at?: any;
  updated_at?: any;
};

export async function linkWalletToEmail(params: {
  user_email: string;
  wallet_address: string;
}): Promise<
  | { ok: true; link: UserWalletLink; isNew: boolean }
  | { ok: false; conflict: 'email' | 'wallet'; existing: { user_email: string; wallet_address: string } }
> {
  const email = normalizeEmail(params.user_email);
  const wallet = normalizeAddress(params.wallet_address);

  if (isSQLite) {
    const existingByEmail = (db as any)
      .prepare(`SELECT * FROM user_wallet_links WHERE user_email = ?`)
      .get(email) as UserWalletLink | undefined;

    if (existingByEmail && normalizeAddress(existingByEmail.wallet_address) !== wallet) {
      return {
        ok: false,
        conflict: 'email',
        existing: { user_email: existingByEmail.user_email, wallet_address: existingByEmail.wallet_address },
      };
    }

    const existingByWallet = (db as any)
      .prepare(`SELECT * FROM user_wallet_links WHERE wallet_address = ?`)
      .get(wallet) as UserWalletLink | undefined;

    if (existingByWallet && normalizeEmail(existingByWallet.user_email) !== email) {
      return {
        ok: false,
        conflict: 'wallet',
        existing: { user_email: existingByWallet.user_email, wallet_address: existingByWallet.wallet_address },
      };
    }

    // Already linked correctly
    if (existingByEmail && existingByWallet) {
      return { ok: true, link: existingByEmail, isNew: false };
    }

    const nowIso = new Date().toISOString();
    (db as any)
      .prepare(
        `INSERT INTO user_wallet_links (user_email, wallet_address, created_at, updated_at)
         VALUES (?, ?, ?, ?)`,
      )
      .run(email, wallet, nowIso, nowIso);

    const link = (db as any)
      .prepare(`SELECT * FROM user_wallet_links WHERE user_email = ?`)
      .get(email) as UserWalletLink;

    return { ok: true, link, isNew: true };
  }

  // Postgres
  const existingByEmailResult = await (db as any).query(
    `SELECT * FROM user_wallet_links WHERE user_email = $1`,
    [email],
  );
  const existingByEmail = existingByEmailResult.rows?.[0] as UserWalletLink | undefined;
  if (existingByEmail && normalizeAddress(existingByEmail.wallet_address) !== wallet) {
    return {
      ok: false,
      conflict: 'email',
      existing: { user_email: existingByEmail.user_email, wallet_address: existingByEmail.wallet_address },
    };
  }

  const existingByWalletResult = await (db as any).query(
    `SELECT * FROM user_wallet_links WHERE wallet_address = $1`,
    [wallet],
  );
  const existingByWallet = existingByWalletResult.rows?.[0] as UserWalletLink | undefined;
  if (existingByWallet && normalizeEmail(existingByWallet.user_email) !== email) {
    return {
      ok: false,
      conflict: 'wallet',
      existing: { user_email: existingByWallet.user_email, wallet_address: existingByWallet.wallet_address },
    };
  }

  if (existingByEmail && existingByWallet) {
    return { ok: true, link: existingByEmail, isNew: false };
  }

  const insert = await (db as any).query(
    `INSERT INTO user_wallet_links (user_email, wallet_address)
     VALUES ($1, $2)
     RETURNING *`,
    [email, wallet],
  );

  return { ok: true, link: insert.rows[0] as UserWalletLink, isNew: true };
}


