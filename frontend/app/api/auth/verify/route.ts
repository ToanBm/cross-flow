import { NextResponse } from 'next/server';

// Use server-side backend URL (avoid NEXT_PUBLIC_BACKEND_URL pointing to the Next app itself)
const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    const otp = (body.otp as string | undefined)?.trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      );
    }

    if (!otp || otp.length !== 6) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 },
      );
    }

    // Verify OTP via backend (email-based OTP)
    const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Incorrect OTP' },
        { status: response.status },
      );
    }

    const userId = `user_${Math.random().toString(36).slice(2, 10)}`;
    const name = email.split('@')[0] || 'Tempo User';

    const user = {
      id: userId,
      email,
      name,
      balanceUSDC: 0,
      kycVerified: true,
    };

    return NextResponse.json({ user });
  } catch (error) {
    console.error('[auth/verify] error', error);
    return NextResponse.json(
      { error: 'Server error while verifying OTP' },
      { status: 500 },
    );
  }
}
