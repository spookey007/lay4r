import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Mock L4 price - replace with actual price fetching logic
    const l4Price = 0.0001; // $0.0001 per L4 token
    
    return NextResponse.json({ price: l4Price });
  } catch (error) {
    console.error('Error fetching L4 price:', error);
    return NextResponse.json({ error: 'Failed to fetch L4 price' }, { status: 500 });
  }
}
