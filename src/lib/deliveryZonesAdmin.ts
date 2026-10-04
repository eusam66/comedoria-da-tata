import supabaseAdmin from './supabaseAdmin';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isZoneId, validateZonePayload, ZoneValidationError } from './deliveryZones';
import type { AdminDeliveryZone } from './deliveryZones';

type ZoneDatabase = {
  public: {
    Tables: {
      delivery_zones: {
        Row: AdminDeliveryZone & { created_at: string; updated_at: string };
        Insert: { name: string; fee: string; is_active?: boolean; position?: number };
        Update: { name?: string; fee?: string; is_active?: boolean; position?: number };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

function client() {
  if (!supabaseAdmin) throw new Error('Localizações temporariamente indisponíveis.');
  return supabaseAdmin as unknown as SupabaseClient<ZoneDatabase>;
}

export async function listDeliveryZones(activeOnly = false) {
  let query = client().from('delivery_zones')
    .select('id,name,fee,is_active,position')
    .order('position').order('name').order('id');
  if (activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => activeOnly
    ? { id: row.id, name: row.name, fee: Number(row.fee) }
    : { ...row, fee: Number(row.fee) });
}

export async function saveDeliveryZone(payload: unknown, id?: string): Promise<AdminDeliveryZone> {
  if (id !== undefined && !isZoneId(id)) throw new ZoneValidationError('Localização inválida.');
  const patch = validateZonePayload(payload, id !== undefined);
  const query = id === undefined
    ? client().from('delivery_zones').insert(patch as ZoneDatabase['public']['Tables']['delivery_zones']['Insert'])
    : client().from('delivery_zones').update(patch).eq('id', id);
  const { data, error } = await query.select('id,name,fee,is_active,position').single();
  if (error) throw error;
  return { ...data, fee: Number(data.fee) } as AdminDeliveryZone;
}
