import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, currency, walletAddress } = body ?? {};

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 },
      );
    }

    if (!amount || Number.isNaN(Number(amount))) {
      return NextResponse.json(
        { error: 'amount is required and must be a number' },
        { status: 400 },
      );
    }

    const fiatCurrency =
      typeof currency === 'string' && currency.length > 0
        ? currency.toLowerCase()
        : 'usd';

    const resp = await fetch(
      `${BACKEND_URL}/api/payment/create-intent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency: fiatCurrency,
          walletAddress,
        }),
      },
    );

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data.error || 'Backend error when creating payment intent' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/payment/create-intent] error', error);
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 },
    );
  }
}


