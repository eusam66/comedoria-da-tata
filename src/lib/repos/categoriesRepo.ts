import supabase from '../supabase';
import { CategoryRow } from '../types';

export const categoriesRepo = {
  async list(): Promise<CategoryRow[]> {
    const { data, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    return data as CategoryRow[];
  },
  async get(id: string): Promise<CategoryRow | null> {
    const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as CategoryRow) ?? null;
  },
  async create(payload: { name: string; image?: string | null }) {
    const { data, error } = await supabase.from('categories').insert([payload]).select().single();
    if (error) throw error;
    return data as CategoryRow;
  },
  async update(id: string, payload: Partial<CategoryRow>) {
    const { data, error } = await supabase.from('categories').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as CategoryRow;
  },
  async remove(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;
    return true;
  }
};
