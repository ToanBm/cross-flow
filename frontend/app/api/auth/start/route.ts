import { NextResponse } from 'next/server';
import { otpStore } from '../../../../lib/otpStore';

// Use server-side backend URL (avoid NEXT_PUBLIC_BACKEND_URL pointing to the Next app itself)
const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = (body.email as string | undefined)?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 },
      );
    }

    // Call backend API to send OTP
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return NextResponse.json(
          { error: data.error || 'Không gửi được OTP' },
          { status: response.status },
        );
      }

      // NEVER store or return OTP - it's only sent via email
      // Backend will return error if email fails
      return NextResponse.json({
        ok: true,
        email: data.email,
        expiresInSeconds: data.expiresInSeconds || 300,
        emailSent: true,
        message: data.message || 'OTP was sent to your email. Please check your inbox.',
      });
    } catch (fetchError: any) {
      console.error('[auth/start] Backend API error:', fetchError);
      
      // No fallback - return error if backend is unavailable
      return NextResponse.json(
        { error: 'Unable to connect to the server. Please try again later.' },
        { status: 503 },
      );
    }
  } catch (error) {
    console.error('[auth/start] error', error);
    return NextResponse.json(
      { error: 'Server error while creating OTP' },
      { status: 500 },
    );
  }
}
