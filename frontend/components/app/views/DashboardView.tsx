import React, { useState } from 'react';
import Image from 'next/image';
import {
  ArrowUpRight,
  Copy,
  Download,
  LogOut,
  Moon,
  QrCode,
  Send,
  Sun,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import type { Transaction, User } from '../../../lib/types';

export type BankAccount = {
  bankAccountId: string;
  connectedAccountId: string;
  currency: string;
  country: string;
  accountHolderName: string;
};

export const DashboardView: React.FC<{
  isDark: boolean;
  onToggleTheme: () => void;
  user: User | null;
  onLogout: () => void;
  address: string | undefined;
  shortenedAddress: string;
  onCopyAddress: () => void;
  onGoToSend: () => void;
  onOpenReceive: () => void;
  onGoToDeposit: () => void;
  onGoToWithdraw: () => void;
  alphaUsdBalance: number | undefined;
  betaUsdBalance: number | undefined;
  thetaUsdBalance: number | undefined;
  transactions: Transaction[];
  lifetimeVolume: { totalVolume: number; currency: string; bankAccountId: string } | undefined;
  isLifetimeVolumeLoading: boolean;
  isLifetimeVolumeError: boolean;
  lifetimeVolumeErrorMessage: string | null;
  bankAccounts: BankAccount[];
  onOpenBankModal: () => void;
}> = ({
  isDark,
  onToggleTheme,
  user,
  onLogout,
  address,
  shortenedAddress,
  onCopyAddress,
  onGoToSend,
  onOpenReceive,
  onGoToDeposit,
  onGoToWithdraw,
  alphaUsdBalance,
  betaUsdBalance,
  thetaUsdBalance,
  transactions,
  lifetimeVolume,
  isLifetimeVolumeLoading,
  isLifetimeVolumeError,
  lifetimeVolumeErrorMessage,
  bankAccounts,
  onOpenBankModal,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const shortenId = (id: string, head = 6, tail = 4) => {
    if (!id) return '';
    if (id.length <= head + tail + 3) return id;
    return `${id.slice(0, head)}...${id.slice(-tail)}`;
  };

  const formatFiat = (amount: number, currency: string) => {
    const cur = (currency || '').toUpperCase();
    const symbol = cur === 'EUR' ? '€' : '$';
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="min-h-screen bg-aurora-bg pb-10">
      <header className="border-b border-aurora-border bg-aurora-bg/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-[80%] mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="bg-aurora-bg rounded-md p-1">
              <Image src={isDark ? "/crossflow-dark.png" : "/crossflow-light.png"} alt="Crossflow" width={68} height={45} className="rounded-md" />
            </div>
            <span className="font-mono font-bold tracking-[0.32em] text-xl text-aurora-primary">
              Crossflow
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full hover:bg-aurora-primary/10 text-aurora-textMuted hover:text-aurora-primary transition-colors"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-xs text-aurora-textMuted uppercase">Verified User</p>
              <p className="text-sm font-mono text-aurora-text">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-aurora-primary to-purple-600 border border-white/20" />
            <button onClick={onLogout} className="text-aurora-textMuted hover:text-aurora-text">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-[80%] mx-auto px-6 py-10 space-y-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card
            className="md:col-span-2 relative overflow-hidden flex flex-col justify-between min-h-[220px]"
            noPadding
          >
            <div className="px-6 py-4 border-b border-aurora-border">
              <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
                CROSSFLOW ACCOUNT
              </h3>
            </div>
            <div className="p-6 flex flex-col justify-between flex-1 relative">
              <div className="absolute right-0 top-0 w-64 h-64 bg-aurora-primary/10 blur-[80px] rounded-full pointer-events-none" />
              <div className="grid grid-cols-[30%_70%] flex-1">
                <div className="border-r border-aurora-border pr-6">
                  <h2 className="text-aurora-textMuted font-mono text-base tracking-[0.28em] mb-4">
                    Balance
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-mono text-aurora-primary">
                        {alphaUsdBalance !== undefined
                          ? alphaUsdBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '...'}
                      </span>
                      <span className="text-base font-mono text-aurora-textMuted">
                        AlphaUSD
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-mono text-aurora-primary">
                        {betaUsdBalance !== undefined
                          ? betaUsdBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '...'}
                      </span>
                      <span className="text-base font-mono text-aurora-textMuted">
                        BetaUSD
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-mono text-aurora-primary">
                        {thetaUsdBalance !== undefined
                          ? thetaUsdBalance.toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          : '...'}
                      </span>
                      <span className="text-base font-mono text-aurora-textMuted">
                        ThetaUSD
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between pl-6">
                  {address && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-base font-mono text-aurora-textMuted tracking-[0.28em]">Address:</span>
                        <span className="text-base font-mono text-aurora-primary">
                          {shortenedAddress}
                        </span>
                        <button
                          type="button"
                          className="flex items-center text-aurora-primary hover:text-aurora-text transition-colors"
                          onClick={onCopyAddress}
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={onGoToSend} glow className="w-full">
                      <Send size={16} /> Send
                    </Button>
                    <Button onClick={onOpenReceive} variant="secondary" className="w-full">
                      <QrCode size={16} /> Receive
                    </Button>
                    <Button onClick={onGoToDeposit} variant="secondary" className="w-full">
                      <ArrowUpRight size={16} /> Card Payment
                    </Button>
                    <Button onClick={onGoToWithdraw} variant="secondary" className="w-full">
                      <Download size={16} /> Bank Transfer
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="relative overflow-hidden flex flex-col justify-between min-h-[220px] h-full" noPadding>
            <div className="px-6 py-4 border-b border-aurora-border">
              <h3 className="font-mono font-semibold text-aurora-primary text-base uppercase tracking-[0.18em] text-center">
                Bank Accounts
              </h3>
            </div>
            <div className="px-6 pt-6 pb-6 flex flex-col justify-between flex-1">
              <div className="flex flex-col space-y-4">
                <div>
                  {bankAccounts.length === 0 ? (
                    <>
                      <p className="text-sm text-aurora-text">No bank connected</p>
                      <p className="text-xs text-aurora-textMuted mt-1">
                        Connect a bank account to enable cashout.
                      </p>
                    </>
                  ) : (
                    <div className="w-full space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono text-aurora-textMuted tracking-[0.28em]">
                          Account ID:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono text-aurora-primary">
                            {bankAccounts[0].connectedAccountId ? shortenId(bankAccounts[0].connectedAccountId) : '—'}
                          </span>
                          {bankAccounts[0].connectedAccountId && (
                            <button
                              type="button"
                              className="flex items-center text-aurora-primary hover:text-aurora-text transition-colors"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(bankAccounts[0].connectedAccountId)
                                  .catch(() => {})
                              }
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono text-aurora-textMuted tracking-[0.28em]">
                          Bank ID:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-mono text-aurora-primary">
                            {bankAccounts[0].bankAccountId ? shortenId(bankAccounts[0].bankAccountId) : '—'}
                          </span>
                          {bankAccounts[0].bankAccountId && (
                            <button
                              type="button"
                              className="flex items-center text-aurora-primary hover:text-aurora-text transition-colors"
                              onClick={() =>
                                navigator.clipboard
                                  .writeText(bankAccounts[0].bankAccountId)
                                  .catch(() => {})
                              }
                            >
                              <Copy size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-base font-mono text-aurora-textMuted tracking-[0.28em]">
                          Balance:
                        </span>
                        <span className="text-base font-mono text-aurora-primary">
                          {isLifetimeVolumeLoading
                            ? '...'
                            : isLifetimeVolumeError
                              ? '—'
                              : lifetimeVolume
                                ? formatFiat(lifetimeVolume.totalVolume, lifetimeVolume.currency)
                                : '$0.00'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col">
                <Button
                  type="button"
                  glow
                  className="w-full mb-0"
                  onClick={onOpenBankModal}
                >
                  {bankAccounts.length === 0 ? 'Connect bank' : 'Add Another Bank'}
                </Button>
              </div>
            </div>
          </Card>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-mono font-semibold uppercase tracking-[0.28em] text-aurora-primary">
              Recent Activity
            </h3>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-xs font-mono rounded border border-aurora-border text-aurora-text hover:bg-aurora-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs font-mono rounded border transition-colors ${
                      currentPage === page
                        ? 'bg-aurora-primary text-white border-aurora-primary'
                        : 'border-aurora-border text-aurora-text hover:bg-aurora-primary/10'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs font-mono rounded border border-aurora-border text-aurora-text hover:bg-aurora-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="glass-panel p-8 rounded-sm text-center">
              <p className="text-sm text-aurora-textMuted">No activity yet</p>
            </div>
          ) : (
            <div className="glass-panel rounded-sm overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-aurora-border bg-aurora-primary/5">
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold uppercase tracking-wider text-aurora-textMuted">Transaction</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold uppercase tracking-wider text-aurora-textMuted">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold uppercase tracking-wider text-aurora-textMuted">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-mono font-semibold uppercase tracking-wider text-aurora-textMuted">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-mono font-semibold uppercase tracking-wider text-aurora-textMuted">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-aurora-border last:border-b-0 hover:bg-aurora-primary/5 transition-colors">
                      <td className="px-4 py-3">
                        {tx.txHash ? (
                          <a href={`https://explore.tempo.xyz/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer"
                            className="text-sm text-aurora-primary hover:underline font-mono">
                            {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                          </a>
                        ) : (
                          <span className="text-sm text-aurora-textMuted font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                            tx.type === 'receive' || tx.type === 'deposit'
                              ? 'bg-green-500/10 border-green-500/30 text-green-500'
                              : 'bg-red-500/10 border-red-500/30 text-red-500'
                          }`}>
                            {tx.type === 'deposit' && <ArrowUpRight size={12} />}
                            {tx.type === 'withdraw' && <Download size={12} />}
                            {tx.type === 'send' && <ArrowUpRight size={12} className="rotate-45" />}
                            {tx.type === 'receive' && <Download size={12} className="rotate-45" />}
                          </div>
                          <span className="text-sm text-aurora-text">
                            {tx.type === 'deposit' ? 'Card Payment' :
                             tx.type === 'withdraw' ? 'Bank Transfer' :
                             tx.type === 'send' ? 'Send' :
                             tx.type === 'receive' ? 'Receive' : tx.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-aurora-textMuted font-mono">{tx.date}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-mono rounded ${
                          tx.status === 'completed' || tx.status === 'success' ? 'bg-green-500/10 text-green-500' :
                          tx.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                          'bg-red-500/10 text-red-500'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono text-sm ${
                          tx.type === 'receive' || tx.type === 'deposit' ? 'text-green-500' : 'text-aurora-text'
                        }`}>
                          {tx.type === 'receive' || tx.type === 'deposit' ? '+' : '-'}
                          {tx.amount.toFixed(2)} {tx.currency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};


