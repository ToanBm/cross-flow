import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL =
  process.env.NEXT_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  'http://localhost:4000';

export async function GET(
  _request: NextRequest,
  context: { params: { credentialId: string } },
) {
  try {
    const id = context.params.credentialId;
    const resp = await fetch(`${BACKEND_URL}/api/key-manager/${encodeURIComponent(id)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 },
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Failed to get credential public key' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[key-manager] GET error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { credentialId: string } },
) {
  try {
    const id = context.params.credentialId;
    const body = await request.json();
    
    // Get hostname from request headers (for Vercel/production)
    const hostHeader = request.headers.get('host') || request.headers.get('x-forwarded-host') || '';
    // Remove port and protocol, get clean domain
    const rpId = hostHeader.split(':')[0].replace(/^https?:\/\//, '');
    
    const url = new URL(`${BACKEND_URL}/api/key-manager/${encodeURIComponent(id)}`);
    if (rpId) {
      url.searchParams.set('hostname', rpId);
    }
    
    const resp = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      next: { revalidate: 0 },
      body: JSON.stringify(body),
    });

    if (resp.status === 204) {
      return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return NextResponse.json(
        { error: (data as any).error || 'Failed to store credential public key' },
        { status: resp.status },
      );
    }

    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    console.error('[key-manager] POST error', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}


