import supabase from '../supabase';
import { BannerRow } from '../types';

export const bannersRepo = {
  async list(): Promise<BannerRow[]> {
    const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as BannerRow[];
  },
  async get(id: string): Promise<BannerRow | null> {
    const { data, error } = await supabase.from('banners').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as BannerRow) ?? null;
  },
  async create(payload: Partial<BannerRow>) {
    const { data, error } = await supabase.from('banners').insert([payload]).select().single();
    if (error) throw error;
    return data as BannerRow;
  },
  async update(id: string, payload: Partial<BannerRow>) {
    const { data, error } = await supabase.from('banners').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as BannerRow;
  },
  async remove(id: string) {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
