import supabaseAdmin from './supabaseAdmin';
import { calculateStoreStatus, type StorefrontSettings } from './storeHours';

export async function getStorefrontSettings(): Promise<StorefrontSettings> {
  if (!supabaseAdmin) throw new Error('Configurações de funcionamento indisponíveis.');
  const { data, error } = await (supabaseAdmin as any)
    .from('restaurant_settings')
    .select('key,value')
    .in('key', ['storefront', 'order_operations']);
  if (error) throw error;
  const settings = data?.find((row: any) => row.key === 'storefront')?.value || {};
  const orderOverride = data?.find((row: any) => row.key === 'order_operations')?.value;
  return { ...settings, ...(orderOverride ? { orderOverride } : {}) };
}

export async function getCurrentStoreStatus(now?: Date) {
  const settings = await getStorefrontSettings();
  const status = calculateStoreStatus(settings, now ?? new Date());
  return { ...status, mode: status.mode ?? (status.temporarilyClosed ? 'closed' : 'automatic'), expiresAt: status.expiresAt ?? null };
}

