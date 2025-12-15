import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const resp = await fetch(`${BACKEND_URL}/api/activity-history/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(body),
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Failed to log activity' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[activity-history/log] POST error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

