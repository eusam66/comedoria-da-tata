import supabase from '../supabase';
import { RestaurantSettingsRow } from '../types';

export const settingsRepo = {
  async get(): Promise<RestaurantSettingsRow | null> {
    const { data, error } = await supabase.from('restaurant_settings').select('*').limit(1).maybeSingle();
    if (error) throw error;
    return (data as RestaurantSettingsRow) ?? null;
  },
  async upsert(payload: Partial<RestaurantSettingsRow>) {
    // If you expect only one row, you can upsert using a fixed id or use UPSERT behaviour
    const { data, error } = await supabase.from('restaurant_settings').upsert([payload], { onConflict: 'id' }).select().maybeSingle();
    if (error) throw error;
    return (data as RestaurantSettingsRow) ?? null;
  }
};
