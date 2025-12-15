import { NextRequest, NextResponse } from 'next/server';

// Avoid Next.js caching for this proxy route (we want fresh backend data)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Use server-side backend URL (avoid NEXT_PUBLIC_BACKEND_URL pointing to the Next app itself)
const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(
  request: NextRequest,
  { params }: { params: { bankAccountId: string } }
) {
  try {
    const { bankAccountId } = params;

    if (!bankAccountId) {
      return NextResponse.json(
        { error: 'Bank account ID is required' },
        { status: 400 }
      );
    }

    // Decode bankAccountId (có thể bị encode từ URL)
    const decodedBankAccountId = decodeURIComponent(bankAccountId);

    // Add timeout for backend request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
    
    const response = await fetch(
      `${BACKEND_URL}/api/cashout/lifetime-volume/${encodeURIComponent(decodedBankAccountId)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        next: { revalidate: 0 },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Failed to get lifetime volume' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[Next.js API] Error proxying lifetime volume:', error);
    
    // Handle timeout or abort
    if (error.name === 'AbortError' || error.message?.includes('aborted')) {
      return NextResponse.json(
        { error: 'Backend request timeout. Please check if backend server is running.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

