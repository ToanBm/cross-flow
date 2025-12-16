import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use server-side backend URL (avoid NEXT_PUBLIC_BACKEND_URL pointing to the Next app itself)
const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currency = searchParams.get('currency');
    const token_symbol = searchParams.get('token_symbol');

    if (!currency) {
      return NextResponse.json(
        { error: 'currency parameter is required' },
        { status: 400 }
      );
    }

    // Build query string
    const queryParams = new URLSearchParams();
    queryParams.set('currency', currency);
    if (token_symbol) {
      queryParams.set('token_symbol', token_symbol);
    }

    const url = `${BACKEND_URL}/api/payment/exchange-rate?${queryParams.toString()}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      next: { revalidate: 0 },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.error('[Next.js API] Backend error:', resp.status, data);
      return NextResponse.json(
        { error: (data as any).error || 'Failed to get exchange rate' },
        { status: resp.status }
      );
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying exchange-rate:', error);
    
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return NextResponse.json(
        { error: 'Backend request timeout' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

