export enum AppView {
  LANDING = 'LANDING',
  KYC = 'KYC',
  DASHBOARD = 'DASHBOARD',
  DEPOSIT_FIAT = 'DEPOSIT_FIAT',
  SEND_CRYPTO = 'SEND_CRYPTO',
  WITHDRAW_FIAT = 'WITHDRAW_FIAT',
}

export type TransactionType = 'deposit' | 'withdraw' | 'send' | 'receive';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  currency: 'USD' | 'USDC';
  date: string;
  status: 'pending' | 'completed' | 'success' | 'failed';
  counterparty: string;
  txHash?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  balanceUSDC: number;
  kycVerified: boolean;
}


