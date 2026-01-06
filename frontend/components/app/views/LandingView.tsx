import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';

export const LandingView: React.FC<{
  appName: string;
  isDark: boolean;
  onToggleTheme: () => void;
  onLaunchApp: () => void;
}> = ({ appName, isDark, onToggleTheme, onLaunchApp }) => {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-aurora-bg text-aurora-text">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-aurora-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <nav className="relative z-10 w-full md:w-[80%] mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="font-mono text-3xl tracking-[0.05em] font-bold text-aurora-text">{appName}</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-aurora-primary/10 text-aurora-text hover:text-aurora-primary transition-colors"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Button onClick={onLaunchApp} glow>
            Launch App
          </Button>
        </div>
      </nav>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 mt-6">
        {showVideo ? (
          <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <div className="w-full bg-black/20 border border-aurora-border rounded-sm overflow-hidden" style={{ aspectRatio: '560/315' }}>
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/_COnehcLDtw?si=ZzIIV1odpb6r7Zhh"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-mono text-2xl font-bold mb-6 leading-tight text-aurora-text">
              BORDERLESS <span className="text-aurora-primary drop-shadow-[0_0_15px_rgba(122,184,255,0.3)]">PAYMENTS</span>
            </h1>
            <p className="max-w-xl text-aurora-text font-normal text-base mb-10">
              A cross-border payment app built on Tempo Testnet, enabling fiat ↔ stablecoin conversion, global on-chain transfers, and bank cash-out via Stripe payment infrastructure.
            </p>
            <div className="flex flex-col md:flex-row gap-4">
              <Button onClick={onLaunchApp} glow className="min-w-[180px]">
                Get Started
              </Button>
              <Button variant="secondary" onClick={() => setShowVideo(true)} className="min-w-[180px]">
                How It Works
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-[80%]">
              <Card
                title="Instant Deposits"
                className="group hover:border-aurora-primary/50 transition-colors relative overflow-hidden"
                noPadding
              >
                <div className="p-6">
                  <p className="text-aurora-text text-sm leading-relaxed">
                    Deposit fiat instantly, convert to stablecoins like USDC or EURC, and access global on-chain transfers within seconds on the Tempo network.
                  </p>
                </div>
              </Card>
              <Card
                title="Cross-Border Transfers"
                className="group hover:border-aurora-primary/50 transition-colors relative overflow-hidden"
                noPadding
              >
                <div className="p-6">
                  <p className="text-aurora-text text-sm leading-relaxed">
                    Send stablecoins worldwide using wallet addresses. Enjoy fast settlement, low fees, and secure transactions powered by the Tempo blockchain.
                  </p>
                </div>
              </Card>
              <Card
                title="Bank Withdrawals"
                className="group hover:border-aurora-primary/50 transition-colors relative overflow-hidden"
                noPadding
              >
                <div className="p-6">
                  <p className="text-aurora-text text-sm leading-relaxed">
                    Withdraw stablecoins directly to your bank account through Stripe-powered payout infrastructure with secure processing and compliance-ready rails.
                  </p>
                </div>
              </Card>
            </div>
          </>
        )}
      </main>

      <footer className="w-full border-t border-aurora-border mt-20 py-6 text-center text-aurora-textMuted text-sm font-mono">
        <p>© 2024 Acrosspay. Borderless payments built on Tempo Testnet with Stripe integration.</p>
      </footer>
    </div>
  );
};


