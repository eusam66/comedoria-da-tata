import { supabase } from './supabase';

export type Category = { id: string; name: string; image?: string };
export type Dish = {
  id: string;
  code: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  image?: string | null;
  categoryId?: string | null;
  ingredients?: string[] | null;
  servings?: number | null;
  popular?: boolean | null;
  isNew?: boolean | null;
};

function mapDishRow(row: any): Dish {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    image: row.image || null,
    categoryId: row.category_id || null,
    ingredients: row.ingredients || null,
    servings: row.servings || null,
    popular: row.popular || null,
    isNew: row.is_new || null
  };
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from('categories').select('*').order('name');
  if (error) {
    console.error('getCategories error', error);
    return [];
  }
  return (data || []) as Category[];
}

export async function getDishes(): Promise<Dish[]> {
  const { data, error } = await supabase.from('dishes').select('*').order('name');
  if (error) {
    console.error('getDishes error', error);
    return [];
  }
  return (data || []).map(mapDishRow);
}

export async function getDishBySlug(slug: string): Promise<Dish | undefined> {
  const { data, error } = await supabase.from('dishes').select('*').eq('slug', slug).limit(1).maybeSingle();
  if (error) {
    console.error('getDishBySlug error', error);
    return undefined;
  }
  if (!data) return undefined;
  return mapDishRow(data);
}

export async function searchDishes(query: { q?: string; categoryId?: string }): Promise<Dish[]> {
  const q = query.q?.trim();
  let builder = supabase.from('dishes').select('*');
  if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
  if (q && q.length > 0) {
    // buscar por nome ou descrição (ilike)
    const like = `%${q}%`;
    // Supabase "or" accepts a comma-separated list of filters
    builder = builder.or(`name.ilike.${like},description.ilike.${like},ingredients.ilike.${like}`);
  }
  const { data, error } = await builder.order('name');
  if (error) {
    console.error('searchDishes error', error);
    return [];
  }
  return (data || []).map(mapDishRow);
}
