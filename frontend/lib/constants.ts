import type { Transaction, User } from './types';

export const MOCK_USER: User = {
  id: 'u_123456',
  email: 'alex.doe@example.com',
  name: 'Alex Doe',
  balanceUSDC: 2450.0,
  kycVerified: true,
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_998',
    type: 'receive',
    amount: 1200.0,
    currency: 'USDC',
    date: '2023-10-25 14:30',
    status: 'completed',
    counterparty: 'sarah.smith@example.com',
  },
  {
    id: 'tx_999',
    type: 'deposit',
    amount: 500.0,
    currency: 'USD',
    date: '2023-10-24 09:15',
    status: 'completed',
    counterparty: 'Stripe Bank Transfer',
  },
  {
    id: 'tx_1000',
    type: 'send',
    amount: 150.0,
    currency: 'USDC',
    date: '2023-10-22 18:45',
    status: 'completed',
    counterparty: 'vendor@techstore.io',
  },
];

export const APP_NAME = 'Crossflow';


