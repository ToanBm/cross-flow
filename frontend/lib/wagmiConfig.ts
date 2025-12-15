import { createConfig, http } from 'wagmi';
import { tempo } from 'tempo.ts/chains';
import { KeyManager, webAuthn } from 'tempo.ts/wagmi';
import { withFeePayer } from 'tempo.ts/viem';

// Production-safe: store credential public keys on the backend (KeyManager.http).
// This enables multi-device sign-in and avoids localStorage fragility.
const httpKeyManager = KeyManager.http('/api/key-manager');

// Tempo chain cấu hình theo docs Tempo (feeToken = stablecoin)
export const tempoChain = tempo({
  feeToken: '0x20c0000000000000000000000000000000000001',
});

// RPC Tempo thật (cần cho các call read như balanceOf, etc)
const tempoRpcUrl = process.env.NEXT_PUBLIC_TEMPO_RPC_URL || '';

// Fee-payer server URL (backend sponsor gas)
const feePayerUrl =
  process.env.NEXT_PUBLIC_TEMPO_FEE_PAYER_URL || 'http://localhost:3100';

export const wagmiConfig = createConfig({
  chains: [tempoChain],
  connectors: [
    webAuthn({
      keyManager: httpKeyManager,
      // Set rpId via env var, or use 'localhost' for development
      // For production, set NEXT_PUBLIC_WEBAUTHN_RP_ID to your domain (e.g., toanbm.xyz)
      rpId: process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID || 'localhost',
    }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    // Dùng withFeePayer wrapper: RPC Tempo thật + fee-payer server để sponsor gas
    [tempoChain.id]: withFeePayer(
      http(tempoRpcUrl), // RPC Tempo thật
      http(feePayerUrl), // Fee-payer server backend
    ),
  },
});


