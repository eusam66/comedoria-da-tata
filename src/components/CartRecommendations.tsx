'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from './CartContext';
import DishPrice from './DishPrice';
import { recommendProducts, type RecommendationProduct } from '@/lib/recommendations';
import { toastSuccess } from '@/lib/toast';
export default function CartRecommendations({
  catalog,
  onConfigure,
}: {
  catalog?: RecommendationProduct[];
  onConfigure?: () => void;
}) {
  const { items, addItem, close } = useCart();
  const router = useRouter();
  const [remote, setRemote] = useState<RecommendationProduct[]>([]);
  const ids = items.map((i) => i.dish.id).join(',');
  useEffect(() => {
    if (catalog || !ids) return;
    const c = new AbortController();
    fetch('/api/recommendations?ids=' + encodeURIComponent(ids), {
      signal: c.signal,
      cache: 'no-store',
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRemote)
      .catch(() => {});
    return () => c.abort();
  }, [catalog, ids]);
  if (!items.length) return null;
  const suggestions = recommendProducts(
    catalog || remote,
    items.map((i) => ({
      ...i.dish,
      type: i.dish.type || catalog?.find((p) => p.id === i.dish.id)?.type || 'dish',
    }))
  );
  if (!suggestions.length) return null;
  return (
    <section className="cart-recommendations" aria-label="Sugestões para completar sua refeição">
      <h3>Que tal completar sua refeição?</h3>
      <div>
        {suggestions.map((p) => {
          const options = p.addons?.some((a) => a.required);
          return (
            <article key={p.id}>
              <div>
                <b>{p.name}</b>
                <DishPrice dish={p} />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (options) {
                    close();
                    onConfigure?.();
                    router.push('/dishes/' + p.slug);
                    return;
                  }
                  addItem({ ...p, slug: p.slug || p.id }, 1, { openCart: false });
                  toastSuccess(`${p.name} adicionado à sacola.`);
                }}
              >
                {options ? 'Escolher opções' : '+ ADICIONAR'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
