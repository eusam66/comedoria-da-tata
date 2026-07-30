import supabase from '../supabase';
import { DishRow } from '../types';

export const dishesRepo = {
  async list(): Promise<DishRow[]> {
    const { data, error } = await supabase.from('dishes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as DishRow[];
  },
  async getById(id: string): Promise<DishRow | null> {
    const { data, error } = await supabase.from('dishes').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return (data as DishRow) ?? null;
  },
  async getBySlug(slug: string): Promise<DishRow | null> {
    const { data, error } = await supabase.from('dishes').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return (data as DishRow) ?? null;
  },
  async create(payload: Partial<DishRow>) {
    const { data, error } = await supabase.from('dishes').insert([payload]).select().single();
    if (error) throw error;
    return data as DishRow;
  },
  async update(id: string, payload: Partial<DishRow>) {
    const { data, error } = await supabase.from('dishes').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data as DishRow;
  },
  async remove(id: string) {
    const { error } = await supabase.from('dishes').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
  async search(q?: string, categoryId?: string) {
    let builder = supabase.from('dishes').select('*');
    if (categoryId) builder = builder.eq('category_id', categoryId);
    if (q && q.trim().length > 0) {
      const like = `%${q}%`;
      builder = builder.or(`name.ilike.${like},description.ilike.${like},ingredients.ilike.${like}`);
    }
    const { data, error } = await builder.order('name');
    if (error) throw error;
    return data as DishRow[];
  }
};
