import { supabase } from './supabase';
import { normalizeDishAddons } from './addons';

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
  categoryName?: string | null;
  ingredients?: string[] | null;
  servings?: number | null;
  popular?: boolean | null;
  isNew?: boolean | null;
  isAvailable?: boolean | null;
  position?: number | null;
  addons?: Array<{
    id: string;
    name: string;
    price: number;
    maxQty: number;
    required: boolean;
  }>;
};

const mockCategories: Category[] = [
  { id: 'cat-massas', name: 'Massas', image: '/icons/icon-512.png' },
  { id: 'cat-pratos', name: 'Pratos principais', image: '/icons/icon-512.png' },
  { id: 'cat-sobremesas', name: 'Sobremesas', image: '/icons/icon-512.png' },
  { id: 'cat-bebidas', name: 'Bebidas', image: '/icons/icon-512.png' }
];

const mockDishes: Dish[] = [
  {
    id: 'dish-1',
    code: 'CT-101',
    name: 'Couve à Mineira',
    slug: 'couve-a-mineira',
    description: 'Prato caseiro com arroz, feijão, couve refogada e carne suculenta.',
    price: 24.9,
    image: '/icons/icon-512.png',
    categoryId: 'cat-pratos',
    categoryName: 'Pratos principais',
    ingredients: ['couve', 'arroz', 'feijão', 'carne'],
    servings: 2,
    popular: true,
    isNew: false,
    addons: [
      { id: 'addon-farofa', name: 'Farofa especial', price: 4, maxQty: 2, required: false },
      { id: 'addon-molho', name: 'Molho da casa', price: 3, maxQty: 1, required: true }
    ]
  },
  {
    id: 'dish-2',
    code: 'CT-102',
    name: 'Macarrão da Tata',
    slug: 'macarrao-da-tata',
    description: 'Macarrão ao molho tomate artesanal com queijo e ervas.',
    price: 22.5,
    image: '/icons/icon-512.png',
    categoryId: 'cat-massas',
    categoryName: 'Massas',
    ingredients: ['macarrão', 'molho de tomate', 'queijo', 'ervas'],
    servings: 2,
    popular: true,
    isNew: true,
    addons: [
      { id: 'addon-queijo', name: 'Queijo extra', price: 5.5, maxQty: 3, required: false },
      { id: 'addon-bacon', name: 'Bacon crocante', price: 7, maxQty: 2, required: false }
    ]
  },
  {
    id: 'dish-3',
    code: 'CT-103',
    name: 'Doce de leite com banana',
    slug: 'doce-de-leite-com-banana',
    description: 'Sobremesa artesanal com banana caramelada e creme de doce de leite.',
    price: 14.9,
    image: '/icons/icon-512.png',
    categoryId: 'cat-sobremesas',
    categoryName: 'Sobremesas',
    ingredients: ['banana', 'doce de leite', 'canela'],
    servings: 1,
    popular: false,
    isNew: true,
    addons: [{ id: 'addon-sorvete', name: 'Bola de sorvete', price: 6, maxQty: 2, required: false }]
  },
  {
    id: 'dish-4',
    code: 'CT-104',
    name: 'Suco de laranja natural',
    slug: 'suco-de-laranja-natural',
    description: 'Suco gelado preparado na hora com laranja e hortelã.',
    price: 8.9,
    image: '/icons/icon-512.png',
    categoryId: 'cat-bebidas',
    categoryName: 'Bebidas',
    ingredients: ['laranja', 'hortelã', 'gelo'],
    servings: 1,
    popular: false,
    isNew: false,
    addons: []
  }
];

function normalizeDishImage(imageValue: unknown): string | null {
  if (typeof imageValue !== 'string') return null;

  const image = imageValue.trim();
  if (!image) return null;

  if (/^(https?:)?\/\//i.test(image) || image.startsWith('data:')) {
    return image;
  }

  if (image.startsWith('/')) {
    return image;
  }

  if (image.startsWith('images/')) {
    return `/${image}`;
  }

  return `/images/dishes/${image.replace(/^\/+/, '')}`;
}

function mapDishRow(row: any): Dish {
  const image = normalizeDishImage(row.image || row.image_url || row.imageUrl || null);
  const normalizedAddons = normalizeDishAddons(row.extras ?? row.addons ?? null);
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    image: image,
    categoryId: row.category_id || null,
    categoryName: row.category_name || row.categoryName || row.categories?.name || null,
    ingredients: row.ingredients || null,
    servings: row.servings ?? row.serves ?? null,
    popular: row.popular ?? row.is_featured ?? null,
    isNew: row.is_new || null,
    isAvailable: row.is_available ?? true,
    position: row.position ?? 0,
    addons: normalizedAddons
  };
}

function filterDishes(dishes: Dish[], query?: { q?: string; categoryId?: string }): Dish[] {
  const q = query?.q?.trim().toLowerCase() || '';
  const categoryId = query?.categoryId;
  return dishes.filter((dish) => {
    const matchesAvailability = dish.isAvailable !== false;
    const matchesCategory = !categoryId || dish.categoryId === categoryId;
    const haystack = [
      dish.name,
      dish.description,
      dish.categoryName,
      ...(dish.ingredients || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = !q || haystack.includes(q);
    return matchesAvailability && matchesCategory && matchesQuery;
  });
}

function sortDishes(dishes: Dish[]): Dish[] {
  return [...dishes].sort((a, b) => {
    const positionDiff = Number(a.position || 0) - Number(b.position || 0);
    if (positionDiff !== 0) return positionDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return mockCategories;

  const { data, error } = await (supabase as any).from('categories').select('*').order('name');
  if (error) {
    console.error('getCategories error', error);
    return mockCategories;
  }
  return (data || [])
    .filter((row: any) => row.is_active !== false)
    .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0) || String(a.name || '').localeCompare(String(b.name || '')))
    .map((row: any) => ({ id: row.id, name: row.name, image: row.image || row.image_url || undefined })) as Category[];
}

export async function getDishes(options: { includeUnavailable?: boolean } = {}): Promise<Dish[]> {
  if (!supabase) return mockDishes;

  const { data, error } = await (supabase as any).from('dishes').select('*, categories(name)').order('name');
  if (error) {
    console.error('getDishes error', error);
    return mockDishes;
  }
  const dishes = sortDishes((data || []).map(mapDishRow));
  return options.includeUnavailable ? dishes : dishes.filter((dish: Dish) => dish.isAvailable !== false);
}

export async function getDishBySlug(slug: string): Promise<Dish | undefined> {
  if (!supabase) {
    return mockDishes.find((dish) => dish.slug === slug);
  }

  const { data, error } = await (supabase as any).from('dishes').select('*, categories(name)').eq('slug', slug).limit(1).maybeSingle();
  if (error) {
    console.error('getDishBySlug error', error);
    return mockDishes.find((dish) => dish.slug === slug);
  }
  if (!data) return mockDishes.find((dish) => dish.slug === slug);
  const mapped = mapDishRow(data);
  return mapped.isAvailable === false ? undefined : mapped;
}

export async function searchDishes(query: { q?: string; categoryId?: string }): Promise<Dish[]> {
  if (!supabase) return filterDishes(mockDishes, query);

  const q = query.q?.trim();
  let builder = (supabase as any).from('dishes').select('*');
  if (query.categoryId) builder = builder.eq('category_id', query.categoryId);
  if (q && q.length > 0) {
    const like = `%${q}%`;
    builder = builder.or(`name.ilike.${like},description.ilike.${like},ingredients.ilike.${like}`);
  }
  const { data, error } = await builder.order('name');
  if (error) {
    console.error('searchDishes error', error);
    return filterDishes(mockDishes, query);
  }
  return sortDishes(filterDishes((data || []).map(mapDishRow), query));
}
