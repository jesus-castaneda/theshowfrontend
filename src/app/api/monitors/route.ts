import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

export async function GET() {
  try {
    const db = await openDb();
    const monitors = await db.all(`
      SELECT m.*, 
             (SELECT buy_price FROM price_history ph WHERE ph.player_uuid = m.player_uuid ORDER BY timestamp DESC LIMIT 1) as current_buy,
             (SELECT sell_price FROM price_history ph WHERE ph.player_uuid = m.player_uuid ORDER BY timestamp DESC LIMIT 1) as current_sell
      FROM monitors m
    `);
    return NextResponse.json(monitors);
  } catch (error) {
    console.error('Error fetching monitors:', error);
    return NextResponse.json({ error: 'Failed to fetch monitors' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { player_uuid, player_name, interval_minutes = 5, profit_threshold = 0, drop_threshold_pct = 0 } = body;
    
    if (!player_uuid || !player_name) {
      return NextResponse.json({ error: 'Missing logic' }, { status: 400 });
    }

    const db = await openDb();
    await db.run(
      `INSERT INTO monitors (player_uuid, player_name, interval_minutes, profit_threshold, drop_threshold_pct) 
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(player_uuid) DO UPDATE SET 
       interval_minutes=excluded.interval_minutes, profit_threshold=excluded.profit_threshold, drop_threshold_pct=excluded.drop_threshold_pct`,
      [player_uuid, player_name, interval_minutes, profit_threshold, drop_threshold_pct]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating monitor:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
