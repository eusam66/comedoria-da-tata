import supabaseAdmin from './supabaseAdmin';
import { calculateStoreStatus, type StorefrontSettings } from './storeHours';

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  if (!supabaseAdmin) return {};
  const { data, error } = await (supabaseAdmin as any)
    .from('restaurant_settings')
    .select('value')
    .eq('key', 'storefront')
    .maybeSingle();
  if (error) throw error;
  return data?.value && typeof data.value === 'object' ? data.value : {};
}

export async function getCurrentStoreStatus(now = new Date()) {
  return calculateStoreStatus(await getStorefrontSettings(), now);
}

