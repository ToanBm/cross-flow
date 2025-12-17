-- SQLite compatible schema
-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT,
  country TEXT,
  stripe_bank_account_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payrolls table
-- Note: payroll_id is NOT UNIQUE to support batch payrolls (multiple employees can share same payroll_id)
CREATE TABLE IF NOT EXISTS payrolls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payroll_id TEXT NOT NULL,
  employer_address TEXT NOT NULL,
  employee_address TEXT NOT NULL,
  amount_usdt REAL NOT NULL,
  tx_hash TEXT,
  block_number INTEGER,
  status TEXT DEFAULT 'pending',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cashouts table
CREATE TABLE IF NOT EXISTS cashouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_address TEXT NOT NULL,
  amount_usdt REAL NOT NULL,
  fiat_currency TEXT NOT NULL,
  fiat_amount REAL,
  exchange_rate REAL,
  tx_hash_onchain TEXT NOT NULL,
  payout_id_stripe TEXT,
  stripe_bank_account_id TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate REAL NOT NULL,
  source TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Payments table (On-Ramp: VISA/Mastercard → USDT)
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_intent_id TEXT UNIQUE NOT NULL,
  wallet_address TEXT NOT NULL,
  amount_fiat REAL NOT NULL,
  fiat_currency TEXT NOT NULL,
  amount_usdt REAL NOT NULL,
  exchange_rate REAL NOT NULL,
  tx_hash TEXT,
  block_number INTEGER,
  status TEXT DEFAULT 'pending',
  -- pending, processing, completed, failed, canceled
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payrolls_payroll_id ON payrolls(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_employer ON payrolls(employer_address);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee ON payrolls(employee_address);
CREATE INDEX IF NOT EXISTS idx_payrolls_tx_hash ON payrolls(tx_hash);
CREATE INDEX IF NOT EXISTS idx_cashouts_employee ON cashouts(employee_address);
CREATE INDEX IF NOT EXISTS idx_cashouts_tx_hash ON cashouts(tx_hash_onchain);
CREATE INDEX IF NOT EXISTS idx_cashouts_payout_id ON cashouts(payout_id_stripe);
CREATE INDEX IF NOT EXISTS idx_cashouts_status ON cashouts(status);
CREATE INDEX IF NOT EXISTS idx_cashouts_bank_account ON cashouts(stripe_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_payments_payment_intent_id ON payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_wallet_address ON payments(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payments_tx_hash ON payments(tx_hash);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Recipients table (Saved payment recipients)
CREATE TABLE IF NOT EXISTS recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_wallet_address TEXT NOT NULL,
  recipient_address TEXT,
  recipient_name TEXT,
  recipient_email TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'address',
  -- recipient_type: 'address' (0x...), 'email', 'both'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_wallet_address, recipient_address),
  UNIQUE(user_wallet_address, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_recipients_address ON recipients(recipient_address);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(recipient_email);

-- Transfers table (On-chain send/receive history)
-- Stores raw token transfers (Transfer / TransferWithMemo) so UI can load history from DB.
CREATE TABLE IF NOT EXISTS transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_address TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_raw TEXT NOT NULL, -- uint256 as decimal string
  decimals INTEGER NOT NULL DEFAULT 6,
  memo TEXT, -- bytes32 hex (0x...) if available
  tx_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  block_timestamp INTEGER, -- unix seconds
  event_name TEXT NOT NULL DEFAULT 'Transfer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_transfers_token ON transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_transfers_block ON transfers(block_number);
CREATE INDEX IF NOT EXISTS idx_transfers_txhash ON transfers(tx_hash);

-- Sync state for incremental log scanning per user+token
CREATE TABLE IF NOT EXISTS transfer_sync_state (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_address TEXT NOT NULL,
  token_address TEXT NOT NULL,
  last_synced_block INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_address, token_address)
);

CREATE INDEX IF NOT EXISTS idx_transfer_sync_user ON transfer_sync_state(user_address);
CREATE INDEX IF NOT EXISTS idx_transfer_sync_token ON transfer_sync_state(token_address);

-- Bank accounts table (Stripe-linked bank accounts per user email)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  bank_account_id TEXT NOT NULL,
  connected_account_id TEXT NOT NULL,
  currency TEXT NOT NULL,
  country TEXT NOT NULL,
  account_holder_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email, bank_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_email ON bank_accounts(user_email);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_account_id ON bank_accounts(bank_account_id);

-- User wallet links (1 email <-> 1 wallet address)
CREATE TABLE IF NOT EXISTS user_wallet_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_email TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_email),
  UNIQUE(wallet_address)
);

CREATE INDEX IF NOT EXISTS idx_user_wallet_links_email ON user_wallet_links(user_email);
CREATE INDEX IF NOT EXISTS idx_user_wallet_links_wallet ON user_wallet_links(wallet_address);

-- WebAuthn KeyManager (Tempo Passkey wallets)
-- Stores public keys for WebAuthn credentials so users can sign in from multiple devices.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge TEXT PRIMARY KEY, -- hex (0x...)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL, -- hex (0x...)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Activity history table (user-initiated actions: send/deposit/withdraw)
CREATE TABLE IF NOT EXISTS activity_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet_address TEXT NOT NULL,
  activity_type TEXT NOT NULL, -- 'send', 'deposit', 'withdraw'
  token_address TEXT, -- null for fiat deposits
  token_symbol TEXT, -- 'AlphaUSD', 'BetaUSD', 'ThetaUSD', 'USDC', 'USD', 'EUR'
  amount REAL NOT NULL,
  amount_fiat REAL, -- for deposits/withdraws
  currency TEXT, -- 'USD', 'EUR' for fiat
  to_address TEXT, -- recipient (send) or null (deposit)
  from_address TEXT, -- sender (usually wallet_address) or null
  tx_hash TEXT, -- on-chain transaction hash
  payment_intent_id TEXT, -- Stripe payment intent ID (for deposits)
  payout_id TEXT, -- Stripe payout ID (for withdraws)
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  memo TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_activity_history_wallet ON activity_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_activity_history_type ON activity_history(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_history_created ON activity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_history_tx_hash ON activity_history(tx_hash);

-- Feedbacks table (User feedback)
CREATE TABLE IF NOT EXISTS feedbacks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  email TEXT,
  user_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_email ON feedbacks(email);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);

