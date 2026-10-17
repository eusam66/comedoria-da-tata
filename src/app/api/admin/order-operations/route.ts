import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/adminAuthSafe';
import supabaseAdmin from '@/lib/supabaseAdmin';
import { getCurrentStoreStatus } from '@/lib/storeSettings';

export async function PUT(req: Request) {
  try {
    await requireAdmin(req);
    const { mode } = await req.json();
    if (!['automatic', 'open', 'closed'].includes(mode)) {
      return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 });
    }
    if (!supabaseAdmin) throw new Error('Configurações indisponíveis.');
    const client = supabaseAdmin as any;
    const { data: previous, error: readError } = await client.from('restaurant_settings')
      .select('value').eq('key', 'order_operations').maybeSingle();
    if (readError) throw readError;
    const value = previous?.value && typeof previous.value === 'object' && !Array.isArray(previous.value)
      ? previous.value : {};
    const { error } = await client.from('restaurant_settings').upsert({
      // Preserva metadados existentes, inclusive updated_at; só muda a operação.
      key: 'order_operations', value: { ...value, mode, expiresAt: null },
    }, { onConflict: 'key' });
    if (error) throw error;
    return NextResponse.json(await getCurrentStoreStatus(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const status = error.message === 'Forbidden' ? 403 : error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: status === 500 ? 'Não foi possível atualizar o funcionamento.' : error.message }, { status });
  }
}
