import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('https://mlb26.theshow.com/apis/meta_data.json');
    
    if (!response.ok) {
      throw new Error(`MLB API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching meta data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meta data' }, 
      { status: 500 }
    );
  }
}
