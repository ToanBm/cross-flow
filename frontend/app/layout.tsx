import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Acrosspay | Cross-Border Payments on Tempo',
  description:
    'Cross-border remittance app with Tempo, passkeys, and Stripe on/off-ramp.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-aurora-bg text-aurora-text antialiased">
        {children}
      </body>
    </html>
  );
}

