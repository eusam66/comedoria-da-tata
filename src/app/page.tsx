import HomeClient from '@/components/HomeClient';
import { getDishes } from '@/lib/api';
import { getPublicCommerce } from '@/lib/commercialServer';
import { toMenuDish } from '@/lib/menu';
import { restaurantSchema, jsonLd } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default async function HomePage() {
  const [dishes, commerce] = await Promise.all([
    getDishes({ includeUnavailable: true }),
    getPublicCommerce(),
  ]);
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(restaurantSchema(commerce)) }}
      />
      <HomeClient initialDishes={dishes.map(toMenuDish)} commerce={commerce} />
    </>
  );
}
