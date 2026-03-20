import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  // Construct the MLB API URL
  const mlbUrl = new URL('https://mlb26.theshow.com/apis/listings.json');
  
  // Forward all query parameters
  searchParams.forEach((value, key) => {
    mlbUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(mlbUrl.toString());
    
    if (!response.ok) {
      throw new Error(`MLB API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching listings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketplace listings' }, 
      { status: 500 }
    );
  }
}
