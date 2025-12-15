import db from '../config/database';
import { ethers } from 'ethers';
import { provider } from '../config/blockchain';

const isSQLite = !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

const DEFAULT_TOKEN_ADDRESSES: `0x${string}`[] = [
  '0x20c0000000000000000000000000000000000001',
  '0x20c0000000000000000000000000000000000002',
  '0x20c0000000000000000000000000000000000003',
];

function getTokenAddresses(): `0x${string}`[] {
  const raw = process.env.TEMPO_TOKEN_ADDRESSES?.trim();
  if (!raw) return DEFAULT_TOKEN_ADDRESSES;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s as `0x${string}`);
}

function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}

type TransferRow = {
  id: number;
  token_address: string;
  from_address: string;
  to_address: string;
  amount_raw: string;
  decimals: number;
  memo?: string | null;
  tx_hash: string;
  log_index: number;
  block_number: number;
  block_timestamp?: number | null;
  event_name: string;
  created_at?: any;
};

export type ActivityItem =
  | {
      kind: 'transfer';
      direction: 'send' | 'receive';
      tokenAddress: string;
      amountRaw: string;
      decimals: number;
      counterparty: string;
      txHash: string;
      blockNumber: number;
      timestamp?: number | null;
      memo?: string | null;
      eventName: string;
    }
  | {
      kind: 'payment';
      direction: 'deposit';
      amountFiat: number;
      currency: string;
      amountUsdt: number;
      txHash?: string | null;
      timestamp?: number | null;
      status: string;
      paymentIntentId: string;
    }
  | {
      kind: 'cashout';
      direction: 'withdraw';
      amountUsdt: number;
      fiatAmount?: number | null;
      currency: string;
      txHash: string;
      timestamp?: number | null;
      status: string;
      stripeBankAccountId?: string | null;
    };

const transferAbi = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event TransferWithMemo(address indexed from, address indexed to, uint256 value, bytes32 memo)',
  'function decimals() view returns (uint8)',
] as const;

const iface = new ethers.Interface(transferAbi as any);

function topicAddress(addr: string) {
  return ethers.zeroPadValue(addr, 32).toLowerCase();
}

function isRetryableRpcError(error: any): boolean {
  const msg = (error?.message || '').toString();
  const code = (error?.code || '').toString();
  const info = JSON.stringify(error?.info || {});
  return (
    msg.includes('502') ||
    msg.includes('Bad Gateway') ||
    msg.includes('503') ||
    msg.includes('Service Unavailable') ||
    msg.includes('timeout') ||
    code === 'SERVER_ERROR' ||
    info.includes('502') ||
    info.includes('Bad Gateway')
  );
}

async function withRpcRetry<T>(
  fn: () => Promise<T>,
  opts: { retries?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const retries = opts.retries ?? Number(process.env.ACTIVITY_RPC_RETRIES || 5);
  const baseDelayMs = opts.baseDelayMs ?? Number(process.env.ACTIVITY_RPC_RETRY_DELAY_MS || 750);
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (!isRetryableRpcError(err) || attempt === retries) {
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt); // exponential backoff
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function getDecimals(token: string): Promise<number> {
  try {
    const c = new ethers.Contract(token, transferAbi as any, provider);
    const d = await c.decimals();
    return Number(d);
  } catch {
    return 6;
  }
}

async function getLastSyncedBlock(userAddress: string, tokenAddress: string): Promise<number> {
  const user = normalizeAddress(userAddress);
  const token = normalizeAddress(tokenAddress);
  if (isSQLite) {
    const row = (db as any)
      .prepare(
        `SELECT last_synced_block FROM transfer_sync_state
         WHERE user_address = ? AND token_address = ?`,
      )
      .get(user, token) as { last_synced_block: number } | undefined;
    return row?.last_synced_block ?? 0;
  }
  const result = await (db as any).query(
    `SELECT last_synced_block FROM transfer_sync_state
     WHERE user_address = $1 AND token_address = $2`,
    [user, token],
  );
  return result.rows?.[0]?.last_synced_block ? Number(result.rows[0].last_synced_block) : 0;
}

async function setLastSyncedBlock(userAddress: string, tokenAddress: string, block: number) {
  const user = normalizeAddress(userAddress);
  const token = normalizeAddress(tokenAddress);
  const nowIso = new Date().toISOString();
  if (isSQLite) {
    (db as any)
      .prepare(
        `INSERT INTO transfer_sync_state (user_address, token_address, last_synced_block, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(user_address, token_address) DO UPDATE SET
           last_synced_block = excluded.last_synced_block,
           updated_at = excluded.updated_at`,
      )
      .run(user, token, block, nowIso);
    return;
  }
  await (db as any).query(
    `INSERT INTO transfer_sync_state (user_address, token_address, last_synced_block, updated_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (user_address, token_address) DO UPDATE SET
       last_synced_block = EXCLUDED.last_synced_block,
       updated_at = NOW()`,
    [user, token, block],
  );
}

async function upsertTransfers(rows: Array<Omit<TransferRow, 'id'>>) {
  if (rows.length === 0) return;

  if (isSQLite) {
    const stmt = (db as any).prepare(
      `INSERT OR IGNORE INTO transfers (
        token_address, from_address, to_address, amount_raw, decimals, memo,
        tx_hash, log_index, block_number, block_timestamp, event_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    const trx = (db as any).transaction((items: typeof rows) => {
      for (const r of items) {
        stmt.run(
          normalizeAddress(r.token_address),
          normalizeAddress(r.from_address),
          normalizeAddress(r.to_address),
          r.amount_raw,
          r.decimals,
          r.memo ?? null,
          r.tx_hash.toLowerCase(),
          r.log_index,
          r.block_number,
          r.block_timestamp ?? null,
          r.event_name,
        );
      }
    });
    trx(rows);
    return;
  }

  // PostgreSQL: insert with conflict ignore (or update memo/timestamp)
  const values: any[] = [];
  const placeholders: string[] = [];
  let i = 1;
  for (const r of rows) {
    placeholders.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`,
    );
    values.push(
      normalizeAddress(r.token_address),
      normalizeAddress(r.from_address),
      normalizeAddress(r.to_address),
      r.amount_raw,
      r.decimals,
      r.memo ?? null,
      r.tx_hash.toLowerCase(),
      r.log_index,
      r.block_number,
      r.block_timestamp ?? null,
      r.event_name,
    );
  }

  await (db as any).query(
    `INSERT INTO transfers (
      token_address, from_address, to_address, amount_raw, decimals, memo,
      tx_hash, log_index, block_number, block_timestamp, event_name
    ) VALUES ${placeholders.join(',')}
    ON CONFLICT (tx_hash, log_index) DO UPDATE SET
      memo = COALESCE(EXCLUDED.memo, transfers.memo),
      block_timestamp = COALESCE(EXCLUDED.block_timestamp, transfers.block_timestamp)`,
    values,
  );
}

export async function syncTransfersForUser(userAddress: string): Promise<{ syncedToBlock: number }> {
  const user = normalizeAddress(userAddress);
  if (!ethers.isAddress(user)) {
    throw new Error('Invalid address');
  }

  const latest = await withRpcRetry(() => provider.getBlockNumber());
  const tokens = getTokenAddresses();

  // Optional initial lookback to avoid scanning huge history on first run.
  // NOTE: Some RPC providers limit eth_getLogs to a maximum block range (e.g. 100000).
  // We support both:
  // - initialLookback > 0: only sync recent blocks on first run
  // - initialLookback = 0: full history (will be chunked)
  const initialLookback = Number(process.env.ACTIVITY_INITIAL_LOOKBACK_BLOCKS || 0); // 0 = full from genesis
  const maxBlockRange = Number(process.env.ACTIVITY_MAX_BLOCK_RANGE || 100000);

  for (const token of tokens) {
    const tokenAddr = normalizeAddress(token);
    const decimals = await getDecimals(tokenAddr);

    let fromBlock = await getLastSyncedBlock(user, tokenAddr);
    if (fromBlock === 0 && initialLookback > 0) {
      fromBlock = Math.max(latest - initialLookback, 0);
    }
    const start = fromBlock + 1;
    const end = latest;
    if (start > end) {
      continue;
    }

    const transferEvent = iface.getEvent('Transfer');
    const transferWithMemoEvent = iface.getEvent('TransferWithMemo');
    if (!transferEvent || !transferWithMemoEvent) {
      throw new Error('Transfer events not found in ABI');
    }
    const transferTopic = transferEvent.topicHash;
    const transferWithMemoTopic = transferWithMemoEvent.topicHash;
    const userTopic = topicAddress(user);

    // Query both directions for both events (targeted topics => fewer logs)
    const queries = [
      { topic0: transferTopic, topics: [transferTopic, null, userTopic] as string[] | null[] }, // to=user
      { topic0: transferTopic, topics: [transferTopic, userTopic, null] as string[] | null[] }, // from=user
      { topic0: transferWithMemoTopic, topics: [transferWithMemoTopic, null, userTopic] as string[] | null[] },
      { topic0: transferWithMemoTopic, topics: [transferWithMemoTopic, userTopic, null] as string[] | null[] },
    ];

    // Chunk scan to respect provider max block range limits (commonly 100000 blocks).
    for (let chunkFrom = start; chunkFrom <= end; chunkFrom += maxBlockRange) {
      const chunkTo = Math.min(end, chunkFrom + maxBlockRange - 1);

      // NOTE: Avoid blasting the public RPC. Fetch logs sequentially with retries.
      const logs: ethers.Log[] = [];
      for (const q of queries) {
        const part = await withRpcRetry(() =>
          provider.getLogs({
            address: tokenAddr,
            fromBlock: chunkFrom,
            toBlock: chunkTo,
            topics: q.topics as any,
          }),
        );
        logs.push(...part);
      }

      if (logs.length === 0) {
        continue;
      }

      // Fetch timestamps for involved blocks (within this chunk)
      const blockTs = new Map<number, number>();
      for (const bn of new Set(logs.map((l) => Number((l as any).blockNumber)))) {
        const b = await withRpcRetry(() => provider.getBlock(bn));
        if (b) {
          blockTs.set(bn, Number((b as any).timestamp));
        }
      }

      const rows: Array<Omit<TransferRow, 'id'>> = [];
      for (const log of logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (!parsed) continue;
          const from = (parsed.args as any).from as string;
          const to = (parsed.args as any).to as string;
          const value = (parsed.args as any).value as bigint;
          const memo = (parsed.args as any).memo as string | undefined;

          const logIndex = Number((log as any).index ?? (log as any).logIndex ?? 0);
          const blockNumber = Number((log as any).blockNumber);
          const txHash = String((log as any).transactionHash);

          rows.push({
            token_address: tokenAddr,
            from_address: from,
            to_address: to,
            amount_raw: value.toString(),
            decimals,
            memo: memo ? String(memo) : null,
            tx_hash: txHash,
            log_index: logIndex,
            block_number: blockNumber,
            block_timestamp: blockTs.get(blockNumber) ?? null,
            event_name: parsed.name,
          });
        } catch {
          // ignore decode failures
        }
      }

      await upsertTransfers(rows);
    }

    // Mark token sync complete up to latest block
    await setLastSyncedBlock(user, tokenAddr, end);
  }

  return { syncedToBlock: latest };
}

async function getTransfersForAddress(address: string, limit: number): Promise<TransferRow[]> {
  const a = normalizeAddress(address);
  if (isSQLite) {
    return (db as any)
      .prepare(
        `SELECT * FROM transfers
         WHERE from_address = ? OR to_address = ?
         ORDER BY block_number DESC, log_index DESC
         LIMIT ?`,
      )
      .all(a, a, limit) as TransferRow[];
  }
  const result = await (db as any).query(
    `SELECT * FROM transfers
     WHERE from_address = $1 OR to_address = $1
     ORDER BY block_number DESC, log_index DESC
     LIMIT $2`,
    [a, limit],
  );
  return result.rows as TransferRow[];
}

async function getPaymentsForAddress(address: string, limit: number) {
  const a = normalizeAddress(address);
  if (isSQLite) {
    return (db as any)
      .prepare(
        `SELECT payment_intent_id, amount_fiat, fiat_currency, amount_usdt, tx_hash, status, created_at
         FROM payments
         WHERE wallet_address = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(a, limit);
  }
  const result = await (db as any).query(
    `SELECT payment_intent_id, amount_fiat, fiat_currency, amount_usdt, tx_hash, status, created_at
     FROM payments
     WHERE wallet_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [a, limit],
  );
  return result.rows;
}

async function getCashoutsForAddress(address: string, limit: number) {
  const a = normalizeAddress(address);
  if (isSQLite) {
    return (db as any)
      .prepare(
        `SELECT amount_usdt, fiat_amount, fiat_currency, tx_hash_onchain, status, stripe_bank_account_id, created_at
         FROM cashouts
         WHERE employee_address = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .all(a, limit);
  }
  const result = await (db as any).query(
    `SELECT amount_usdt, fiat_amount, fiat_currency, tx_hash_onchain, status, stripe_bank_account_id, created_at
     FROM cashouts
     WHERE employee_address = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [a, limit],
  );
  return result.rows;
}

export async function getActivityForAddress(params: {
  address: string;
  limit?: number;
  sync?: boolean;
}): Promise<{ syncedToBlock?: number; items: ActivityItem[] }> {
  const address = normalizeAddress(params.address);
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);

  let syncedToBlock: number | undefined;
  if (params.sync !== false) {
    try {
      const r = await syncTransfersForUser(address);
      syncedToBlock = r.syncedToBlock;
    } catch (e) {
      // If RPC is down, still return whatever is already in DB (degraded mode).
      // Caller can retry later or pass sync=false.
      console.warn('[ActivityService] Sync failed; returning cached DB activity. Consider setting TEMPO_RPC_URLS for fallback RPC.', e);
    }
  }

  const [transfers, payments, cashouts] = await Promise.all([
    getTransfersForAddress(address, limit),
    getPaymentsForAddress(address, limit),
    getCashoutsForAddress(address, limit),
  ]);

  const transferItems: ActivityItem[] = transfers.map((t) => {
    const direction = normalizeAddress(t.to_address) === address ? 'receive' : 'send';
    const counterparty =
      direction === 'receive' ? normalizeAddress(t.from_address) : normalizeAddress(t.to_address);

    return {
      kind: 'transfer',
      direction,
      tokenAddress: normalizeAddress(t.token_address),
      amountRaw: t.amount_raw,
      decimals: Number(t.decimals ?? 6),
      counterparty,
      txHash: t.tx_hash,
      blockNumber: Number(t.block_number),
      timestamp: t.block_timestamp ?? null,
      memo: t.memo ?? null,
      eventName: t.event_name,
    };
  });

  const paymentItems: ActivityItem[] = (payments || []).map((p: any) => ({
    kind: 'payment',
    direction: 'deposit',
    amountFiat: Number(p.amount_fiat ?? 0),
    currency: String(p.fiat_currency ?? '').toUpperCase(),
    amountUsdt: Number(p.amount_usdt ?? 0),
    txHash: p.tx_hash ?? null,
    timestamp: p.created_at ? Math.floor(new Date(p.created_at).getTime() / 1000) : null,
    status: String(p.status ?? ''),
    paymentIntentId: String(p.payment_intent_id ?? ''),
  }));

  const cashoutItems: ActivityItem[] = (cashouts || []).map((c: any) => ({
    kind: 'cashout',
    direction: 'withdraw',
    amountUsdt: Number(c.amount_usdt ?? 0),
    fiatAmount: c.fiat_amount ?? null,
    currency: String(c.fiat_currency ?? '').toUpperCase(),
    txHash: String(c.tx_hash_onchain ?? ''),
    timestamp: c.created_at ? Math.floor(new Date(c.created_at).getTime() / 1000) : null,
    status: String(c.status ?? ''),
    stripeBankAccountId: c.stripe_bank_account_id ?? null,
  }));

  const items = [...transferItems, ...paymentItems, ...cashoutItems].sort((a, b) => {
    const ta = (a as any).timestamp ?? 0;
    const tb = (b as any).timestamp ?? 0;
    if (ta !== tb) return tb - ta;
    // fallback for transfers without timestamp
    const ba = (a as any).blockNumber ?? 0;
    const bb = (b as any).blockNumber ?? 0;
    return bb - ba;
  });

  return { syncedToBlock, items: items.slice(0, limit) };
}


