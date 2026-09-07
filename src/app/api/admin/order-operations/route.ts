import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthSafe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { getCurrentStoreStatus } from '@/lib/storeSettings';
import { STORE_TIMEZONE } from '@/lib/storeHours';

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { mode, until } = await req.json();
    if (!['automatic', 'open', 'closed'].includes(mode)) {
      return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 });
    }
    const now = new Date();
    let expiresAt: string | null = null;
    if (mode === 'open') {
      if (typeof until !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(until)) {
        return NextResponse.json({ error: 'Informe um horário válido.' }, { status: 400 });
      }
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone: STORE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const part = (type: string) => parts.find(p => p.type === type)?.value;
      // America/Recife uses UTC-03:00 year-round.
      const expiry = new Date(`${part('year')}-${part('month')}-${part('day')}T${until}:00-03:00`);
      if (expiry.getTime() <= now.getTime()) {
        return NextResponse.json({ error: 'Escolha um horário posterior ao horário atual de hoje.' }, { status: 400 });
      }
      expiresAt = expiry.toISOString();
    }
    if (!supabaseAdmin) throw new Error('Configurações indisponíveis.');
    const { error } = await (supabaseAdmin as any).from('restaurant_settings').upsert({
      key: 'order_operations', value: { mode, expiresAt, updated_at: now.toISOString() },
    }, { onConflict: 'key' });
    if (error) throw error;
    return NextResponse.json(await getCurrentStoreStatus(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? 'Não foi possível atualizar o funcionamento.' : error.message }, { status });
  }
}
