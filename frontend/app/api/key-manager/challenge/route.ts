import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    // Get hostname from request headers (for Vercel/production)
    const hostname = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    const rpId = hostname.replace(/:\d+$/, '').replace(/^https?:\/\//, ''); // Remove port and protocol
    
    const url = new URL(`${BACKEND_URL}/api/key-manager/challenge`);
    if (rpId) {
      url.searchParams.set('hostname', rpId);
    }
    
    const resp = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Failed to get WebAuthn challenge' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[key-manager/challenge] GET error', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 },
    );
  }
}


