import { getDishes } from './api';
import supabase from './supabase';
import type { RecommendationProduct } from './recommendations';
export async function recommendationCatalog(): Promise<RecommendationProduct[]> {
  const [dishes, drinks] = await Promise.all([
    getDishes({ includeUnavailable: true }),
    supabase
      ? supabase.from('beverages').select('id,name,size,price,image_url,stock').order('position')
      : Promise.resolve({ data: [], error: null }),
  ]);
  return [
    ...dishes.map((d) => ({ ...d, type: 'dish' as const, is_available: d.isAvailable })),
    ...(!drinks.error ? drinks.data || [] : []).map((d: any) => ({
      ...d,
      type: 'beverage' as const,
      price: Number(d.price),
      image: d.image_url,
    })),
  ];
}
