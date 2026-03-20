import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

type ParamsType = { uuid: string; };

export async function GET(req: Request, context: { params: ParamsType } | any) {
  try {
    const params = await context.params;
    
    if (!params?.uuid) {
      return NextResponse.json({ error: 'Missing UUID' }, { status: 400 });
    }

    const db = await openDb();
    
    // Fetch last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const history = await db.all(
      `SELECT * FROM price_history 
       WHERE player_uuid = ? AND timestamp >= ? 
       ORDER BY timestamp ASC`,
      [params.uuid, thirtyDaysAgo.toISOString()]
    );
    
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
