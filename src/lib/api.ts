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
  categoryName?: string | null;
  ingredients?: string[] | null;
  servings?: number | null;
  popular?: boolean | null;
  isNew?: boolean | null;
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
    isNew: false
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
    isNew: true
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
    isNew: true
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
    isNew: false
  }
];

function mapDishRow(row: any): Dish {
  const image = row.image || row.image_url || row.imageUrl || null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    slug: row.slug,
    description: row.description,
    price: row.price,
    image: image,
    categoryId: row.category_id || null,
    categoryName: row.category_name || row.categoryName || null,
    ingredients: row.ingredients || null,
    servings: row.servings || null,
    popular: row.popular || null,
    isNew: row.is_new || null
  };
}

function filterDishes(dishes: Dish[], query?: { q?: string; categoryId?: string }): Dish[] {
  const q = query?.q?.trim().toLowerCase() || '';
  const categoryId = query?.categoryId;
  return dishes.filter((dish) => {
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
    return matchesCategory && matchesQuery;
  });
}

export async function getCategories(): Promise<Category[]> {
  if (!supabase) return mockCategories;

  const { data, error } = await (supabase as any).from('categories').select('*').order('name');
  if (error) {
    console.error('getCategories error', error);
    return mockCategories;
  }
  return (data || []).map((row: any) => ({ id: row.id, name: row.name, image: row.image || undefined })) as Category[];
}

export async function getDishes(): Promise<Dish[]> {
  if (!supabase) return mockDishes;

  const { data, error } = await (supabase as any).from('dishes').select('*').order('name');
  if (error) {
    console.error('getDishes error', error);
    return mockDishes;
  }
  return (data || []).map(mapDishRow);
}

export async function getDishBySlug(slug: string): Promise<Dish | undefined> {
  if (!supabase) {
    return mockDishes.find((dish) => dish.slug === slug);
  }

  const { data, error } = await (supabase as any).from('dishes').select('*').eq('slug', slug).limit(1).maybeSingle();
  if (error) {
    console.error('getDishBySlug error', error);
    return mockDishes.find((dish) => dish.slug === slug);
  }
  if (!data) return mockDishes.find((dish) => dish.slug === slug);
  return mapDishRow(data);
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
  return (data || []).map(mapDishRow);
}
