import { createPublicClient, formatUnits, http } from 'viem';
import { tempoChain } from './wagmiConfig';

export const USDC_ADDRESS =
  (process.env.NEXT_PUBLIC_TEMPO_USDC_ADDRESS as `0x${string}` | undefined) ??
  undefined;

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'decimals', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: 'success', type: 'bool' }],
  },
] as const;

export const tempoPublicClient = createPublicClient({
  chain: tempoChain,
  transport: http(),
});

export async function fetchUsdcBalance(address: string): Promise<number> {
  if (!USDC_ADDRESS) {
    // Chưa cấu hình contract USDC trên Tempo → tạm coi như 0
    return 0;
  }

  const [rawBalance, decimals] = await Promise.all([
    tempoPublicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [address as `0x${string}`],
    }),
    tempoPublicClient.readContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: 'decimals',
    }),
  ]);

  const balanceStr = formatUnits(rawBalance as bigint, decimals as number);
  const parsed = Number.parseFloat(balanceStr);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function fetchTokenBalance(
  tokenAddress: `0x${string}`,
  userAddress: string,
): Promise<number> {
  try {
    const [rawBalance, decimals] = await Promise.all([
      tempoPublicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
      }),
      tempoPublicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
      }),
    ]);

    const balanceStr = formatUnits(rawBalance as bigint, decimals as number);
    const parsed = Number.parseFloat(balanceStr);
    return Number.isNaN(parsed) ? 0 : parsed;
  } catch (error) {
    console.error(`[fetchTokenBalance] Error for ${tokenAddress}:`, error);
    return 0;
  }
}

export const TOKEN_ADDRESSES = {
  AlphaUSD: '0x20c0000000000000000000000000000000000001' as `0x${string}`,
  BetaUSD: '0x20c0000000000000000000000000000000000002' as `0x${string}`,
  ThetaUSD: '0x20c0000000000000000000000000000000000003' as `0x${string}`,
} as const;


