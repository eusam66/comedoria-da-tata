import { v4 as uuidv4 } from 'uuid';
import { generateOrderCode } from './orders';
import supabaseAdmin from './supabaseAdmin';

// Admin API backed by Supabase (server-side client). Assumes the following tables exist:
// categories (id uuid primary key, name text, image text)
// dishes (id uuid primary key, code text, name text, slug text, description text, price numeric, image text, category_id uuid, ingredients text[], servings int, popular boolean, is_new boolean, created_at timestamptz)
// banners (id uuid primary key, title text, subtitle text, image text)
// orders (id uuid primary key, code text, items jsonb, total numeric, status text, created_at timestamptz, customer jsonb)

export async function adminListCategories() {
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('name');
  if (error) throw error;
  return data;
}

export async function adminCreateCategory(payload: { name: string; image?: string }) {
  const id = uuidv4();
  const { data, error } = await supabaseAdmin.from('categories').insert([{ id, name: payload.name, image: payload.image }]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateCategory(id: string, payload: { name?: string; image?: string }) {
  const { data, error } = await supabaseAdmin.from('categories').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteCategory(id: string) {
  const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
  if (error) throw error;
  // detach category from dishes (set null)
  await supabaseAdmin.from('dishes').update({ category_id: null }).eq('category_id', id);
  return true;
}

export async function adminListDishes() {
  const { data, error } = await supabaseAdmin.from('dishes').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateDish(payload: any) {
  const id = uuidv4();
  const code = payload.code || `D-${Date.now()}`;
  const row = {
    id,
    code,
    name: payload.name,
    slug: payload.slug,
    description: payload.description || null,
    price: payload.price || 0,
    image: payload.image || null,
    category_id: payload.categoryId || null,
    ingredients: payload.ingredients || null,
    servings: payload.servings || null,
    popular: payload.popular || false,
    is_new: payload.isNew || false
  };
  const { data, error } = await supabaseAdmin.from('dishes').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateDish(id: string, payload: any) {
  const patch: any = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.slug !== undefined) patch.slug = payload.slug;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.price !== undefined) patch.price = payload.price;
  if (payload.image !== undefined) patch.image = payload.image;
  if (payload.categoryId !== undefined) patch.category_id = payload.categoryId;
  if (payload.ingredients !== undefined) patch.ingredients = payload.ingredients;
  if (payload.servings !== undefined) patch.servings = payload.servings;
  if (payload.popular !== undefined) patch.popular = payload.popular;
  if (payload.isNew !== undefined) patch.is_new = payload.isNew;
  const { data, error } = await supabaseAdmin.from('dishes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteDish(id: string) {
  const { error } = await supabaseAdmin.from('dishes').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function adminListBanners() {
  const { data, error } = await supabaseAdmin.from('banners').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateBanner(payload: any) {
  const id = uuidv4();
  const row = { id, title: payload.title, subtitle: payload.subtitle, image: payload.image || null };
  const { data, error } = await supabaseAdmin.from('banners').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateBanner(id: string, payload: any) {
  const { data, error } = await supabaseAdmin.from('banners').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function adminDeleteBanner(id: string) {
  const { error } = await supabaseAdmin.from('banners').delete().eq('id', id);
  if (error) throw error;
  return true;
}

// Orders
export type Order = {
  id: string;
  code: string;
  items: Array<{ dishId: string; name: string; price: number; quantity: number }>;
  total: number;
  status: 'Novo' | 'Confirmado' | 'Em preparo' | 'Saiu para entrega' | 'Entregue' | 'Cancelado';
  created_at: string;
  customer?: any;
};

export async function adminCreateOrder(payload: { items: Order['items']; customer?: any }) {
  const id = uuidv4();
  const code = generateOrderCode();
  const total = (payload.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
  const row = {
    id,
    code,
    items: payload.items,
    total,
    status: 'Novo',
    customer: payload.customer || null
  };
  const { data, error } = await supabaseAdmin.from('orders').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminListOrders() {
  const { data, error } = await supabaseAdmin.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetOrderByCode(code: string) {
  const { data, error } = await supabaseAdmin.from('orders').select('*').eq('code', code).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateOrderStatus(code: string, status: Order['status']) {
  const { data, error } = await supabaseAdmin.from('orders').update({ status }).eq('code', code).select().single();
  if (error) throw error;
  return data;
}
