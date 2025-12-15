import { ethers } from 'ethers';
import dotenv from 'dotenv';
import path from 'path';

// Load .env to ensure environment variables are available
// Try to load from project root (where .env usually is)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Also try default location as fallback
dotenv.config();

// Tempo Testnet RPC
export const rpcUrl = process.env.TEMPO_RPC_URL || '';
export const rpcUrls = (process.env.TEMPO_RPC_URLS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

if (!rpcUrl && rpcUrls.length === 0) {
  throw new Error('TEMPO_RPC_URL (or TEMPO_RPC_URLS) is not configured in backend .env');
}

// Provider (supports fallback if TEMPO_RPC_URLS is provided)
export const provider = (() => {
  const urls = rpcUrls.length > 0 ? rpcUrls : [rpcUrl];
  const providers = urls.map((u, idx) => ({
    provider: new ethers.JsonRpcProvider(u),
    priority: idx + 1,
    weight: 1,
  }));
  // If only 1 URL, just return the provider for less overhead
  if (providers.length === 1) return providers[0].provider;
  return new ethers.FallbackProvider(providers as any);
})();

// USDC Contract Address trên Tempo
export const usdtContractAddress =
  process.env.TEMPO_USDC_CONTRACT_ADDRESS ||
  '0x20c0000000000000000000000000000000000001';

// Wallets
export const offrampWallet = process.env.OFFRAMP_PRIVATE_KEY
  ? new ethers.Wallet(process.env.OFFRAMP_PRIVATE_KEY, provider)
  : null;

// Stablecoin Contract ABI (ERC20 standard)
export const usdtAbi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const getUSDTContract = () => {
  if (!usdtContractAddress) {
    throw new Error('TEMPO_USDC_CONTRACT_ADDRESS not configured');
  }
  return new ethers.Contract(usdtContractAddress, usdtAbi, provider);
};

