import { createConfig, http } from 'wagmi';
import { tempo } from 'tempo.ts/chains';
import { KeyManager, webAuthn } from 'tempo.ts/wagmi';
// import { withFeePayer } from 'tempo.ts/viem'; // Temporarily disabled

// Production-safe: store credential public keys on the backend (KeyManager.http).
// This enables multi-device sign-in and avoids localStorage fragility.
const httpKeyManager = KeyManager.http('/api/key-manager');

// Tempo chain cấu hình theo docs Tempo (feeToken = stablecoin)
export const tempoChain = tempo({
  feeToken: '0x20c0000000000000000000000000000000000001',
});

// RPC Tempo thật (cần cho các call read như balanceOf, etc)
const tempoRpcUrl =
  process.env.NEXT_PUBLIC_TEMPO_RPC_URL || 'https://rpc.testnet.tempo.xyz';

// Fee-payer server URL (backend sponsor gas)
// const feePayerUrl =
//   process.env.NEXT_PUBLIC_TEMPO_FEE_PAYER_URL ||
//   'https://sponsor.testnet.tempo.xyz';

export const wagmiConfig = createConfig({
  chains: [tempoChain],
  connectors: [
    webAuthn({
      keyManager: httpKeyManager,
      // Match config from tempo-passkey-sdk/src/core/connector.ts
      authenticatorSelection: {
        residentKey: 'required',
        requireResidentKey: true,
        userVerification: 'required',
      },
      // Don't set rpId - let SDK auto-detect from window.location.hostname
    } as any),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    // Disabled sponsor gas service - user pays fees
    [tempoChain.id]: http(tempoRpcUrl),
  },
});


