import { v4 as uuidv4 } from 'uuid';
import { generateOrderCode } from './orders';
import supabaseAdmin from './supabaseAdmin';
import { slugify } from './slug';
import { removeStorageFileByPublicUrl } from './storageAdmin';

function adminClient(): any {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin as any;
}

// Admin API backed by Supabase (server-side client). Assumes the following tables exist:
// categories (id uuid primary key, name text, image text)
// dishes (id uuid primary key, code text, name text, slug text, description text, price numeric, image_url text, category_id uuid, ingredients text[], serves int, is_featured boolean, is_new boolean, extras jsonb, created_at timestamptz)
// banners (id uuid primary key, title text, subtitle text, image text)
// orders (id uuid primary key, code text, items jsonb, total numeric, status text, created_at timestamptz, customer jsonb)

export async function adminListCategories() {
  const { data, error } = await adminClient().from('categories').select('*').order('position', { ascending: true }).order('name');
  if (error) throw error;
  return data;
}

export async function adminCreateCategory(payload: { name: string; slug?: string; description?: string; image?: string; position?: number; isActive?: boolean }) {
  const id = uuidv4();
  const { data, error } = await adminClient().from('categories').insert([{
    id,
    name: payload.name,
    slug: payload.slug || slugify(payload.name),
    description: payload.description || null,
    image_url: payload.image || null,
    position: payload.position || 0,
    is_active: payload.isActive ?? true
  }]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateCategory(id: string, payload: { name?: string; slug?: string; description?: string; image?: string; position?: number; isActive?: boolean }) {
  const current = await adminClient().from('categories').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const patch: any = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.slug !== undefined) patch.slug = payload.slug || slugify(payload.name || '');
  if (payload.description !== undefined) patch.description = payload.description || null;
  if (payload.image !== undefined) patch.image_url = payload.image || null;
  if (payload.position !== undefined) patch.position = payload.position;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  const { data, error } = await adminClient().from('categories').update(patch).eq('id', id).select().single();
  if (error) throw error;
  const previousImage = current.data?.image_url || null;
  if (payload.image !== undefined && previousImage && previousImage !== data.image_url) {
    await removeStorageFileByPublicUrl(previousImage);
  }
  return data;
}

export async function adminDeleteCategory(id: string) {
  const current = await adminClient().from('categories').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const { error } = await adminClient().from('categories').delete().eq('id', id);
  if (error) throw error;
  // detach category from dishes (set null)
  await adminClient().from('dishes').update({ category_id: null }).eq('category_id', id);
  await removeStorageFileByPublicUrl(current.data?.image_url || null);
  return true;
}

export async function adminListDishes() {
  const { data, error } = await adminClient().from('dishes').select('*').order('position', { ascending: true }).order('created_at', { ascending: false });
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
    image_url: payload.image || null,
    category_id: payload.categoryId || null,
    ingredients: payload.ingredients || null,
    serves: payload.servings || null,
    is_featured: payload.popular || false,
    is_new: payload.isNew || false,
    extras: payload.extras || null,
    is_available: payload.isAvailable ?? true,
    position: payload.position || 0
  };
  const { data, error } = await adminClient().from('dishes').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateDish(id: string, payload: any) {
  const current = await adminClient().from('dishes').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const patch: any = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.slug !== undefined) patch.slug = payload.slug;
  if (payload.description !== undefined) patch.description = payload.description;
  if (payload.price !== undefined) patch.price = payload.price;
  if (payload.image !== undefined) patch.image_url = payload.image;
  if (payload.categoryId !== undefined) patch.category_id = payload.categoryId;
  if (payload.ingredients !== undefined) patch.ingredients = payload.ingredients;
  if (payload.servings !== undefined) patch.serves = payload.servings;
  if (payload.popular !== undefined) patch.is_featured = payload.popular;
  if (payload.isNew !== undefined) patch.is_new = payload.isNew;
  if (payload.extras !== undefined) patch.extras = payload.extras;
  if (payload.isAvailable !== undefined) patch.is_available = payload.isAvailable;
  if (payload.position !== undefined) patch.position = payload.position;
  const { data, error } = await adminClient().from('dishes').update(patch).eq('id', id).select().single();
  if (error) throw error;
  const previousImage = current.data?.image_url || null;
  if (payload.image !== undefined && previousImage && previousImage !== data.image_url) {
    await removeStorageFileByPublicUrl(previousImage);
  }
  return data;
}

export async function adminDeleteDish(id: string) {
  const current = await adminClient().from('dishes').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const { error } = await adminClient().from('dishes').delete().eq('id', id);
  if (error) throw error;
  await removeStorageFileByPublicUrl(current.data?.image_url || null);
  return true;
}

export async function adminListBanners() {
  const { data, error } = await adminClient().from('banners').select('*').order('position', { ascending: true }).order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateBanner(payload: any) {
  const id = uuidv4();
  const row = {
    id,
    title: payload.title,
    subtitle: payload.subtitle || null,
    image_url: payload.image || null,
    link: payload.link || '/',
    alt: payload.alt || payload.title || 'Banner promocional',
    position: payload.position || 0,
    active: payload.active ?? true
  };
  const { data, error } = await adminClient().from('banners').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminUpdateBanner(id: string, payload: any) {
  const current = await adminClient().from('banners').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const patch: any = {};
  if (payload.title !== undefined) patch.title = payload.title;
  if (payload.subtitle !== undefined) patch.subtitle = payload.subtitle || null;
  if (payload.image !== undefined) patch.image_url = payload.image || null;
  if (payload.link !== undefined) patch.link = payload.link || '/';
  if (payload.alt !== undefined) patch.alt = payload.alt || null;
  if (payload.position !== undefined) patch.position = payload.position;
  if (payload.active !== undefined) patch.active = payload.active;
  const { data, error } = await adminClient().from('banners').update(patch).eq('id', id).select().single();
  if (error) throw error;
  const previousImage = current.data?.image_url || null;
  if (payload.image !== undefined && previousImage && previousImage !== data.image_url) {
    await removeStorageFileByPublicUrl(previousImage);
  }
  return data;
}

export async function adminDeleteBanner(id: string) {
  const current = await adminClient().from('banners').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const { error } = await adminClient().from('banners').delete().eq('id', id);
  if (error) throw error;
  await removeStorageFileByPublicUrl(current.data?.image_url || null);
  return true;
}

export async function adminGetStoreSettings() {
  const { data, error } = await adminClient().from('restaurant_settings').select('*').eq('key', 'storefront').maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateStoreSettings(payload: any) {
  const row = {
    key: 'storefront',
    value: payload
  };
  const { data, error } = await adminClient()
    .from('restaurant_settings')
    .upsert(row, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  return data;
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
  const { data, error } = await adminClient().from('orders').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminListOrders() {
  const { data, error } = await adminClient().from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetOrderByCode(code: string) {
  const { data, error } = await adminClient().from('orders').select('*').eq('code', code).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateOrderStatus(code: string, status: Order['status']) {
  const { data, error } = await adminClient().from('orders').update({ status }).eq('code', code).select().single();
  if (error) throw error;
  return data;
}
