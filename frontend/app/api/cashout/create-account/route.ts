import { NextResponse } from 'next/server';

const BACKEND_URL =
  process.env.BACKEND_URL || 'http://localhost:4000';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const resp = await fetch(
      `${BACKEND_URL}/api/cashout/create-bank-account`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    );

    const data = await resp.json();

    if (!resp.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to create bank account' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[api/cashout/create-account] error', error);
    return NextResponse.json(
      { error: 'Failed to create bank account' },
      { status: 500 },
    );
  }
}


