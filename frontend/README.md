# Crossflow Frontend

A modern, borderless payment application built on Tempo Testnet, enabling seamless fiat ↔ stablecoin conversion, global on-chain transfers, and bank cash-out via Stripe payment infrastructure.

## Overview

Crossflow is a cross-border payment application that allows users to:

- **Deposit funds** using credit/debit cards via Stripe (on-ramp)
- **Send stablecoins** (AlphaUSD, BetaUSD, ThetaUSD) to any wallet address on Tempo Testnet
- **Withdraw to bank accounts** using Stripe's payout infrastructure (off-ramp)
- **Manage recipients** for quick access to frequently used wallet addresses
- **Track activity history** of all transactions

## Features

### 🚀 Core Features

- **Email-based Authentication**: Secure OTP (One-Time Password) verification via email
- **Passkey/Wallet Integration**: WebAuthn-based Passkey authentication using Tempo SDK
- **Multi-token Support**: Support for AlphaUSD, BetaUSD, and ThetaUSD stablecoins
- **Bank Account Management**: Connect and manage multiple bank accounts for withdrawals
- **Recipient Management**: Save and manage frequently used recipient addresses
- **Activity History**: Track all transactions (deposits, sends, withdrawals)
- **Real-time Balance**: Display wallet balances and bank account balances
- **Dark/Light Mode**: Theme switching support

### 🔒 Security

- **Passkey Authentication**: Passwordless authentication using WebAuthn
- **Email OTP Verification**: Secure email-based OTP for account activation
- **Wallet Integration**: Direct integration with Tempo blockchain wallets
- **Secure API Communication**: All API calls go through Next.js API routes

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI Library**: React 18
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Blockchain**: Tempo SDK, Wagmi, Viem
- **Payment**: Stripe Elements
- **Icons**: Lucide React

## Project Structure

```
frontend/
├── app/
│   ├── api/              # Next.js API routes (proxies to backend)
│   ├── globals.css       # Global styles and CSS variables
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main application entry point
├── components/
│   ├── app/
│   │   ├── modals/       # Modal components
│   │   │   ├── BankConnectModal.tsx
│   │   │   ├── PasskeyModal.tsx
│   │   │   ├── ReceiveModal.tsx
│   │   │   └── RecipientsModal.tsx
│   │   └── views/        # Page view components
│   │       ├── DashboardView.tsx
│   │       ├── DepositView.tsx
│   │       ├── KycView.tsx
│   │       ├── LandingView.tsx
│   │       ├── SendView.tsx
│   │       └── WithdrawView.tsx
│   └── ui/               # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       └── Input.tsx
├── lib/
│   ├── constants.ts      # App constants
│   ├── tempoContracts.ts # Tempo contract addresses and ABIs
│   ├── types.ts          # TypeScript type definitions
│   └── wagmiConfig.ts    # Wagmi/Tempo configuration
└── public/               # Static assets
    ├── crossflow-dark.png
    ├── crossflow-light.png
    ├── crossflow.png
    ├── deposit.svg
    ├── transfer.svg
    └── withdraw.svg
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API server running (see backend documentation)

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3000`

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file in the `frontend` directory:

```env
# Backend API URL
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
# OR for production:
# NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com

# Next.js API URL (for server-side API routes)
NEXT_API_URL=http://localhost:4000

# Stripe Publishable Key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Application Flow

### 1. Landing Page

Users land on the homepage showcasing:
- App name and branding
- Main features (Instant Deposits, Cross-Border Transfers, Bank Withdrawals)
- Call-to-action buttons

### 2. Identity Verification (KYC)

- User enters email address
- OTP is sent to email
- User enters 6-digit OTP to verify
- After verification, user proceeds to wallet setup

### 3. Wallet Activation

- User can create a new Passkey or sign in with existing Passkey
- Passkey creation/sign-in is handled by Tempo SDK
- Wallet address is automatically generated/retrieved

### 4. Dashboard

Main application dashboard showing:
- **Balance Section**: Display of AlphaUSD, BetaUSD, and ThetaUSD balances
- **Wallet Section**: Wallet address with copy functionality
- **Bank Account Section**: Connected bank accounts with balance and details
- **Recent Activity**: List of recent transactions
- Navigation to: Send, Receive, Deposit, Withdraw

### 5. Deposit

- User selects currency (USD/EUR)
- User enters amount
- Stripe PaymentIntent is created
- User completes payment via Stripe Elements
- On successful payment, USDT is transferred to user's wallet

### 6. Send

- User selects token (AlphaUSD/BetaUSD/ThetaUSD)
- User enters recipient address (or selects from saved recipients)
- User enters amount and optional memo
- User can optionally save recipient to contacts
- Transaction is executed on-chain
- Activity is logged to backend

### 7. Receive

- User can view their wallet address
- User can copy address or view QR code (if implemented)

### 8. Withdraw

- User selects bank account (or connects new one)
- User enters amount in USDT
- System calculates fiat equivalent
- Withdrawal request is created
- USDT is transferred to offramp wallet
- Stripe payout is initiated
- User receives funds in bank account

## Key Components

### PasskeyModal

Handles Passkey creation and sign-in using Tempo SDK's WebAuthn connector.

### BankConnectModal

Manages bank account connection via Stripe:
- Create new connected account
- Link existing connected account

### RecipientsModal

Displays and allows selection of saved recipient addresses.

### DashboardView

Main dashboard showing balances, wallet info, bank accounts, and activity history.

## API Integration

The frontend uses Next.js API routes as proxies to the backend API:

- `/api/auth/*`: Authentication endpoints
- `/api/payment/*`: Payment-related endpoints
- `/api/cashout/*`: Cashout/withdrawal endpoints
- `/api/bank-accounts`: Bank account management
- `/api/recipients`: Recipient management
- `/api/activity-history`: Activity history
- `/api/key-manager/*`: KeyManager endpoints for Passkey

All API calls are made server-side through Next.js API routes for security.

## Styling

The application uses Tailwind CSS with custom CSS variables for theming:

- `--color-bg`: Background color
- `--color-text`: Text color
- `--color-primary`: Primary accent color
- `--color-border`: Border color

Dark mode is toggled via a theme switcher and stored in localStorage.

## State Management

- **React Query**: For server state (API calls, caching)
- **React useState**: For local component state
- **Wagmi**: For wallet connection state

## Blockchain Integration

The application integrates with Tempo Testnet using:

- **Tempo SDK**: For Passkey/Wallet management
- **Wagmi**: For React hooks for blockchain interactions
- **Viem**: For blockchain utilities

Supported tokens:
- AlphaUSD
- BetaUSD
- ThetaUSD

## Browser Compatibility

- Chrome/Edge: Full support (including Passkey)
- Firefox: Full support (including Passkey)
- Safari: Full support (including Passkey on macOS/iOS)

Passkey support requires:
- Modern browser with WebAuthn support
- HTTPS in production (required for WebAuthn)

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Configure environment variables in Vercel dashboard.

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Docker
- Traditional VPS (with Node.js)

## Troubleshooting

### Passkey not working

- Ensure HTTPS is enabled (required for WebAuthn)
- Check browser console for errors
- Verify backend KeyManager endpoints are accessible

### API errors

- Verify `NEXT_PUBLIC_BACKEND_URL` is correct
- Check backend server is running
- Verify CORS settings on backend

### Build errors

- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check Node.js version (18+ required)

## Development

### Code Style

- TypeScript strict mode enabled
- ESLint for linting
- Prettier for code formatting (if configured)

### Adding New Features

1. Create component in appropriate directory (`components/app/` or `components/ui/`)
2. Add routes/views in `components/app/views/` if needed
3. Add API route in `app/api/` if new backend endpoint needed
4. Update types in `lib/types.ts` if needed

## License

[Your License Here]

## Support

For issues or questions, please refer to the backend documentation or contact the development team.

