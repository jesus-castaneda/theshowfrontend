import { NextResponse } from 'next/server';
import { openDb } from '@/lib/db';

type ParamsType = { uuid: string; };

export async function DELETE(req: Request, context: { params: ParamsType } | any) {
  try {
    // Await params safely for Next.js 15
    const params = await context.params;
    
    if (!params?.uuid) {
      return NextResponse.json({ error: 'Missing UUID' }, { status: 400 });
    }

    const db = await openDb();
    await db.run('DELETE FROM monitors WHERE player_uuid = ?', [params.uuid]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete monitor' }, { status: 500 });
  }
}
