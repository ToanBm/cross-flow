import { createServer } from 'http';
import { createClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempo } from 'tempo.ts/chains';
import { Handler } from 'tempo.ts/server';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config();

const feeToken = '0x20c0000000000000000000000000000000000001';

const client = createClient({
  chain: tempo({ feeToken }),
  transport: http(),
});

// Dùng ví riêng để sponsor gas, tách biệt với ví OFFRAMP chính
const pk = process.env.TEMPO_FEE_PAYER_PRIVATE_KEY as `0x${string}` | undefined;

if (!pk) {
  throw new Error(
    'TEMPO_FEE_PAYER_PRIVATE_KEY is not configured in backend .env – required for Tempo fee payer',
  );
}

const handler = Handler.feePayer({
  account: privateKeyToAccount(pk),
  client,
});

const port = Number(process.env.TEMPO_FEE_PAYER_PORT || 3100);

// Bọc listener gốc để thêm CORS cho các request từ frontend (browser)
const listener = handler.listener;

// Log fee payer account address on startup
const feePayerAccount = privateKeyToAccount(pk);
console.log(`[Tempo Fee Payer] Fee payer address: ${feePayerAccount.address}`);

const server = createServer((req, res) => {
  // Log incoming requests
  console.log(`[Fee Payer] ${req.method} ${req.url} from ${req.headers.origin || 'unknown'}`);

  // Cho phép frontend (Next.js) gọi trực tiếp fee payer server
  res.setHeader(
    'Access-Control-Allow-Origin',
    process.env.CORS_ALLOW_ORIGIN || '*',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    console.log('[Fee Payer] CORS preflight OK');
    res.writeHead(204);
    res.end();
    return;
  }

  // Wrap listener to log response
  const originalEnd = res.end.bind(res);
  res.end = function (...args: any[]) {
    console.log(`[Fee Payer] Response status: ${res.statusCode}`);
    return originalEnd(...args);
  };

  listener(req, res);
});

server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[Tempo Fee Payer] Listening on http://localhost:${port} with feeToken ${feeToken}`,
  );
});


