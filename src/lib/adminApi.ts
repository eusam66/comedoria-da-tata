import { generateOrderCode } from './orders';
import supabaseAdmin from './supabaseAdmin';
import { slugify } from './slug';
import {
  removeStorageFileByPublicUrl,
  removeStorageFileByPublicUrlIfUnreferenced,
} from './storageAdmin';

function adminClient(): any {
  if (!supabaseAdmin) {
    throw new Error(
      'Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  return supabaseAdmin as any;
}

// Admin API backed by Supabase (server-side client). Assumes the following tables exist:
// categories (id uuid primary key, name text, image text)
// dishes (id uuid primary key, code text, name text, slug text, description text, price numeric, image_url text, category_id uuid, ingredients text, serves int, is_featured boolean, is_new boolean, extras jsonb, created_at timestamptz)
// banners (id uuid primary key, title text, subtitle text, image text)
// orders (id uuid primary key, code text, customer_name text, customer_phone text,
// customer_address text, items jsonb, total numeric, status text, metadata jsonb, created_at timestamptz)

export async function adminListCategories() {
  const { data, error } = await adminClient()
    .from('categories')
    .select('*')
    .order('position', { ascending: true })
    .order('name');
  if (error) throw error;
  return data;
}

export async function adminCreateCategory(payload: {
  name: string;
  slug?: string;
  description?: string;
  image?: string;
  position?: number;
  isActive?: boolean;
}) {
  const id = crypto.randomUUID();
  const { data, error } = await adminClient()
    .from('categories')
    .insert([
      {
        id,
        name: payload.name,
        slug: payload.slug || slugify(payload.name),
        description: payload.description || null,
        image_url: payload.image || null,
        position: payload.position || 0,
        is_active: payload.isActive ?? true,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateCategory(
  id: string,
  payload: {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    position?: number;
    isActive?: boolean;
  }
) {
  const current = await adminClient().from('categories').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const patch: any = {};
  if (payload.name !== undefined) patch.name = payload.name;
  if (payload.slug !== undefined) patch.slug = payload.slug || slugify(payload.name || '');
  if (payload.description !== undefined) patch.description = payload.description || null;
  if (payload.image !== undefined) patch.image_url = payload.image || null;
  if (payload.position !== undefined) patch.position = payload.position;
  if (payload.isActive !== undefined) patch.is_active = payload.isActive;
  const { data, error } = await adminClient()
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
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
  const { data, error } = await adminClient()
    .from('dishes')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateDish(payload: any) {
  const id = crypto.randomUUID();
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
    ingredients:
      typeof payload.ingredients === 'string' ? payload.ingredients.trim() || null : null,
    serves: payload.servings || null,
    is_featured: payload.popular || false,
    is_new: payload.isNew || false,
    extras: payload.extras || null,
    is_available: Number(payload.stock || 0) >= 1,
    stock: Math.max(0, Math.trunc(Number(payload.stock || 0))),
    position: payload.position || 0,
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
  if (payload.ingredients !== undefined)
    patch.ingredients =
      typeof payload.ingredients === 'string' ? payload.ingredients.trim() || null : null;
  if (payload.servings !== undefined) patch.serves = payload.servings;
  if (payload.popular !== undefined) patch.is_featured = payload.popular;
  if (payload.isNew !== undefined) patch.is_new = payload.isNew;
  if (payload.extras !== undefined) patch.extras = payload.extras;
  if (payload.stock !== undefined) {
    patch.stock = Math.max(0, Math.trunc(Number(payload.stock)));
    patch.is_available = patch.stock >= 1;
  }
  if (payload.position !== undefined) patch.position = payload.position;
  const { data, error } = await adminClient()
    .from('dishes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
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

export async function adminListBeverages() {
  const { data, error } = await adminClient()
    .from('beverages')
    .select('*')
    .order('position')
    .order('created_at');
  if (error) throw error;
  return data;
}

export async function adminCreateBeverage(payload: any) {
  const { data, error } = await adminClient()
    .from('beverages')
    .insert([
      {
        id: crypto.randomUUID(),
        name: payload.name,
        size: payload.size,
        price: Number(payload.price || 0),
        image_url: payload.image || null,
        stock: Math.max(0, Math.trunc(Number(payload.stock || 0))),
        position: Math.trunc(Number(payload.position || 0)),
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function adminUpdateBeverage(id: string, payload: any) {
  const current = await adminClient().from('beverages').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const patch: any = {};
  for (const [input, column] of Object.entries({
    name: 'name',
    size: 'size',
    price: 'price',
    stock: 'stock',
    position: 'position',
    image: 'image_url',
  })) {
    if (payload[input] !== undefined)
      patch[column] =
        input === 'image'
          ? payload[input] || null
          : ['stock', 'position'].includes(input)
          ? Math.max(0, Math.trunc(Number(payload[input])))
          : payload[input];
  }
  const { data, error } = await adminClient()
    .from('beverages')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  if (
    payload.image !== undefined &&
    current.data?.image_url &&
    current.data.image_url !== data.image_url
  ) {
    await removeStorageFileByPublicUrlIfUnreferenced(current.data.image_url);
  }
  return data;
}

export async function adminDeleteBeverage(id: string) {
  const current = await adminClient().from('beverages').select('*').eq('id', id).maybeSingle();
  if (current.error) throw current.error;
  const { error } = await adminClient().from('beverages').delete().eq('id', id);
  if (error) throw error;
  await removeStorageFileByPublicUrlIfUnreferenced(current.data?.image_url || null);
  return true;
}

export async function adminListBanners() {
  const { data, error } = await adminClient()
    .from('banners')
    .select('*')
    .order('position', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminCreateBanner(payload: any) {
  const id = crypto.randomUUID();
  const row = {
    id,
    title: payload.title,
    subtitle: payload.subtitle || null,
    image_url: payload.image || null,
    link: payload.link || '/',
    alt: payload.alt || payload.title || 'Banner promocional',
    position: payload.position || 0,
    active: payload.active ?? true,
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
  const { data, error } = await adminClient()
    .from('banners')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
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
  const { data, error } = await adminClient()
    .from('restaurant_settings')
    .select('*')
    .eq('key', 'storefront')
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateStoreSettings(payload: any) {
  const row = {
    key: 'storefront',
    value: payload,
  };
  const { data, error } = await adminClient()
    .from('restaurant_settings')
    .upsert(row, { onConflict: 'key' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Orders (matches the current public.orders schema)
export type OrderMetadata = {
  name?: string;
  phone?: string;
  delivery?: 'delivery' | 'pickup';
  street?: string;
  number?: string;
  neighborhood?: string;
  complement?: string;
  reference?: string;
  payment?: 'pix' | 'card' | 'cash';
  change?: string;
  notes?: string;
};

export type Order = {
  id: string;
  code: string;
  items: Array<{ dishId: string; name: string; price: number; quantity: number }>;
  total: number;
  status: 'Novo' | 'Em preparo' | 'Pronto' | 'Finalizado' | 'Cancelado';
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  metadata: OrderMetadata | null;
};

export async function adminCreateOrder(payload: {
  items: Order['items'];
  customer?: OrderMetadata;
}) {
  const id = crypto.randomUUID();
  const code = generateOrderCode();
  const total = (payload.items || []).reduce((s, it) => s + it.price * it.quantity, 0);
  const customer = payload.customer || {};
  const customerAddress =
    customer.delivery === 'pickup'
      ? 'Retirada no local'
      : [customer.street, customer.number, customer.neighborhood, customer.complement]
          .filter(Boolean)
          .join(', ');
  const row = {
    id,
    code,
    items: payload.items,
    total,
    status: 'Novo',
    customer_name: customer.name || null,
    customer_phone: customer.phone || null,
    customer_address: customerAddress || null,
    metadata: payload.customer || null,
  };
  const { data, error } = await adminClient().from('orders').insert([row]).select().single();
  if (error) throw error;
  return data;
}

export async function adminListOrders() {
  const { data, error } = await adminClient()
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function adminGetOrderByCode(code: string) {
  const { data, error } = await adminClient()
    .from('orders')
    .select('*')
    .eq('code', code)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateOrderStatus(code: string, status: Order['status']) {
  const allowedStatuses = ['Novo', 'Em preparo', 'Pronto', 'Finalizado', 'Cancelado'];
  if (!allowedStatuses.includes(status)) throw new Error('Invalid order status');
  const { data, error } = await (adminClient() as any).rpc(
    'update_order_status_with_stock_restore',
    { p_code: code, p_status: status }
  );
  if (error) throw error;
  return data;
}
