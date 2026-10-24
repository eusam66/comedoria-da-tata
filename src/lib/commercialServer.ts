import { createHash } from 'node:crypto';
import supabaseAdmin from './supabaseAdmin';
import {
  EMPTY_COMMERCIAL,
  publicCommercial,
  validateCommercial,
  type Commercial,
  type PublicCommerce,
} from './commercial';
import { normalizeOpeningHours } from './storeHours';
import { BUSINESS_WHATSAPP_PHONE } from './whatsapp';
const revision = (value: unknown) =>
  createHash('sha256')
    .update(JSON.stringify(value ?? {}))
    .digest('hex');
export async function readCommercialAdmin() {
  if (!supabaseAdmin) throw new Error('Conteúdo comercial indisponível.');
  const { data, error } = await (supabaseAdmin as any)
    .from('restaurant_settings')
    .select('value')
    .eq('key', 'commercial')
    .maybeSingle();
  if (error) throw error;
  return {
    value: { ...EMPTY_COMMERCIAL, ...data?.value } as Commercial,
    revision: revision(data?.value),
    raw: data?.value,
  };
}
export async function saveCommercial(input: unknown, expectedRevision: unknown) {
  const current = await readCommercialAdmin();
  if (expectedRevision !== current.revision) throw new Error('SETTINGS_CHANGED');
  const value = validateCommercial(input, current.value);
  const query = (supabaseAdmin as any).from('restaurant_settings');
  const response =
    current.raw == null
      ? await query.insert({ key: 'commercial', value }).select('value').single()
      : await query
          .update({ value })
          .eq('key', 'commercial')
          .eq('value', JSON.stringify(current.raw))
          .select('value')
          .maybeSingle();
  if (response.error?.code === '23505' || (!response.error && !response.data))
    throw new Error('SETTINGS_CHANGED');
  if (response.error) throw response.error;
  return { value: response.data.value as Commercial, revision: revision(response.data.value) };
}
export async function getPublicCommerce(): Promise<PublicCommerce> {
  const base = {
    ...publicCommercial(EMPTY_COMMERCIAL),
    name: 'Comedoria da Tata',
    phone: BUSINESS_WHATSAPP_PHONE,
    address: '',
    neighborhood: '',
    deliveryTime: '',
    deliveryEnabled: false,
    pickupEnabled: false,
    orderNotice: '',
    zones: [],
    openingHours: [],
  };
  if (!supabaseAdmin) return base;
  const [settings, zones] = await Promise.all([
    (supabaseAdmin as any)
      .from('restaurant_settings')
      .select('key,value')
      .in('key', ['storefront', 'commercial']),
    (supabaseAdmin as any)
      .from('delivery_zones')
      .select('id,name,fee')
      .eq('is_active', true)
      .order('position')
      .order('name'),
  ]);
  if (settings.error) {
    console.error('commercial read unavailable');
    return base;
  }
  const store = settings.data?.find((r: any) => r.key === 'storefront')?.value || {};
  const value = settings.data?.find((r: any) => r.key === 'commercial')?.value || EMPTY_COMMERCIAL;
  // Nunca serializar dados administrativos ou comprovantes de consentimento.
  const content = publicCommercial({ ...EMPTY_COMMERCIAL, ...value });
  const plain = (v: unknown, max = 1200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  return {
    ...content,
    name: plain(store.name, 120) || base.name,
    phone: plain(store.phone, 30) || base.phone,
    address: plain(store.address, 300),
    neighborhood: plain(store.neighborhood, 120),
    deliveryTime: plain(store.deliveryTime, 120),
    orderNotice: plain(store.orderNotice),
    deliveryEnabled: store.deliveryEnabled !== false,
    pickupEnabled: store.pickupEnabled !== false,
    zones: zones.error
      ? []
      : (zones.data || [])
          .filter((z: any) => Number.isFinite(Number(z.fee)) && Number(z.fee) >= 0)
          .map((z: any) => ({ id: z.id, name: z.name, fee: Number(z.fee) })),
    openingHours: Object.entries(normalizeOpeningHours(store.openingHours))
      .filter(([, v]) => v.enabled)
      .map(([day, v]) => ({ day, open: v.open, close: v.close })),
  };
}
