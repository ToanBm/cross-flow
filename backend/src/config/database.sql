-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  country VARCHAR(2),
  stripe_bank_account_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payrolls table
-- Note: payroll_id is NOT UNIQUE to support batch payrolls (multiple employees can share same payroll_id)
CREATE TABLE IF NOT EXISTS payrolls (
  id SERIAL PRIMARY KEY,
  payroll_id VARCHAR(255) NOT NULL,
  employer_address VARCHAR(42) NOT NULL,
  employee_address VARCHAR(42) NOT NULL,
  amount_usdt DECIMAL(18, 6) NOT NULL,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  status VARCHAR(50) DEFAULT 'pending',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Cashouts table
CREATE TABLE IF NOT EXISTS cashouts (
  id SERIAL PRIMARY KEY,
  employee_address VARCHAR(42) NOT NULL,
  amount_usdt DECIMAL(18, 6) NOT NULL,
  fiat_currency VARCHAR(3) NOT NULL,
  fiat_amount DECIMAL(18, 2),
  exchange_rate DECIMAL(18, 8),
  tx_hash_onchain VARCHAR(66) NOT NULL,
  payout_id_stripe VARCHAR(255),
  stripe_bank_account_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Exchange rates table (optional - cache rates)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id SERIAL PRIMARY KEY,
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  rate DECIMAL(18, 8) NOT NULL,
  source VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Payments table (On-Ramp: VISA/Mastercard → USDT)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  payment_intent_id VARCHAR(255) UNIQUE NOT NULL,
  wallet_address VARCHAR(42) NOT NULL,
  amount_fiat DECIMAL(18, 2) NOT NULL,
  fiat_currency VARCHAR(3) NOT NULL,
  amount_usdt DECIMAL(18, 6) NOT NULL,
  exchange_rate DECIMAL(18, 8) NOT NULL,
  tx_hash VARCHAR(66),
  block_number BIGINT,
  status VARCHAR(50) DEFAULT 'pending',
  -- pending, processing, completed, failed, canceled
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
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
  id SERIAL PRIMARY KEY,
  user_wallet_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42),
  recipient_name VARCHAR(255),
  recipient_email VARCHAR(255),
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'address',
  -- recipient_type: 'address' (0x...), 'email', 'both'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_wallet_address, recipient_address),
  UNIQUE(user_wallet_address, recipient_email)
);

CREATE INDEX IF NOT EXISTS idx_recipients_user ON recipients(user_wallet_address);
CREATE INDEX IF NOT EXISTS idx_recipients_address ON recipients(recipient_address);
CREATE INDEX IF NOT EXISTS idx_recipients_email ON recipients(recipient_email);

-- Transfers table (On-chain send/receive history)
-- Stores raw token transfers (Transfer / TransferWithMemo) so UI can load history from DB.
CREATE TABLE IF NOT EXISTS transfers (
  id SERIAL PRIMARY KEY,
  token_address VARCHAR(42) NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  amount_raw TEXT NOT NULL, -- uint256 as decimal string
  decimals SMALLINT NOT NULL DEFAULT 6,
  memo TEXT, -- bytes32 hex (0x...) if available
  tx_hash VARCHAR(66) NOT NULL,
  log_index INTEGER NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp BIGINT,
  event_name VARCHAR(32) NOT NULL DEFAULT 'Transfer',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tx_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from ON transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_transfers_to ON transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_transfers_token ON transfers(token_address);
CREATE INDEX IF NOT EXISTS idx_transfers_block ON transfers(block_number);
CREATE INDEX IF NOT EXISTS idx_transfers_txhash ON transfers(tx_hash);

-- Sync state for incremental log scanning per user+token
CREATE TABLE IF NOT EXISTS transfer_sync_state (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL,
  token_address VARCHAR(42) NOT NULL,
  last_synced_block BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_address, token_address)
);

CREATE INDEX IF NOT EXISTS idx_transfer_sync_user ON transfer_sync_state(user_address);
CREATE INDEX IF NOT EXISTS idx_transfer_sync_token ON transfer_sync_state(token_address);

-- Bank accounts table (Stripe-linked bank accounts per user email)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  bank_account_id VARCHAR(255) NOT NULL,
  connected_account_id VARCHAR(255) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  country VARCHAR(10) NOT NULL,
  account_holder_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_email, bank_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_email ON bank_accounts(user_email);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bank_account_id ON bank_accounts(bank_account_id);

-- User wallet links (1 email <-> 1 wallet address)
CREATE TABLE IF NOT EXISTS user_wallet_links (
  id SERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL UNIQUE,
  wallet_address VARCHAR(42) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_wallet_links_email ON user_wallet_links(user_email);
CREATE INDEX IF NOT EXISTS idx_user_wallet_links_wallet ON user_wallet_links(wallet_address);

-- WebAuthn KeyManager (Tempo Passkey wallets)
-- Stores public keys for WebAuthn credentials so users can sign in from multiple devices.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge TEXT PRIMARY KEY, -- hex (0x...)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  public_key TEXT NOT NULL, -- hex (0x...)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity history table (user-initiated actions: send/deposit/withdraw)
CREATE TABLE IF NOT EXISTS activity_history (
  id SERIAL PRIMARY KEY,
  wallet_address VARCHAR(42) NOT NULL,
  activity_type VARCHAR(20) NOT NULL, -- 'send', 'deposit', 'withdraw'
  token_address VARCHAR(42), -- null for fiat deposits
  token_symbol VARCHAR(20), -- 'AlphaUSD', 'BetaUSD', 'ThetaUSD', 'USDC', 'USD', 'EUR'
  amount DECIMAL(18, 6) NOT NULL,
  amount_fiat DECIMAL(18, 2), -- for deposits/withdraws
  currency VARCHAR(3), -- 'USD', 'EUR' for fiat
  to_address VARCHAR(42), -- recipient (send) or null (deposit)
  from_address VARCHAR(42), -- sender (usually wallet_address) or null
  tx_hash VARCHAR(66), -- on-chain transaction hash
  payment_intent_id VARCHAR(255), -- Stripe payment intent ID (for deposits)
  payout_id VARCHAR(255), -- Stripe payout ID (for withdraws)
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'success', 'failed'
  memo TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_history_wallet ON activity_history(wallet_address);
CREATE INDEX IF NOT EXISTS idx_activity_history_type ON activity_history(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_history_created ON activity_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_history_tx_hash ON activity_history(tx_hash);

-- Feedbacks table (User feedback)
CREATE TABLE IF NOT EXISTS feedbacks (
  id SERIAL PRIMARY KEY,
  message TEXT NOT NULL,
  email VARCHAR(255),
  user_address VARCHAR(42),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_email ON feedbacks(email);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks(created_at DESC);

