"use client";

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
} from 'lucide-react';
import {
  WagmiProvider,
  useConnection,
  useDisconnect,
} from 'wagmi';
import { Hooks } from 'tempo.ts/wagmi';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { AppView, type Transaction, type User } from '../lib/types';
import {
  APP_NAME,
  MOCK_TRANSACTIONS,
  MOCK_USER,
} from '../lib/constants';
import {
  simulateBlockchainTx,
  simulateStripeOffRamp,
  simulateStripeOnRamp,
} from '../lib/mockStripe';
import { tempoChain, wagmiConfig } from '../lib/wagmiConfig';
import { stripePromise } from '../src/stripeClient';
import {
  USDC_ADDRESS,
  fetchUsdcBalance,
  fetchTokenBalance,
  TOKEN_ADDRESSES,
} from '../lib/tempoContracts';
import { parseUnits, stringToHex, pad } from 'viem';
import { PasskeyModal } from '../components/app/modals/PasskeyModal';
import { ReceiveModal } from '../components/app/modals/ReceiveModal';
import { RecipientsModal } from '../components/app/modals/RecipientsModal';
import { BankConnectModal, type BankAccount } from '../components/app/modals/BankConnectModal';
import { FeedbackModal } from '../components/app/modals/FeedbackModal';
import { FeedbackButton } from '../components/app/FeedbackButton';
import { LandingView } from '../components/app/views/LandingView';
import { KycView } from '../components/app/views/KycView';
import { DashboardView } from '../components/app/views/DashboardView';
import { DepositView } from '../components/app/views/DepositView';
import { SendView } from '../components/app/views/SendView';
import { WithdrawView } from '../components/app/views/WithdrawView';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

type Notification = { msg: string; type: 'success' | 'error' } | null;

const InnerApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] =
    useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const [kycEmail, setKycEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [memo, setMemo] = useState('');
  const [saveRecipient, setSaveRecipient] = useState(false);
  const [selectedToken, setSelectedToken] = useState<'AlphaUSD' | 'BetaUSD' | 'ThetaUSD'>('AlphaUSD');
  const [depositCurrency, setDepositCurrency] = useState<'USD' | 'EUR'>('USD');
  const [notification, setNotification] = useState<Notification>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [withdrawTxHash, setWithdrawTxHash] = useState<string | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const connection = useConnection();
  const { disconnect } = useDisconnect();
  const address = (connection as any)?.address as string | undefined;
  const shortenedAddress =
    address && address.length > 10
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address || '';

  const stripe = useStripe();
  const elements = useElements();
  const transferToken = Hooks.token.useTransferSync({
    mutation: {
      onSuccess: async (result: any) => {
        // Extract txHash from result
        const txHash =
          result?.receipt?.transactionHash ||
          result?.hash ||
          result?.transactionHash ||
          null;

        // Log activity to backend
        if (address && txHash) {
          try {
            await fetch('/api/activity-history/log', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                wallet_address: address,
                activity_type: 'send',
                token_address: TOKEN_ADDRESSES[selectedToken],
                token_symbol: selectedToken,
                amount: parseFloat(amount),
                to_address: recipient.trim(),
                from_address: address,
                tx_hash: txHash,
                status: 'success',
                memo: memo || null,
              }),
            }).catch((err) => {
              console.log('[Log activity] Error:', err);
            });
          } catch (err) {
            console.log('[Log activity] Error:', err);
          }
        }

        // Save recipient if checkbox is checked
        if (saveRecipient && address && recipient) {
          try {
            const recipientAddress = recipient.trim();
            if (recipientAddress.startsWith('0x') && recipientAddress.length === 42) {
              await fetch('/api/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_wallet_address: address,
                  recipient_address: recipientAddress,
                }),
              }).catch((err) => {
                // Silently fail if already exists
                console.log('[Save recipient] Note:', err);
              });
            }
          } catch (err) {
            console.log('[Save recipient] Error:', err);
          }
        }

        setNotification({
          msg: 'Transfer successful on Tempo',
          type: 'success',
        });

        // Clear form and reset checkbox
        setAmount('');
        setRecipient('');
        setMemo('');
        setSaveRecipient(false);
      },
      onError: (error: any) => {
        console.error('[useTransferSync] error', error);
        setNotification({
          msg: error?.message || 'Failed to send payment on Tempo',
          type: 'error',
        });
      },
    },
  });
  const withdrawTransfer = Hooks.token.useTransferSync();

  useEffect(() => {
    // No-op (legacy localStorage bank accounts removed in favor of backend persistence)
  }, []);

  useEffect(() => {
    // No-op (bank accounts are loaded from backend)
  }, [user?.email]);

  useEffect(() => {
    // Hydrate recent KYC emails for quick re-login
    try {
      const raw = window.localStorage.getItem('tempo_recent_emails');
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          setRecentEmails(
            parsed
              .map((e) => String(e).trim().toLowerCase())
              .filter(Boolean)
              .slice(0, 10),
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const {
    data: onchainBalance,
    isLoading: isBalanceLoading,
    isError: isBalanceError,
  } = useQuery({
    queryKey: ['tempo-usdc-balance', address],
    queryFn: () => fetchUsdcBalance(address as string),
    enabled: !!address,
    refetchInterval: 15000,
  });

  const { data: alphaUsdBalance } = useQuery({
    queryKey: ['tempo-alpha-usd-balance', address],
    queryFn: () => fetchTokenBalance(TOKEN_ADDRESSES.AlphaUSD, address as string),
    enabled: !!address,
    refetchInterval: 15000,
  });

  const { data: betaUsdBalance } = useQuery({
    queryKey: ['tempo-beta-usd-balance', address],
    queryFn: () => fetchTokenBalance(TOKEN_ADDRESSES.BetaUSD, address as string),
    enabled: !!address,
    refetchInterval: 15000,
  });

  // Activity history query
  const { data: activityData } = useQuery({
    queryKey: ['activity-history', address],
    queryFn: async () => {
      if (!address) return { activities: [], total: 0 };
      const resp = await fetch(`/api/activity-history?wallet_address=${encodeURIComponent(address)}&limit=20`);
      if (!resp.ok) throw new Error('Failed to load activity history');
      return resp.json();
    },
    enabled: !!address,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: thetaUsdBalance } = useQuery({
    queryKey: ['tempo-theta-usd-balance', address],
    queryFn: () => fetchTokenBalance(TOKEN_ADDRESSES.ThetaUSD, address as string),
    enabled: !!address,
    refetchInterval: 15000,
  });

  // Fetch exchange rate for deposit currency and selected token
  const { data: exchangeRateData } = useQuery({
    queryKey: ['exchange-rate', depositCurrency, selectedToken],
    queryFn: async () => {
      const resp = await fetch(`/api/payment/exchange-rate?currency=${depositCurrency.toLowerCase()}&token_symbol=${selectedToken}`);
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error('[Frontend] Failed to fetch exchange rate:', resp.status, errorData);
        throw new Error(`Failed to fetch exchange rate: ${resp.status}`);
      }
      const data = await resp.json() as { from: string; to: string; rate: number };
      return data;
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 2, // Retry 2 times on failure
  });

  const { data: offrampInfo } = useQuery({
    queryKey: ['offramp-balance'],
    queryFn: async () => {
      const resp = await fetch('/api/payment/offramp-balance');
      if (!resp.ok) {
        throw new Error('Failed to load offramp info');
      }
      return resp.json() as Promise<{
        address: string;
        balance: string;
        currency: string;
      }>;
    },
    enabled: !!user,
  });

  const {
    data: lifetimeVolume,
    isLoading: isLifetimeVolumeLoading,
    isError: isLifetimeVolumeError,
    error: lifetimeVolumeError,
  } = useQuery({
    queryKey: ['lifetime-volume', bankAccounts[0]?.bankAccountId],
    queryFn: async () => {
      const bankAccountId = bankAccounts[0]?.bankAccountId;
      if (!bankAccountId) throw new Error('Bank account ID required');
      // Encode bankAccountId để tránh lỗi với ký tự đặc biệt
      const encodedBankAccountId = encodeURIComponent(bankAccountId);
      const resp = await fetch(`/api/cashout/lifetime-volume/${encodedBankAccountId}`);
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        console.error('[LifetimeVolume] API error:', resp.status, errorData);
        throw new Error(errorData.error || `Failed to load lifetime volume (${resp.status})`);
      }
      return resp.json() as Promise<{
        totalVolume: number;
        currency: string;
        bankAccountId: string;
      }>;
    },
    enabled: !!bankAccounts[0]?.bankAccountId,
    refetchInterval: (query) => {
      // Don't auto-refetch if there's an error
      if (query.state.error) {
        return false;
      }
      return 15000; // Refetch mỗi 15s nếu không có lỗi
    },
    retry: 1,
    retryDelay: 5000, // Wait 5s before retry
  });

  // Fetch saved recipients
  const { data: savedRecipients, refetch: refetchRecipients } = useQuery({
    queryKey: ['recipients', address],
    queryFn: async () => {
      if (!address) throw new Error('Address required');
      const resp = await fetch(`/api/recipients?userWalletAddress=${encodeURIComponent(address)}`);
      if (!resp.ok) {
        if (resp.status === 404) return { recipients: [] };
        throw new Error('Failed to load recipients');
      }
      return resp.json() as Promise<{
        recipients: Array<{
          id: number;
          recipient_address?: string;
          recipient_name?: string;
          recipient_email?: string;
        }>
      }>;
    },
    enabled: !!address && isRecipientsModalOpen,
    refetchInterval: false,
  });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('theme');
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)',
    ).matches;
    const root = document.documentElement;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      root.classList.add('dark');
    } else {
      setIsDark(false);
      root.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.remove('dark');
      window.localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(timer);
  }, [notification]);

  const handleLogin = () => {
    // Always reset auth flow state when starting login
    setUser(null);
    setKycEmail('');
    setOtp('');
    setOtpRequested(false);
    setCurrentView(AppView.KYC);
  };

  const handleLogout = () => {
    setCurrentView(AppView.LANDING);
    setUser(null);
    // Disconnect Tempo passkey wallet so next login doesn't reuse old wallet
    disconnect();
    // Reset KYC/OTP state so user doesn't land on OTP screen next time
    setKycEmail('');
    setOtp('');
    setOtpRequested(false);
    // Clear user-scoped UI state; per-email bank accounts remain in localStorage (dev-only)
    setBankAccounts([]);
  };

  const handleSendOtp = async () => {
    if (!kycEmail || !kycEmail.includes('@')) {
      setNotification({ msg: 'Please enter a valid email address', type: 'error' });
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: kycEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({ msg: data.error || 'Failed to send OTP', type: 'error' });
        return;
      }

      // Keep state in sync with backend-normalized email
      if (data.email) {
        setKycEmail(String(data.email).trim().toLowerCase());
      }

      // Save email to recent list for quick reuse
      try {
        const normalized = (data.email ? String(data.email) : kycEmail).trim().toLowerCase();
        const next = [normalized, ...recentEmails.filter((e) => e !== normalized)].slice(0, 10);
        setRecentEmails(next);
        window.localStorage.setItem('tempo_recent_emails', JSON.stringify(next));
      } catch {
        // ignore
      }

      // OTP is ONLY sent via email - never displayed in UI
      setNotification({
        msg:
          data.message ||
          `OTP was sent to ${data.email}. Please check your inbox (including spam).`,
        type: 'success',
      });

      setOtpRequested(true);
    } catch (error) {
      console.error('[handleSendOtp] error', error);
      setNotification({ msg: 'Server error while sending OTP', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyKYC = async () => {
    if (!kycEmail || !otp) {
      setNotification({
        msg: 'Please enter both email and OTP code',
        type: 'error',
      });
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: kycEmail, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNotification({
          msg: data.error || 'OTP verification failed',
          type: 'error',
        });
        return;
      }
      const verifiedUser: User = data.user;
      const nextActiveEmail = verifiedUser.email.toLowerCase();
      setUser(verifiedUser);
      setNotification({
        msg: `Verified account for ${verifiedUser.email}`,
        type: 'success',
      });
      // Reset OTP state after successful login
      setOtp('');
      setOtpRequested(false);
      // Email is for KYC only. Wallet (Passkey) is managed independently by Tempo.
      // Do not scope/disconnect passkey by email.
      setBankAccounts([]);

      // Load bank accounts from backend (production persistence)
      try {
        const resp = await fetch(`/api/bank-accounts?email=${encodeURIComponent(nextActiveEmail)}`);
        if (resp.ok) {
          const payload = await resp.json();
          const rows = (payload as any).bankAccounts as Array<any>;
          const mapped: BankAccount[] = Array.isArray(rows)
            ? rows.map((r) => ({
              bankAccountId: r.bank_account_id,
              connectedAccountId: r.connected_account_id,
              currency: r.currency,
              country: r.country,
              accountHolderName: r.account_holder_name || '',
            }))
            : [];
          setBankAccounts(mapped);
        } else {
          setBankAccounts([]);
        }
      } catch {
        setBankAccounts([]);
      }
      setCurrentView(AppView.DASHBOARD);
    } catch (error) {
      console.error('[handleVerifyKYC] error', error);
      setNotification({ msg: 'Server error while verifying OTP', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBankAccountsByEmail = async (email: string) => {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return;

    try {
      const resp = await fetch(`/api/bank-accounts?email=${encodeURIComponent(normalized)}`);
      if (!resp.ok) {
        setBankAccounts([]);
        return;
      }
      const payload = await resp.json();
      const rows = (payload as any).bankAccounts as Array<any>;
      const mapped: BankAccount[] = Array.isArray(rows)
        ? rows.map((r) => ({
          bankAccountId: r.bank_account_id,
          connectedAccountId: r.connected_account_id,
          currency: r.currency,
          country: r.country,
          accountHolderName: r.account_holder_name || '',
        }))
        : [];
      setBankAccounts(mapped);
    } catch {
      setBankAccounts([]);
    }
  };

  // Auto-load bank accounts by email when user is logged in (KYC done)
  useEffect(() => {
    if (!user?.email) return;
    if (bankAccounts.length > 0) return;
    loadBankAccountsByEmail(user.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  const handleDeposit = async () => {
    if (!amount || Number.isNaN(Number(amount))) {
      setNotification({ msg: 'Please enter a valid amount', type: 'error' });
      return;
    }

    if (!address) {
      setNotification({
        msg: 'Please connect your Tempo Passkey wallet first',
        type: 'error',
      });
      return;
    }

    if (!stripe || !elements) {
      setNotification({
        msg: 'Stripe is not ready yet, please try again in a moment',
        type: 'error',
      });
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setNotification({
        msg: 'Card input not ready',
        type: 'error',
      });
      return;
    }

    try {
      setIsLoading(true);

      // Calculate fiat amount from stablecoin amount
      const stablecoinAmount = parseFloat(amount);
      const exchangeRate = exchangeRateData?.rate || 1.0;
      const fiatAmount = stablecoinAmount / exchangeRate;

      const resp = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: stablecoinAmount, // Amount in stablecoin
          currency: depositCurrency.toLowerCase(),
          walletAddress: address,
          token_symbol: selectedToken,
          token_address: TOKEN_ADDRESSES[selectedToken],
          fiat_amount: fiatAmount, // Calculated USD/EUR amount
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to create payment intent');
      }

      // Bước 2: confirm payment với Stripe bằng card user nhập
      const { clientSecret, paymentIntentId } = data;
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: user?.email,
            },
          },
        },
      );

      if (error) {
        throw new Error(error.message || 'Card payment failed');
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(`Payment status: ${paymentIntent?.status}`);
      }

      setNotification({
        msg: `Payment ${paymentIntentId} succeeded. Waiting for ${selectedToken} transfer from treasury...`,
        type: 'success',
      });

      // Log activity to backend (tx_hash will be updated by backend webhook later)
      if (address && paymentIntentId) {
        try {
          const fiatAmount = stablecoinAmount / (exchangeRateData?.rate || 1.0);
          await fetch('/api/activity-history/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: address,
              activity_type: 'deposit',
              token_symbol: selectedToken,
              amount: stablecoinAmount,
              amount_fiat: fiatAmount,
              currency: depositCurrency.toUpperCase(),
              to_address: address,
              payment_intent_id: paymentIntentId,
              status: 'pending', // Will be updated to 'success' when backend transfers token
            }),
          }).catch((err) => {
            console.log('[Log activity] Error:', err);
          });
        } catch (err) {
          console.log('[Log activity] Error:', err);
        }
      }

      setAmount('');
    } catch (error: any) {
      console.error('[handleDeposit] error', error);
      setNotification({
        msg: error.message || 'Failed to create payment intent',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!amount || Number.isNaN(Number(amount))) {
      setNotification({ msg: 'Please enter a valid amount', type: 'error' });
      return;
    }

    if (!address) {
      setNotification({
        msg: 'Please connect your Tempo Passkey wallet first',
        type: 'error',
      });
      return;
    }

    if (!selectedToken || !TOKEN_ADDRESSES[selectedToken]) {
      setNotification({
        msg: 'Please select a valid token',
        type: 'error',
      });
      return;
    }

    if (!offrampInfo?.address) {
      setNotification({
        msg: 'Offramp wallet not ready. Please ensure backend is running.',
        type: 'error',
      });
      return;
    }

    if (bankAccounts.length === 0) {
      setNotification({
        msg: 'Please connect a Stripe test bank account first',
        type: 'error',
      });
      return;
    }

    const selectedBank = bankAccounts[0];

    try {
      setIsLoading(true);

      // Step 1: gửi USDC từ ví Tempo (passkey) → ví treasury (offramp wallet) qua Tempo SDK (fee sponsored)
      const numericAmount = Number(amount);
      if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
        setNotification({
          msg: 'Please enter a valid positive amount',
          type: 'error',
        });
        setIsLoading(false);
        return;
      }

      // Tempo USDC dùng 6 decimals
      const amountWei = parseUnits(amount, 6);

      const result = await (withdrawTransfer as any).mutateAsync({
        amount: amountWei,
        to: offrampInfo.address as `0x${string}`,
        token: TOKEN_ADDRESSES[selectedToken],
        // feePayer: undefined, // Tắt sponsor gas - user tự trả phí
      });

      const txHash =
        (result as any)?.receipt?.transactionHash ||
        (result as any)?.hash ||
        (result as any)?.transactionHash;

      if (!txHash) {
        throw new Error('Missing transaction hash from Tempo withdraw transfer');
      }

      setWithdrawTxHash(txHash as string);

      // Log activity to backend
      if (address && txHash) {
        try {
          await fetch('/api/activity-history/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: address,
              activity_type: 'withdraw',
              token_address: TOKEN_ADDRESSES[selectedToken],
              token_symbol: selectedToken,
              amount: numericAmount,
              amount_fiat: numericAmount,
              currency: selectedBank.currency.toUpperCase(),
              to_address: offrampInfo.address,
              from_address: address,
              tx_hash: txHash as string,
              status: 'success',
            }),
          }).catch((err) => {
            console.log('[Log activity] Error:', err);
          });
        } catch (err) {
          console.log('[Log activity] Error:', err);
        }
      }

      // Step 2: gọi backend cashout để tạo Stripe payout về bank account
      const resp = await fetch('/api/cashout/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: selectedBank.currency.toLowerCase(),
          bankAccountId: selectedBank.bankAccountId,
          connectedAccountId: selectedBank.connectedAccountId,
          employeeAddress: address,
          txHash,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data.error || 'Failed to request cashout');
      }

      setNotification({
        msg: `Cashout requested successfully. Payout ID: ${data.payoutId || 'pending'}`,
        type: 'success',
      });

      setAmount('');
    } catch (error: any) {
      console.error('[handleWithdraw] error', error);
      setNotification({
        msg: error.message || 'Failed to process withdrawal',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!amount || !recipient) {
      setNotification({
        msg: 'Please enter amount and recipient address',
        type: 'error',
      });
      return;
    }

    if (!address) {
      setNotification({
        msg: 'Please connect your Tempo Passkey wallet first',
        type: 'error',
      });
      return;
    }

    const recipientAddress = recipient.trim();
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setNotification({
        msg: 'Currently only supports sending to Tempo address 0x..., email mapping not available yet',
        type: 'error',
      });
      return;
    }

    if (!selectedToken || !TOKEN_ADDRESSES[selectedToken]) {
      setNotification({
        msg: 'Please select a valid token',
        type: 'error',
      });
      return;
    }

    try {
      const numericAmount = Number(amount);
      if (!numericAmount || Number.isNaN(numericAmount) || numericAmount <= 0) {
        setNotification({
          msg: 'Please enter a valid amount',
          type: 'error',
        });
        return;
      }

      // Tempo tokens use 6 decimals per docs
      const amountWei = parseUnits(amount, 6);

      transferToken.mutate({
        amount: amountWei,
        to: recipientAddress as `0x${string}`,
        token: TOKEN_ADDRESSES[selectedToken],
        feeToken: (tempoChain as any).feeToken ?? null,
        memo: memo ? pad(stringToHex(memo), { size: 32 }) : undefined,
        // feePayer: undefined, // Tắt sponsor gas - user tự trả phí
      });

      setNotification({
        msg: `Sending ${amount} ${selectedToken} on Tempo...`,
        type: 'success',
      });
    } catch (error: any) {
      console.error('[handleSend] error', error);
      setNotification({
        msg: error?.message || 'Failed to send payment',
        type: 'error',
      });
    }
  };


  return (
    <div className="font-sans text-aurora-text selection:bg-aurora-primary selection:text-black">
      {notification && (
        <div className="fixed top-6 right-6 z-[100] animate-bounce-in">
          <div className="glass-panel px-6 py-4 rounded-sm flex items-center gap-3 shadow-neon">
            <CheckCircle2 className="text-aurora-primary" size={20} />
            <p className="text-sm font-mono text-aurora-text">
              {notification.msg}
            </p>
          </div>
        </div>
      )}

      {currentView === AppView.LANDING && (
        <LandingView
          appName={APP_NAME}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onLaunchApp={handleLogin}
        />
      )}
      {currentView === AppView.KYC && (
        <KycView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          kycEmail={kycEmail}
          setKycEmail={setKycEmail}
          otpRequested={otpRequested}
          isLoading={isLoading}
          onSendOtp={handleSendOtp}
          otp={otp}
          setOtp={setOtp}
          onVerify={handleVerifyKYC}
          onChangeEmail={() => {
            setKycEmail('');
            setOtp('');
            setOtpRequested(false);
          }}
          recentEmails={recentEmails}
        />
      )}
      {currentView === AppView.DASHBOARD && (
        <DashboardView
          isDark={isDark}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={handleLogout}
          address={address}
          shortenedAddress={shortenedAddress}
          onCopyAddress={() => {
            if (address) {
              navigator.clipboard.writeText(address).catch(() => {
                // ignore
              });
            }
          }}
          onGoToSend={() => setCurrentView(AppView.SEND_CRYPTO)}
          onOpenReceive={() => setIsReceiveModalOpen(true)}
          onGoToDeposit={() => setCurrentView(AppView.DEPOSIT_FIAT)}
          onGoToWithdraw={() => setCurrentView(AppView.WITHDRAW_FIAT)}
          alphaUsdBalance={alphaUsdBalance}
          betaUsdBalance={betaUsdBalance}
          thetaUsdBalance={thetaUsdBalance}
          transactions={
            activityData?.activities
              ? activityData.activities.map((act: any) => ({
                id: act.id.toString(),
                type:
                  act.activity_type === 'send'
                    ? 'send'
                    : act.activity_type === 'deposit'
                      ? 'deposit'
                      : act.activity_type === 'withdraw'
                        ? 'withdraw'
                        : 'receive',
                amount: parseFloat(act.amount || '0'),
                currency: (act.token_symbol || act.currency || 'USD') as 'USD' | 'USDC',
                counterparty:
                  act.activity_type === 'send'
                    ? act.to_address
                      ? `${act.to_address.slice(0, 6)}...${act.to_address.slice(-4)}`
                      : 'Unknown'
                    : act.activity_type === 'deposit'
                      ? 'Card Payment'
                      : act.activity_type === 'withdraw'
                        ? 'Bank Account'
                        : act.from_address
                          ? `${act.from_address.slice(0, 6)}...${act.from_address.slice(-4)}`
                          : 'Unknown',
                date: new Date(act.created_at).toLocaleString(),
                status: act.status || 'completed',
                txHash: act.tx_hash || null,
              }))
              : [] // Empty array instead of mock data
          }
          lifetimeVolume={lifetimeVolume}
          isLifetimeVolumeLoading={isLifetimeVolumeLoading}
          isLifetimeVolumeError={isLifetimeVolumeError}
          lifetimeVolumeErrorMessage={lifetimeVolumeError ? (lifetimeVolumeError as Error).message : null}
          bankAccounts={bankAccounts}
          onOpenBankModal={() => setIsBankModalOpen(true)}
        />
      )}
      {currentView === AppView.DEPOSIT_FIAT && (
        <DepositView
          onBack={() => setCurrentView(AppView.DASHBOARD)}
          depositCurrency={depositCurrency}
          setDepositCurrency={setDepositCurrency}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          exchangeRate={exchangeRateData?.rate}
          amount={amount}
          setAmount={setAmount}
          onDeposit={handleDeposit}
          isLoading={isLoading}
        />
      )}
      {currentView === AppView.SEND_CRYPTO && (
        <SendView
          onBack={() => setCurrentView(AppView.DASHBOARD)}
          recipient={recipient}
          setRecipient={setRecipient}
          canOpenRecipients={!!address}
          onOpenRecipients={() => {
            if (address) {
              setIsRecipientsModalOpen(true);
              refetchRecipients();
            }
          }}
          saveRecipient={saveRecipient}
          setSaveRecipient={setSaveRecipient}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          alphaUsdBalance={alphaUsdBalance}
          betaUsdBalance={betaUsdBalance}
          thetaUsdBalance={thetaUsdBalance}
          amount={amount}
          setAmount={setAmount}
          memo={memo}
          setMemo={setMemo}
          onSend={handleSend}
          isSending={transferToken.isPending}
        />
      )}
      {currentView === AppView.WITHDRAW_FIAT && (
        <WithdrawView
          onBack={() => setCurrentView(AppView.DASHBOARD)}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          amount={amount}
          setAmount={setAmount}
          bankAccounts={bankAccounts}
          withdrawTxHash={withdrawTxHash}
          onWithdraw={handleWithdraw}
          isLoading={isLoading}
        />
      )}

      {/* Modal Passkey bắt buộc sau khi login OTP nhưng trước khi dùng dashboard */}
      <PasskeyModal user={user} />
      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        address={address || ''}
      />
      <BankConnectModal
        user={user}
        isOpen={isBankModalOpen}
        onClose={() => setIsBankModalOpen(false)}
        onCreated={(account) => {
          // Optimistically update UI immediately
          setBankAccounts((prev) => [account, ...prev]);

          // Persist bank account to backend so it auto-loads on next login
          if (user?.email) {
            (async () => {
              try {
                const resp = await fetch('/api/bank-accounts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_email: user.email,
                    bank_account_id: account.bankAccountId,
                    connected_account_id: account.connectedAccountId,
                    currency: account.currency,
                    country: account.country,
                    account_holder_name: account.accountHolderName,
                  }),
                });

                if (!resp.ok) {
                  const data = await resp.json().catch(() => ({}));
                  setNotification({
                    msg:
                      (data as any)?.error ||
                      'Failed to save bank account for auto-connect. Please try again.',
                    type: 'error',
                  });
                  return;
                }

                // Refresh from DB to ensure auto-connect works reliably
                await loadBankAccountsByEmail(user.email);
              } catch {
                setNotification({
                  msg: 'Failed to save bank account for auto-connect. Please try again.',
                  type: 'error',
                });
              }
            })();
          }
          setNotification({
            msg: `Connected test bank ${account.bankAccountId}`,
            type: 'success',
          });
        }}
      />
      <RecipientsModal
        isOpen={isRecipientsModalOpen}
        onClose={() => setIsRecipientsModalOpen(false)}
        recipients={savedRecipients?.recipients || []}
        onSelect={(address) => {
          setRecipient(address);
        }}
      />
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
        userEmail={user?.email}
        userAddress={address}
      />
      <FeedbackButton onClick={() => setIsFeedbackModalOpen(true)} />
    </div>
  );
};

const Page: React.FC = () => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Elements stripe={stripePromise} options={{ locale: 'en' }}>
          <InnerApp />
        </Elements>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export default Page;


