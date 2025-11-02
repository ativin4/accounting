import { NextRequest, NextResponse } from 'next/server';

// Redirect inventory API calls to products API for backward compatibility
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const productsUrl = url.toString().replace('/api/inventory', '/api/products');

  try {
    const response = await fetch(productsUrl, {
      method: 'GET',
      headers: request.headers,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error redirecting to products API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const productsUrl = url.toString().replace('/api/inventory', '/api/products');

  try {
    const response = await fetch(productsUrl, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(await request.json()),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error redirecting to products API:', error);
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    );
  }
}
