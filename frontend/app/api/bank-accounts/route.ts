import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const resp = await fetch(
      `${BACKEND_URL}/api/bank-accounts?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      },
    );

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json({ error: (data as any).error || 'Failed to load bank accounts' }, { status: resp.status });
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[bank-accounts] GET error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resp = await fetch(`${BACKEND_URL}/api/bank-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json({ error: (data as any).error || 'Failed to save bank account' }, { status: resp.status });
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[bank-accounts] POST error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}


