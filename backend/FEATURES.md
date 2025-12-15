# Backend Features and API Documentation

This document describes all features and API endpoints available in the Crossflow backend.

## Overview

The Crossflow backend is a RESTful API server built with Express.js and TypeScript. It provides APIs for:

- User authentication (email OTP)
- Passkey/WebAuthn key management
- Payment processing (Stripe integration)
- Bank account management
- Cashout/withdrawal operations
- Activity history tracking
- Recipient management
- Blockchain transaction handling

## Technology Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL or SQLite
- **Blockchain**: Tempo Testnet (via ethers.js)
- **Payment**: Stripe
- **Email**: Resend
- **Logging**: Winston

## API Base URL

- Development: `http://localhost:4000`
- Production: `https://api.yourdomain.com`

## Authentication

The backend uses email-based OTP (One-Time Password) for user authentication. Passkeys are managed through the Tempo SDK's KeyManager contract.

## API Endpoints

### 1. Authentication (`/api/auth`)

#### POST `/api/auth/send-otp`

Send OTP to user's email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**Error Responses:**
- `400`: Invalid email
- `500`: Server error

#### POST `/api/auth/verify-otp`

Verify OTP and authenticate user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error Responses:**
- `400`: Invalid OTP
- `401`: OTP expired or incorrect
- `500`: Server error

---

### 2. Payment (`/api/payment`)

#### POST `/api/payment/create-intent`

Create a Stripe PaymentIntent for depositing funds (on-ramp).

**Request Body:**
```json
{
  "amount": 100.00,
  "currency": "USD",
  "wallet_address": "0x..."
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_...",
  "paymentIntentId": "pi_...",
  "amount_usdt": "95.00"
}
```

#### GET `/api/payment/status/:paymentIntentId`

Get payment status by PaymentIntent ID.

**Response (200):**
```json
{
  "id": 1,
  "payment_intent_id": "pi_...",
  "wallet_address": "0x...",
  "amount_fiat": 100.00,
  "amount_usdt": "95.00",
  "currency": "USD",
  "status": "completed",
  "tx_hash": "0x...",
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:01:00Z"
}
```

#### GET `/api/payment/history/:walletAddress`

Get payment history for a wallet address.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "payments": [
    {
      "id": 1,
      "payment_intent_id": "pi_...",
      "amount_fiat": 100.00,
      "amount_usdt": "95.00",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### GET `/api/payment/offramp-balance`

Get USDT balance of the offramp wallet (for deposits).

**Response (200):**
```json
{
  "balance": "1000.00",
  "balanceFormatted": "1,000.00"
}
```

#### GET `/api/payment/exchange-rate`

Get exchange rate between USDT and fiat currency.

**Query Parameters:**
- `currency`: Fiat currency (USD, EUR, etc.)

**Response (200):**
```json
{
  "from": "USD",
  "to": "USDT",
  "rate": 0.95,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

---

### 3. Cashout (`/api/cashout`)

#### POST `/api/cashout/request`

Request cashout (withdrawal) to bank account.

**Request Body:**
```json
{
  "wallet_address": "0x...",
  "amount_usdt": "100.00",
  "fiat_currency": "USD",
  "bank_account_id": "ba_..."
}
```

**Response (200):**
```json
{
  "cashout_id": 1,
  "tx_hash": "0x...",
  "status": "pending"
}
```

#### GET `/api/cashout/balance/:address`

Get USDT balance for a wallet address.

**Response (200):**
```json
{
  "balance": "1000.00",
  "balanceFormatted": "1,000.00"
}
```

#### GET `/api/cashout/lifetime-volume/:bankAccountId`

Get lifetime total volume for a bank account (required for Stripe).

**Response (200):**
```json
{
  "totalVolume": 10000.00,
  "currency": "USD"
}
```

#### GET `/api/cashout/history/:address`

Get cashout history for a wallet address.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "cashouts": [
    {
      "id": 1,
      "amount_usdt": "100.00",
      "fiat_amount": 105.00,
      "fiat_currency": "USD",
      "status": "paid",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### GET `/api/cashout/status/:cashoutId`

Get cashout status by ID.

**Response (200):**
```json
{
  "id": 1,
  "status": "paid",
  "tx_hash_onchain": "0x...",
  "payout_id_stripe": "po_...",
  "created_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:05:00Z"
}
```

#### POST `/api/cashout/create-account`

Create Stripe connected account with bank account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "accountHolderName": "John Doe",
  "currency": "USD",
  "country": "US"
}
```

**Response (200):**
```json
{
  "connectedAccountId": "acct_...",
  "bankAccountId": "ba_..."
}
```

---

### 4. Bank Accounts (`/api/bank-accounts`)

#### GET `/api/bank-accounts`

List bank accounts for an email address.

**Query Parameters:**
- `email`: User email address

**Response (200):**
```json
{
  "bankAccounts": [
    {
      "id": 1,
      "email": "user@example.com",
      "connectedAccountId": "acct_...",
      "bankAccountId": "ba_...",
      "currency": "USD",
      "country": "US",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/bank-accounts`

Create or update bank account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "connectedAccountId": "acct_...",
  "bankAccountId": "ba_...",
  "currency": "USD",
  "country": "US"
}
```

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "connectedAccountId": "acct_...",
  "bankAccountId": "ba_...",
  "currency": "USD",
  "country": "US"
}
```

---

### 5. Recipients (`/api/recipients`)

#### GET `/api/recipients/:userWalletAddress`

Get saved recipients for a wallet address.

**Response (200):**
```json
{
  "recipients": [
    {
      "id": 1,
      "recipient_address": "0x...",
      "recipient_name": "John Doe",
      "recipient_email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST `/api/recipients`

Create a new recipient.

**Request Body:**
```json
{
  "user_wallet_address": "0x...",
  "recipient_address": "0x...",
  "recipient_name": "John Doe",
  "recipient_email": "john@example.com"
}
```

**Response (200):**
```json
{
  "id": 1,
  "recipient_address": "0x...",
  "recipient_name": "John Doe",
  "recipient_email": "john@example.com"
}
```

#### PUT `/api/recipients/:id`

Update a recipient.

**Request Body:**
```json
{
  "recipient_name": "Jane Doe",
  "recipient_email": "jane@example.com"
}
```

**Response (200):**
```json
{
  "id": 1,
  "recipient_address": "0x...",
  "recipient_name": "Jane Doe",
  "recipient_email": "jane@example.com"
}
```

#### DELETE `/api/recipients/:id`

Delete a recipient.

**Response (200):**
```json
{
  "success": true
}
```

---

### 6. Activity History (`/api/activity-history`)

#### POST `/api/activity-history/log`

Log a user activity (send, deposit, withdraw).

**Request Body:**
```json
{
  "wallet_address": "0x...",
  "activity_type": "send",
  "token_symbol": "AlphaUSD",
  "amount": "100.00",
  "amount_fiat": 100.00,
  "currency": "USD",
  "tx_hash": "0x...",
  "from_address": "0x...",
  "to_address": "0x...",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "id": 1,
  "success": true
}
```

#### GET `/api/activity-history`

Get activity history for a wallet address.

**Query Parameters:**
- `wallet_address`: Wallet address (required)
- `limit` (optional): Number of results (default: 50)

**Response (200):**
```json
{
  "activities": [
    {
      "id": 1,
      "wallet_address": "0x...",
      "activity_type": "send",
      "token_symbol": "AlphaUSD",
      "amount": "100.00",
      "amount_fiat": 100.00,
      "currency": "USD",
      "tx_hash": "0x...",
      "from_address": "0x...",
      "to_address": "0x...",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### 7. Key Manager (`/api/key-manager`)

These endpoints implement the Tempo SDK KeyManager HTTP contract for Passkey management.

#### GET `/api/key-manager/challenge`

Get a challenge for WebAuthn.

**Response (200):**
```json
{
  "challenge": "random-challenge-string"
}
```

#### GET `/api/key-manager/:credentialId`

Get public key for a credential ID.

**Response (200):**
```json
{
  "publicKey": "0x..."
}
```

#### POST `/api/key-manager/:credentialId`

Store public key for a credential ID.

**Request Body:**
```json
{
  "publicKey": "0x..."
}
```

**Response (200):**
```json
{
  "success": true
}
```

---

### 8. User Wallet Links (`/api/user-wallet-links`)

#### POST `/api/user-wallet-links`

Link a wallet address to an email address (1:1 relationship).

**Request Body:**
```json
{
  "email": "user@example.com",
  "wallet_address": "0x..."
}
```

**Response (200):**
```json
{
  "success": true,
  "email": "user@example.com",
  "wallet_address": "0x..."
}
```

**Error Responses:**
- `409`: Wallet already linked to different email, or email already linked to different wallet

---

### 9. Webhooks (`/api/webhooks`)

#### POST `/api/webhooks/stripe`

Stripe webhook endpoint (handles payment and payout events).

**Note**: This endpoint expects raw body (not JSON) for signature verification.

**Events Handled:**
- `payment_intent.succeeded`: Transfer USDT to user wallet
- `payment_intent.payment_failed`: Update payment status
- `payment_intent.canceled`: Update payment status
- `payout.paid`: Update cashout status
- `payout.failed`: Update cashout status
- `payout.canceled`: Update cashout status

**Response (200):**
```json
{
  "received": true
}
```

---

### 10. Health Check

#### GET `/health`

Health check endpoint.

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message"
}
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad Request (invalid input)
- `401`: Unauthorized
- `404`: Not Found
- `409`: Conflict (e.g., duplicate wallet/email link)
- `500`: Internal Server Error

## Rate Limiting

All `/api/*` endpoints are rate-limited to prevent abuse:
- Default: 100 requests per 15 minutes per IP
- Adjustable via environment variables

## Database Schema

The backend uses the following main tables:

- `employees`: User/employee records
- `payrolls`: Payroll transactions
- `cashouts`: Withdrawal/cashout records
- `payments`: Deposit/payment records
- `recipients`: Saved recipient addresses
- `bank_accounts`: Bank account mappings
- `user_wallet_links`: Email ↔ wallet address links (1:1)
- `webauthn_credentials`: Passkey public keys
- `webauthn_challenges`: WebAuthn challenges
- `activity_history`: User activity logs
- `exchange_rates`: Cached exchange rates

## Security Features

1. **Rate Limiting**: Prevents API abuse
2. **CORS**: Configurable allowed origins
3. **Helmet**: Security headers
4. **Input Validation**: Using Zod schemas
5. **SQL Injection Protection**: Parameterized queries
6. **Webhook Signature Verification**: Stripe webhook verification
7. **Error Handling**: Proper error responses without leaking sensitive info

## Logging

The backend uses Winston for logging:
- Logs are written to files: `error.log` and `combined.log`
- Console output in development mode
- Log levels: `error`, `warn`, `info`, `debug`

## Environment Variables

See `DEPLOYMENT.md` for required environment variables.

## Development

### Running Locally

```bash
npm install
npm run dev
```

### Building

```bash
npm run build
```

### Database Initialization

```bash
npm run init-db
```

## Support

For issues or questions, please refer to the main project documentation or contact the development team.

