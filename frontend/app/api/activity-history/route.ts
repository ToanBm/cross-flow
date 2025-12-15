import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet_address');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    if (!walletAddress) {
      return NextResponse.json({ error: 'wallet_address is required' }, { status: 400 });
    }

    const resp = await fetch(
      `${BACKEND_URL}/api/activity-history?wallet_address=${encodeURIComponent(walletAddress)}&limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Failed to load activity history' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[activity-history] GET error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

