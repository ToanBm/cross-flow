import { createConfig, http } from 'wagmi';
import { tempo } from 'tempo.ts/chains';
import { KeyManager, webAuthn } from 'tempo.ts/wagmi';
// import { withFeePayer } from 'tempo.ts/viem'; // Tắt sponsor gas

// Production-safe: store credential public keys on the backend (KeyManager.http).
// This enables multi-device sign-in and avoids localStorage fragility.
const httpKeyManager = KeyManager.http('/api/key-manager');

// Tempo chain cấu hình theo docs Tempo (feeToken = stablecoin)
export const tempoChain = tempo({
  feeToken: '0x20c0000000000000000000000000000000000001',
});

// RPC Tempo thật (cần cho các call read như balanceOf, etc)
const tempoRpcUrl = process.env.NEXT_PUBLIC_TEMPO_RPC_URL || '';

// Fee-payer server URL (backend sponsor gas) - Tắt sponsor gas
// const feePayerUrl =
//   process.env.NEXT_PUBLIC_TEMPO_FEE_PAYER_URL || 'http://localhost:3100';

// Helper to get rpId - must match current domain
const getRpId = () => {
  // Use env var if set
  if (process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID) {
    return process.env.NEXT_PUBLIC_WEBAUTHN_RP_ID;
  }
  // For client-side, return undefined to let SDK auto-detect
  // For server-side build, return undefined
  return undefined;
};

export const wagmiConfig = createConfig({
  chains: [tempoChain],
  connectors: [
    webAuthn({
      keyManager: httpKeyManager,
      ...(getRpId() ? { rpId: getRpId() } : {}),
    }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    // Tắt sponsor gas - user tự trả phí
    [tempoChain.id]: http(tempoRpcUrl),
  },
});


