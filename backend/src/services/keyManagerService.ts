import crypto from 'crypto';
import db from '../config/database';

const isSQLite =
  !process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith('sqlite://');

function toHex(bytes: Uint8Array) {
  return `0x${Buffer.from(bytes).toString('hex')}`;
}

function normalizeBase64Url(input: string) {
  // Convert base64url -> base64 and pad
  let s = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return s;
}

function base64ToBytes(input: string) {
  const normalized = normalizeBase64Url(input);
  return new Uint8Array(Buffer.from(normalized, 'base64'));
}

function base64ToString(input: string) {
  return Buffer.from(normalizeBase64Url(input), 'base64').toString('utf8');
}

function getRpFromEnvOrHost(hostname: string | undefined) {
  // Hardcode to production domain to ensure consistency
  // If env var is set, use it; otherwise use hardcoded production domain
  const rpIdRaw = (process.env.WEBAUTHN_RP_ID || 'acrosspay.xyz').trim();
  const rpId = rpIdRaw.replace(/:\d+$/, '').replace(/^https?:\/\//, ''); // strip port and protocol
  if (!rpId) return undefined;
  return {
    id: rpId,
    name: (process.env.WEBAUTHN_RP_NAME || rpId).trim() || rpId,
  };
}

export async function createChallenge(params: { hostname?: string }) {
  const rp = getRpFromEnvOrHost(params.hostname);
  const challenge = `0x${crypto.randomBytes(32).toString('hex')}`;

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min
  const expiresIso = expiresAt.toISOString();

  if (isSQLite) {
    // cleanup expired challenges opportunistically
    (db as any)
      .prepare(`DELETE FROM webauthn_challenges WHERE expires_at < ?`)
      .run(new Date().toISOString());
    (db as any)
      .prepare(
        `INSERT INTO webauthn_challenges (challenge, expires_at) VALUES (?, ?)`,
      )
      .run(challenge, expiresIso);
  } else {
    await (db as any).query(
      `DELETE FROM webauthn_challenges WHERE expires_at < NOW()`,
    );
    await (db as any).query(
      `INSERT INTO webauthn_challenges (challenge, expires_at) VALUES ($1, $2)`,
      [challenge, expiresIso],
    );
  }

  return { challenge, rp };
}

export async function getPublicKey(credentialId: string) {
  const id = credentialId;
  if (isSQLite) {
    const row = (db as any)
      .prepare(
        `SELECT public_key FROM webauthn_credentials WHERE credential_id = ?`,
      )
      .get(id) as { public_key: string } | undefined;
    return row?.public_key || null;
  }

  const result = await (db as any).query(
    `SELECT public_key FROM webauthn_credentials WHERE credential_id = $1`,
    [id],
  );
  return (result.rows?.[0]?.public_key as string | undefined) || null;
}

export type SetPublicKeyResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

export async function verifyAndStorePublicKey(params: {
  credentialId: string;
  credential: any;
  publicKey: string;
  hostname?: string;
}) : Promise<SetPublicKeyResult> {
  const { credentialId, credential, publicKey } = params;
  if (!credential) return { ok: false, status: 400, error: 'Missing `credential`' };
  if (!publicKey) return { ok: false, status: 400, error: 'Missing `publicKey`' };

  const rp = getRpFromEnvOrHost(params.hostname);

  // Decode and verify clientDataJSON
  let clientDataJSON: any;
  try {
    clientDataJSON = JSON.parse(
      base64ToString(credential.response?.clientDataJSON as string),
    );
  } catch {
    return { ok: false, status: 400, error: 'Invalid `clientDataJSON`' };
  }

  // Verify challenge
  const challengeHex = toHex(base64ToBytes(clientDataJSON.challenge as string));

  const nowIso = new Date().toISOString();
  const challengeExists = await (async () => {
    if (isSQLite) {
      const row = (db as any)
        .prepare(
          `SELECT challenge FROM webauthn_challenges WHERE challenge = ? AND expires_at >= ?`,
        )
        .get(challengeHex, nowIso) as { challenge: string } | undefined;
      return !!row;
    }
    const r = await (db as any).query(
      `SELECT challenge FROM webauthn_challenges WHERE challenge = $1 AND expires_at >= NOW()`,
      [challengeHex],
    );
    return (r.rows?.length || 0) > 0;
  })();

  if (!challengeExists) {
    return { ok: false, status: 400, error: 'Invalid or expired `challenge`' };
  }

  // Verify type
  if (clientDataJSON.type !== 'webauthn.create') {
    return { ok: false, status: 400, error: 'Invalid `clientDataJSON.type`' };
  }

  // Verify origin (skip for localhost rpId)
  if (rp?.id && !rp.id.includes('localhost')) {
    const expectedOrigin = new URL(`https://${rp.id}`).origin;
    if (clientDataJSON.origin !== expectedOrigin) {
      return { ok: false, status: 400, error: 'Invalid `clientDataJSON.origin`' };
    }
  }

  // Parse authenticatorData + verify User Present (UP) flag (bit 0) at byte 32
  const authenticatorDataBytes = (() => {
    try {
      return base64ToBytes(credential.response?.authenticatorData as string);
    } catch {
      return null;
    }
  })();

  if (!authenticatorDataBytes || authenticatorDataBytes.length < 33) {
    return { ok: false, status: 400, error: 'Invalid `authenticatorData`' };
  }
  const flags = authenticatorDataBytes[32];
  const userPresent = (flags & 0x01) !== 0;
  if (!userPresent) return { ok: false, status: 400, error: 'User not present' };

  // Consume challenge (one-time)
  if (isSQLite) {
    (db as any)
      .prepare(`DELETE FROM webauthn_challenges WHERE challenge = ?`)
      .run(challengeHex);
  } else {
    await (db as any).query(
      `DELETE FROM webauthn_challenges WHERE challenge = $1`,
      [challengeHex],
    );
  }

  // Store credential public key
  if (isSQLite) {
    const now = new Date().toISOString();
    (db as any)
      .prepare(
        `INSERT INTO webauthn_credentials (credential_id, public_key, created_at, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(credential_id) DO UPDATE SET public_key = excluded.public_key, updated_at = excluded.updated_at`,
      )
      .run(credentialId, publicKey, now, now);
  } else {
    await (db as any).query(
      `INSERT INTO webauthn_credentials (credential_id, public_key)
       VALUES ($1, $2)
       ON CONFLICT (credential_id) DO UPDATE SET public_key = EXCLUDED.public_key, updated_at = NOW()`,
      [credentialId, publicKey],
    );
  }

  return { ok: true };
}


