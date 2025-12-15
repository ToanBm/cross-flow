import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

export async function GET() {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/payment/offramp-balance`, {
      method: 'GET',
    });

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to load offramp balance' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/payment/offramp-balance] error', error);
    return NextResponse.json(
      { error: 'Failed to load offramp balance' },
      { status: 500 },
    );
  }
}


