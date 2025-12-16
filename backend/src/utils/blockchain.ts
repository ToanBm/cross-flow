import { ethers } from 'ethers';
import {
  provider,
  getUSDTContract,
  offrampWallet,
  usdtContractAddress,
  usdtAbi,
} from '../config/blockchain';

/**
 * Get USDT balance of an address
 */
export async function getUSDTBalance(address: string): Promise<string> {
  try {
    const contract = getUSDTContract();
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    throw new Error(`Failed to get USDT balance: ${error}`);
  }
}

/**
 * Get token balance of an address by token address
 */
export async function getTokenBalance(address: string, tokenAddress: string): Promise<string> {
  try {
    const contract = new ethers.Contract(tokenAddress, usdtAbi, provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(balance, decimals);
  } catch (error) {
    throw new Error(`Failed to get token balance: ${error}`);
  }
}

/**
 * Transfer USDT from employee to offramp wallet
 * Employee must sign this transaction from frontend
 * 
 * Note: Với Tempo AA (Account Abstraction), tx được gửi từ smart account address,
 * không phải từ Passkey address trực tiếp. Hàm này trả về `from` là smart account address.
 */
export async function verifyTransferTransaction(
  txHash: string
): Promise<{
  from: string; // Smart account address (với Tempo AA)
  to: string;
  amount: string;
  success: boolean;
  txFrom?: string; // Transaction sender (có thể khác với Transfer event `from`)
}> {
  try {
    // Dùng raw RPC call để tránh ethers parse sai Tempo AA receipt (type 0x76)
    const rawReceipt = await (provider as any).send('eth_getTransactionReceipt', [txHash]);

    if (!rawReceipt) {
      throw new Error('Transaction not found');
    }

    // Parse status (0x1 = success, 0x0 = failed)
    const status = parseInt(rawReceipt.status, 16);
    if (status !== 1) {
      throw new Error('Transaction failed');
    }

    // Lấy `from` từ receipt (smart account address với Tempo AA)
    const txFrom = rawReceipt.from?.toLowerCase();

    // Get transfer event from receipt logs
    const contract = getUSDTContract();
    const logs = rawReceipt.logs || [];

    // Tempo + account abstraction có thể tạo nhiều logs, log[0] không chắc là Transfer của USDC.
    // Ta duyệt tất cả receipt.logs, tìm log có address = usdtContractAddress và parse được event "Transfer".
    let transferEvent: any = null;

    for (const log of logs) {
      const logAddress = (log.address || log[0] || '').toLowerCase();
      
      if (logAddress !== usdtContractAddress.toLowerCase()) {
        continue;
      }

      try {
        // Parse log topics và data
        const topics = log.topics || log.slice(0, -1) || [];
        const data = log.data || log[log.length - 1] || '0x';

        const parsed = contract.interface.parseLog({
          topics: topics as string[],
          data: data as string,
        });

        if (parsed?.name === 'Transfer') {
          transferEvent = parsed;
          break;
        }
      } catch {
        // Không phải event của USDC hoặc không decode được → bỏ qua
        continue;
      }
    }

    if (!transferEvent) {
      throw new Error('USDC Transfer event not found in transaction logs');
    }

    const from = transferEvent.args[0] as string;
    const to = transferEvent.args[1] as string;
    const amount = transferEvent.args[2] as bigint;

    const decimals = await contract.decimals();
    const amountFormatted = ethers.formatUnits(amount, decimals);

    return {
      from, // Transfer event `from` (smart account address)
      to,
      amount: amountFormatted,
      success: true,
      txFrom, // Transaction `from` từ receipt (smart account address)
    };
  } catch (error: any) {
    // Provide more detailed error message
    const errorMessage = error?.message || String(error);
    console.error('[Blockchain] Verify transaction error:', errorMessage);
    console.error('[Blockchain] TX Hash:', txHash);
    
    // Check for specific RPC errors
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      throw new Error('RPC endpoint returned 403 Forbidden. Please check RPC configuration.');
    }
    
    if (errorMessage.includes('could not decode')) {
      throw new Error('Could not decode transaction data. Transaction may not exist or contract address is incorrect.');
    }
    
    throw new Error(`Failed to verify transaction: ${errorMessage}`);
  }
}

/**
 * Wait for transaction confirmation
 * Note: Stable has instant finality, but we still wait for receipt
 */
export async function waitForTransaction(
  txHash: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    const receipt = await provider.waitForTransaction(txHash);
    return receipt;
  } catch (error) {
    throw new Error(`Failed to wait for transaction: ${error}`);
  }
}

/**
 * Get transaction receipt
 */
export async function getTransactionReceipt(
  txHash: string
): Promise<ethers.TransactionReceipt | null> {
  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    return receipt;
  } catch (error) {
    throw new Error(`Failed to get transaction receipt: ${error}`);
  }
}

/**
 * Check if address is valid
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address);
}

/**
 * Get offramp wallet address
 */
export function getOfframpAddress(): string {
  if (!offrampWallet) {
    throw new Error('Offramp wallet not configured');
  }
  return offrampWallet.address;
}

/**
 * Transfer token from offramp wallet to user wallet (for on-ramp)
 * This is called when payment_intent.succeeded webhook is received
 */
export async function transferTokenFromOfframp(
  to: string,
  amount: string,
  tokenAddress: string,
  maxRetries: number = 3
): Promise<ethers.ContractTransactionResponse> {
  if (!offrampWallet) {
    throw new Error('Offramp wallet not configured');
  }

  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get token contract by address
      const contract = new ethers.Contract(tokenAddress, usdtAbi, provider);
      const contractWithSigner = contract.connect(offrampWallet);
      const decimals = await contract.decimals();
      const amountWei = ethers.parseUnits(amount, decimals);

      // Check offramp wallet balance before transferring
      const balance = await contract.balanceOf(offrampWallet.address);
      if (balance < amountWei) {
        throw new Error(
          `Insufficient balance in offramp wallet. Required: ${ethers.formatUnits(amountWei, decimals)}, Available: ${ethers.formatUnits(balance, decimals)}`
        );
      }

      const tx = await (contractWithSigner as any).transfer(to, amountWei);
      return tx;
    } catch (error: any) {
      lastError = error;
      
      // Retry on network/RPC errors (502, 503, timeout, etc.)
      const isRetryableError = 
        error.message?.includes('502') ||
        error.message?.includes('503') ||
        error.message?.includes('Bad Gateway') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('timeout') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT') ||
        error.code === 'SERVER_ERROR' ||
        error.code === 'TIMEOUT';
      
      if (isRetryableError && attempt < maxRetries) {
        const waitTime = attempt * 2; // 2s, 4s, 6s
        console.warn(`RPC error on attempt ${attempt}/${maxRetries}, retrying in ${waitTime}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        continue;
      }
      
      // Don't retry on non-retryable errors (insufficient balance, invalid address, etc.)
      throw new Error(`Failed to transfer token from offramp wallet: ${error.message}`);
    }
  }
  
  throw new Error(`Failed to transfer token from offramp wallet after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Transfer USDT from offramp wallet to user wallet (for on-ramp) - Legacy function
 * @deprecated Use transferTokenFromOfframp instead
 */
export async function transferUSDTFromOfframp(
  to: string,
  amount: string,
  maxRetries: number = 3
): Promise<ethers.ContractTransactionResponse> {
  // Use AlphaUSD address (0x20c0000000000000000000000000000000000001) as default
  return transferTokenFromOfframp(to, amount, usdtContractAddress, maxRetries);
}

/**
 * Get offramp wallet balance for a specific token
 * @param tokenAddress - Token contract address (optional, defaults to usdtContractAddress for backward compatibility)
 */
export async function getOfframpBalance(tokenAddress?: string): Promise<string> {
  if (!offrampWallet) {
    throw new Error('Offramp wallet not configured');
  }

  try {
    const tokenAddr = tokenAddress || usdtContractAddress;
    return await getTokenBalance(offrampWallet.address, tokenAddr);
  } catch (error) {
    throw new Error(`Failed to get offramp wallet balance: ${error}`);
  }
}

