'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { normalizeDishAddons } from '@/lib/addons';
import type { RelatedProduct } from '@/lib/dishMedia';
import type { PublicCommerce } from '@/lib/commercial';
import CartRecommendations from '@/components/CartRecommendations';
import CommerceSections from '@/components/CommerceSections';
import { DishPhotoView } from '@/components/DishGallery';
import { useDialogFocus } from '@/lib/useDialogFocus';
import DishPrice from '@/components/DishPrice';
import { cents, hasPromotion, money } from '@/lib/pricing';
import { useCart } from '@/components/CartContext';
import { useStoreStatus } from '@/lib/useStoreStatus';
import type { DishRow } from '@/lib/types';
import { checkoutTotalCents } from '@/lib/deliveryZones';
import { whatsappUrl, type SavedOrder } from '@/lib/whatsapp';
import OrderConfirmation from '@/components/OrderConfirmation';
import { useDeliveryZones } from '@/lib/useDeliveryZones';
import '@/app/storefront.css';
import '@/app/commercial.css';
import '@/app/storefront-enhancements.css';

export type HomeDish = {
  related_products?: RelatedProduct[];
  addons?: { id: string; name: string; price: number; maxQty: number; required: boolean }[];
  servings?: number | null;
  id: string | number;
  slug?: string;
  name: string;
  cat: string;
  desc: string;
  price: number;
  promo_price?: number | null;
  promo_active?: boolean;
  is_new?: boolean;
  popular?: boolean;
  image: string | null;
  tag: string;
  available?: boolean;
  stock?: number;
  ingredients?: string;
  size?: string;
  type?: 'dish' | 'beverage';
};

type Promotion = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  link?: string | null;
  image_url?: string | null;
  alt?: string | null;
};

const keyOf = (id: string | number) => String(id);
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export default function Home({
  initialDishes,
  commerce,
}: {
  initialDishes: HomeDish[];
  commerce: PublicCommerce;
}) {
  const router = useRouter();
  const { items, addItem, updateQty, removeItem, clear, applyQuote, itemCount, total } = useCart();
  const [dishes, setDishes] = useState<HomeDish[]>(initialDishes);
  const [beverages, setBeverages] = useState<HomeDish[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const storeStatus = useStoreStatus();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submitLock = useRef(false);
  const pending = useRef<{ key: string; body: string } | null>(null);
  const [receipt, setReceipt] = useState<SavedOrder | null>(null);
  const [receiptVisible, setReceiptVisible] = useState(true);
  const [checkoutError, setCheckoutError] = useState('');
  const [retryPending, setRetryPending] = useState(false);
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    delivery: 'delivery',
    delivery_zone_id: '',
    street: '',
    number: '',
    neighborhood: '',
    complement: '',
    reference: '',
    payment: 'pix',
    change: '',
    notes: '',
  });
  useDialogFocus(cartOpen, () => setCartOpen(false));
  useDialogFocus(checkoutOpen && !(receipt && receiptVisible), () => {
    if (!submitLock.current) setCheckoutOpen(false);
  });
  useDialogFocus(!!receipt && receiptVisible, () => setReceiptVisible(false));
  const deliveryZones = useDeliveryZones(checkoutOpen && customer.delivery === 'delivery');
  const selectedZone = deliveryZones.zones.find((zone) => zone.id === customer.delivery_zone_id);
  const checkoutTotal = checkoutTotalCents(total, customer.delivery, selectedZone) / 100;

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) {
      window.location.replace(`/admin/reset-password${window.location.hash}`);
    }
    try {
      const saved = sessionStorage.getItem('tata-checkout-receipt');
      if (saved) setReceipt(JSON.parse(saved));
      const attempt = sessionStorage.getItem('tata-checkout-pending');
      if (attempt) {
        pending.current = JSON.parse(attempt);
        setRetryPending(true);
        setCheckoutOpen(true);
      }
    } catch {
      /* Armazenamento pode estar indisponível em navegação privada. */
    }
    const search = new URLSearchParams(window.location.search);
    if (search.get('checkout') === '1') {
      setCheckoutOpen(true);
      window.history.replaceState(null, '', '/');
    }
  }, []);

  useEffect(() => {
    const refreshMenu = () =>
      fetch('/api/menu', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : Promise.reject()))
        .then((remote: HomeDish[]) => {
          if (!Array.isArray(remote)) return;
          setDishes(remote);
        })
        .catch(() => {});
    window.addEventListener('focus', refreshMenu);
    fetch('/api/beverages')
      .then((response) => (response.ok ? response.json() : []))
      .then((items) =>
        setBeverages(
          Array.isArray(items)
            ? items.map((item) => ({
                id: item.id,
                name: item.name,
                cat: 'Bebidas',
                desc: item.size,
                size: item.size,
                price: Number(item.price),
                image: item.image_url || item.image || '/branding/logo-oficial.jpg',
                tag: 'Bebida',
                stock: Number(item.stock || 0),
                available: Number(item.stock || 0) >= 1,
                type: 'beverage',
              }))
            : []
        )
      )
      .catch(() => {});
    fetch('/api/banners')
      .then((response) => (response.ok ? response.json() : []))
      .then((items) => setPromotions(Array.isArray(items) ? items : []))
      .catch(() => setPromotions([]));
    return () => window.removeEventListener('focus', refreshMenu);
  }, []);

  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(dishes.map((dish) => dish.cat)))],
    [dishes]
  );
  const filtered = useMemo(
    () =>
      dishes
        .filter((dish) => {
          const matchesCategory = category === 'Todos' || dish.cat === category;
          const haystack = normalize(
            `${dish.name} ${dish.cat} ${dish.desc} ${dish.ingredients || ''}`
          );
          return matchesCategory && haystack.includes(normalize(query.trim()));
        })
        .sort((a, b) =>
          !query.trim() && category === 'Todos'
            ? Number(hasPromotion(b)) - Number(hasPromotion(a))
            : 0
        ),
    [dishes, query, category]
  );
  const count = itemCount;
  const contactWhatsAppUrl = whatsappUrl();

  const asCartDish = (dish: HomeDish): DishRow => ({
    id: keyOf(dish.id),
    slug: dish.slug || keyOf(dish.id),
    name: dish.name,
    description: dish.desc,
    price: dish.price,
    promo_price: dish.promo_price,
    promo_active: dish.promo_active,
    image: dish.image,
    addons: dish.addons,
    related_products: dish.related_products,
    type: dish.type || 'dish',
    is_available: dish.available !== false,
    stock: dish.stock,
  });

  const changeQuantity = (dish: HomeDish, amount: number) => {
    if (amount > 0 && normalizeDishAddons(dish.addons).some((a) => a.required)) {
      setCartOpen(false);
      router.push('/dishes/' + dish.slug);
      return;
    }
    if (dish.available === false || Number(dish.stock ?? 1) < 1) return;
    const baseItem = items.find(
      (item) =>
        keyOf(item.dish.id) === keyOf(dish.id) && item.selectedAddons.length === 0 && !item.notes
    );
    if (amount > 0) {
      if (!baseItem || baseItem.qty < Number(dish.stock ?? 20))
        addItem(asCartDish(dish), amount, { openCart: false });
    } else if (baseItem && baseItem.qty > 1) {
      updateQty(baseItem.id, baseItem.qty - 1);
    } else if (baseItem) {
      removeItem(baseItem.id);
    }
  };
  const setField = (field: string, value: string) =>
    setCustomer((current) => ({
      ...current,
      [field]: value,
      ...(field === 'delivery' ? { delivery_zone_id: '' } : {}),
    }));

  const submitOrder = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (submitLock.current) return;
    if (!pending.current && (items.length === 0 || storeStatus?.isOpen !== true)) {
      setCheckoutError('Aguarde a confirmação de abertura da loja e confira sua sacola.');
      return;
    }
    if (
      !pending.current &&
      customer.delivery === 'delivery' &&
      (!selectedZone || deliveryZones.loading || deliveryZones.error)
    ) {
      setCheckoutError('Selecione uma localização de entrega disponível.');
      return;
    }
    if (!pending.current) {
      pending.current = {
        key: crypto.randomUUID(),
        body: JSON.stringify({
          customer,
          expected_total_cents: cents(checkoutTotal),
          items: items.map((item) => ({
            id: item.dish.id,
            quantity: item.qty,
            expected_unit_cents: cents(item.unitPrice),
            type:
              item.dish.type === 'beverage' ||
              beverages.some((drink) => keyOf(drink.id) === keyOf(item.dish.id))
                ? 'beverage'
                : 'dish',
            addons: item.selectedAddons,
            notes: item.notes,
          })),
        }),
      };
      try {
        sessionStorage.setItem('tata-checkout-pending', JSON.stringify(pending.current));
      } catch {
        /* A tentativa permanece disponível nesta aba. */
      }
    }
    submitLock.current = true;
    setSubmitting(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/orders/v2', {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(20000),
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': pending.current.key },
        body: pending.current.body,
      });
      const saved = await response.json();
      if (!response.ok) {
        // Erros determinísticos de validação permitem corrigir a sacola. Uma
        // falha de rede/servidor mantém a MESMA tentativa até ser reconciliada.
        if (
          response.status >= 400 &&
          response.status < 500 &&
          saved.code !== 'IDEMPOTENCY_CONFLICT'
        ) {
          pending.current = null;
          setRetryPending(false);
          try {
            sessionStorage.removeItem('tata-checkout-pending');
          } catch {
            /* A tentativa permanece disponível nesta aba. */
          }
        }
        if (saved.code === 'PRICE_CHANGED' && saved.quote?.items) {
          applyQuote(saved.quote.items);
          deliveryZones.refresh();
        }
        if (/^DELIVERY_ZONE_/.test(saved.code || '')) {
          setField('delivery_zone_id', '');
          deliveryZones.refresh();
        }
        throw new Error(saved.error || 'Não foi possível registrar o pedido.');
      }
      setReceipt(saved);
      setReceiptVisible(true);
      try {
        sessionStorage.setItem('tata-checkout-receipt', JSON.stringify(saved));
        sessionStorage.removeItem('tata-checkout-pending');
      } catch {
        /* A tentativa permanece disponível nesta aba. */
      }
      pending.current = null;
      setRetryPending(false);
      clear();
      setCheckoutOpen(false);
    } catch (error) {
      setRetryPending(!!pending.current);
      setCheckoutError(
        `${error instanceof Error ? error.message : 'Erro ao registrar o pedido.'}${
          pending.current
            ? ' Tente consultar novamente: a mesma tentativa será reutilizada, sem duplicar o pedido.'
            : ''
        }`
      );
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <main id="top">
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Comedoria da Tata — início">
            <img src="/branding/logo-oficial.jpg" alt="" />
            <span>
              <b>Comedoria da Tata</b>
              <small>Sabor de casa em cada prato</small>
            </span>
          </a>
          <div className={`header-status glass${storeStatus?.isOpen === false ? ' closed' : ''}`}>
            <span className="status-dot" />{' '}
            <b>
              {storeStatus?.mode === 'open'
                ? 'ABERTO MANUALMENTE'
                : storeStatus?.mode === 'closed'
                ? 'FECHADO MANUALMENTE'
                : storeStatus?.isOpen
                ? 'Aberto agora'
                : 'Fechado'}
            </b>
            <span>
              {storeStatus?.mode === 'open'
                ? storeStatus.expiresAt
                  ? 'Abertura temporária'
                  : 'Até nova ação manual'
                : storeStatus?.mode === 'closed'
                ? 'Até nova ação manual'
                : storeStatus?.isOpen
                ? 'HORÁRIO PADRÃO'
                : storeStatus?.nextOpeningLabel ||
                  storeStatus?.label ||
                  'Consultando funcionamento...'}
            </span>
          </div>
          <label className="header-search glass">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar prato ou ingrediente"
              aria-label="Buscar no cardápio"
            />
          </label>
          <button
            className="header-cart"
            onClick={() => setCartOpen(true)}
            aria-label={`Abrir sacola com ${count} itens`}
          >
            <span>Sacola</span>
            <b>{count}</b>
          </button>
        </div>
      </header>

      <section
        className={`hero${promotions.length ? ' has-promotions' : ''}`}
        aria-label="Destaque da Comedoria da Tata"
      >
        <div className="hero-photo" />
        <div className="hero-shade" />
        <div className="hero-content">
          <h1>
            Comedoria
            <br />
            da Tata
          </h1>
          <p className="hero-slogan">Sabor de casa em cada prato.</p>
          {promotions.map((promotion) => {
            const content = (
              <>
                {promotion.image_url && (
                  <DishPhotoView
                    url={promotion.image_url}
                    alt={promotion.alt || promotion.title || 'Banner da Comedoria'}
                    className="banner-thumbnail"
                  />
                )}
                <span className="promo-icon" aria-hidden="true">
                  ★
                </span>
                <div>
                  <small>Promoções</small>
                  <b>{promotion.title || 'Confira as condições do dia'}</b>
                  {promotion.subtitle && <span>{promotion.subtitle}</span>}
                </div>
              </>
            );
            return promotion.link ? (
              <Link key={promotion.id} href={promotion.link} className="promo-card glass">
                {content}
              </Link>
            ) : (
              <div key={promotion.id} className="promo-card glass">
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="menu-section" id="cardapio">
        {!query.trim() && category === 'Todos' && dishes.some(hasPromotion) && (
          <section className="offers-section" aria-labelledby="offers-heading">
            <h2 id="offers-heading">Ofertas da Comedoria</h2>
            <div className="offers-grid">
              {dishes.filter(hasPromotion).map((dish) => (
                <article className="offer-card" key={dish.id}>
                  <Link href={`/dishes/${dish.slug || dish.id}`}>
                    <b>{dish.name}</b>
                    <DishPrice dish={dish} />
                  </Link>
                  <button
                    type="button"
                    disabled={dish.available === false || Number(dish.stock ?? 1) < 1}
                    onClick={() => changeQuantity(dish, 1)}
                  >
                    {dish.available === false || Number(dish.stock ?? 1) < 1
                      ? 'Esgotado'
                      : 'Adicionar'}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}
        {!query.trim() && category === 'Todos' && dishes.some((d) => d.popular) && (
          <section className="featured-section" aria-labelledby="featured-heading">
            <div className="featured-heading-row">
              <h2 id="featured-heading">Mais pedidos</h2>
              <div className="featured-controls" aria-label="Navegação de mais pedidos">
                <button type="button" aria-label="Pratos anteriores" onClick={() => document.getElementById('featured-track')?.scrollBy({ left: -280, behavior: 'smooth' })}>‹</button>
                <button type="button" aria-label="Próximos pratos" onClick={() => document.getElementById('featured-track')?.scrollBy({ left: 280, behavior: 'smooth' })}>›</button>
              </div>
            </div>
            <div className="featured-track" id="featured-track" role="region" aria-label="Pratos mais pedidos" tabIndex={0}>
              {dishes
                .filter((d) => d.popular)
                .slice(0, 4)
                .map((d) => (
                  <article className="featured-card" key={d.id}>
                    <Link href={'/dishes/' + d.slug} className="featured-card-link">
                      <div className="featured-photo">
                        {d.image ? <Image src={d.image} alt={d.name} fill sizes="(max-width: 620px) 68vw, 220px" /> : <span>Fotografia não cadastrada</span>}
                        {d.promo_active && d.promo_price != null && <b className="featured-offer-badge">OFERTA</b>}
                      </div>
                      <b className="featured-name">{d.name}</b>
                      <DishPrice dish={d} />
                    </Link>
                    <button
                      className="featured-add"
                      type="button"
                      disabled={d.available === false || Number(d.stock ?? 0) < 1}
                      onClick={() => changeQuantity(d, 1)}
                    >
                      {d.available === false || Number(d.stock ?? 0) < 1 ? 'Esgotado' : 'Adicionar'}
                    </button>
                  </article>
                ))}
            </div>
          </section>
        )}
        <div className="categories-panel glass-dark">
          <div className="categories-heading">
            <div>
              <small>Navegue pelo cardápio</small>
              <h2>Categorias</h2>
            </div>
            <span>{filtered.length} opções</span>
          </div>
          <nav className="category-list" aria-label="Categorias de pratos">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={category === item ? 'active' : ''}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </nav>
        </div>

        <div className="menu-heading">
          <div>
            <p className="eyebrow">ESCOLHA SEUS PRATOS</p>
            <h2>Nosso cardápio</h2>
            <p>Escolha seus favoritos e monte seu pedido em poucos toques.</p>
          </div>
        </div>

        {filtered.length ? (
          <div className="dish-grid">
            {filtered.map((dish) => {
              const baseItem = items.find(
                (item) =>
                  keyOf(item.dish.id) === keyOf(dish.id) &&
                  item.selectedAddons.length === 0 &&
                  !item.notes
              );
              const quantity = baseItem?.qty || 0;
              const unavailable = dish.available === false || Number(dish.stock ?? 1) < 1;
              return (
                <article className={`dish-card${unavailable ? ' unavailable' : ''}`} key={dish.id}>
                  {!unavailable && (
                    <Link
                      className="dish-card-link"
                      href={`/dishes/${dish.slug || dish.id}`}
                      aria-label={`Ver detalhes de ${dish.name}`}
                    />
                  )}
                  <div className="dish-photo">
                    {dish.image ? (
                      <img src={dish.image} alt={dish.name} loading="lazy" />
                    ) : (
                      <span className="photo-fallback">Fotografia não cadastrada</span>
                    )}
                    <span>
                      {unavailable ? 'Esgotado' : hasPromotion(dish) ? 'OFERTA' : dish.tag}
                    </span>
                  </div>
                  <div className="dish-info">
                    <small>
                      {dish.cat}
                      {dish.is_new && dish.popular
                        ? ' · Novo · Mais pedido'
                        : hasPromotion(dish) && dish.tag !== 'Da casa'
                        ? ` · ${dish.tag}`
                        : ''}
                    </small>
                    <h3>{dish.name}</h3>
                    <p>{dish.desc}</p>
                    {dish.servings != null && (
                      <small>
                        Serve {dish.servings} {dish.servings === 1 ? 'pessoa' : 'pessoas'}
                      </small>
                    )}
                    <footer>
                      <DishPrice dish={dish} />
                      {quantity > 0 ? (
                        <div className="stepper">
                          <button
                            onClick={() => changeQuantity(dish, -1)}
                            aria-label={`Remover uma unidade de ${dish.name}`}
                          >
                            −
                          </button>
                          <b>{quantity}</b>
                          <button
                            onClick={() => changeQuantity(dish, 1)}
                            aria-label={`Adicionar uma unidade de ${dish.name}`}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          className="add-button"
                          aria-label={`Adicionar ${dish.name}`}
                          disabled={unavailable}
                          onClick={() => changeQuantity(dish, 1)}
                        >
                          {unavailable ? 'Indisponível' : 'Adicionar'}
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <b>Nenhum prato encontrado</b>
            <span>Tente outra busca ou categoria.</span>
          </div>
        )}
      </section>

      <section className="beverages-section" id="bebidas">
        <div className="beverages-heading">
          <p className="eyebrow">PARA ACOMPANHAR</p>
          <h2>Bebidas</h2>
          <p>Deslize para o lado e escolha sua bebida.</p>
        </div>
        <div className="beverage-track">
          {beverages.length ? (
            beverages.map((drink) => {
              const baseItem = items.find((item) => keyOf(item.dish.id) === keyOf(drink.id));
              const quantity = baseItem?.qty || 0;
              const unavailable = drink.available === false;
              return (
                <article
                  className={`beverage-card${unavailable ? ' unavailable' : ''}`}
                  key={drink.id}
                >
                  <div className="beverage-photo">
                    {drink.image ? (
                      <img src={drink.image} alt={drink.name} loading="lazy" />
                    ) : (
                      <span className="photo-fallback">Fotografia não cadastrada</span>
                    )}
                    <span>{unavailable ? 'Esgotado' : drink.size}</span>
                  </div>
                  <div className="beverage-info">
                    <h3>{drink.name}</h3>
                    <p>{drink.size}</p>
                    <footer>
                      <strong>{money(drink.price)}</strong>
                      {quantity ? (
                        <div className="stepper">
                          <button onClick={() => changeQuantity(drink, -1)}>−</button>
                          <b>{quantity}</b>
                          <button onClick={() => changeQuantity(drink, 1)}>+</button>
                        </div>
                      ) : (
                        <button
                          className="add-button"
                          disabled={unavailable}
                          onClick={() => changeQuantity(drink, 1)}
                        >
                          {unavailable ? 'Esgotado' : 'Adicionar'}
                        </button>
                      )}
                    </footer>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-cart">Nenhuma bebida cadastrada no momento.</p>
          )}
        </div>
      </section>
      <CommerceSections data={commerce} status={storeStatus?.label} />
      <section className="promise">
        <div>
          <p className="eyebrow">INFORMAÇÕES DO PEDIDO</p>
          <h2>
            Peça pelo
            <br />
            cardápio online.
          </h2>
        </div>
        <div className="benefits">
          <p>
            <b>01</b>
            <span>
              <strong>Porções e acompanhamentos</strong>
              <small>
                Veja no cardápio o que acompanha cada prato e quantas pessoas ele serve.
              </small>
            </span>
          </p>
          <p>
            <b>02</b>
            <span>
              <strong>Pedido simples</strong>
              <small>Escolha os pratos, confira a sacola e informe os dados de entrega.</small>
            </span>
          </p>
          <p>
            <b>03</b>
            <span>
              <strong>Envio pelo WhatsApp</strong>
              <small>A mensagem é preparada com os itens e os dados informados no checkout.</small>
            </span>
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <b>Comedoria da Tata</b>
        <span>Chã Grande — Pernambuco{commerce.phone ? ` · ${commerce.phone}` : ''}</span>
      </footer>

      {contactWhatsAppUrl && (
        <a
          className="whatsapp-float"
          href={contactWhatsAppUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Falar com a Comedoria no WhatsApp"
        >
          <b>WhatsApp</b>
          <span>Atendimento</span>
        </a>
      )}
      {count > 0 && !cartOpen && !checkoutOpen && (
        <button className="mobile-bag" onClick={() => setCartOpen(true)}>
          <span>
            <b>
              {count} {count === 1 ? 'item' : 'itens'}
            </b>
            <small>Ver minha sacola</small>
          </span>
          <strong>{money(total)}</strong>
        </button>
      )}

      {cartOpen && (
        <div className="overlay">
          <aside role="dialog" tabIndex={-1} aria-modal="true" aria-label="Sua sacola">
            <button className="close" onClick={() => setCartOpen(false)} aria-label="Fechar sacola">
              ×
            </button>
            <p className="eyebrow">SEU PEDIDO</p>
            <h2>Sacola</h2>
            {count === 0 ? (
              <p className="empty-cart">Sua sacola está vazia.</p>
            ) : (
              items.map((item) => (
                <div className="cart-line" key={item.id}>
                  <span>
                    <b>{item.dish.name}</b>
                    <small>
                      {money(item.unitPrice)}
                      {item.selectedAddons.length > 0
                        ? ` · ${item.selectedAddons
                            .map((addon) => `${addon.qty}x ${addon.name}`)
                            .join(', ')}`
                        : ''}
                    </small>
                  </span>
                  <div>
                    <button
                      onClick={() =>
                        item.qty > 1 ? updateQty(item.id, item.qty - 1) : removeItem(item.id)
                      }
                      aria-label={`Remover uma unidade de ${item.dish.name}`}
                    >
                      −
                    </button>
                    <b>{item.qty}</b>
                    <button
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      aria-label={`Adicionar uma unidade de ${item.dish.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
            <CartRecommendations
              catalog={[...dishes, ...beverages].map((d) => ({
                ...asCartDish(d),
                type: d.type || 'dish',
              }))}
              onConfigure={() => setCartOpen(false)}
            />
            <div className="cart-total">
              <span>Total</span>
              <b>{money(total)}</b>
            </div>
            {storeStatus?.isOpen === false && (
              <p className="closed-notice">
                A Comedoria está fechada agora. Sua sacola fica salva para você pedir na próxima
                abertura.
              </p>
            )}
            <button
              className="continue"
              disabled={!count || !storeStatus?.isOpen}
              onClick={() => {
                setCartOpen(false);
                setCheckoutOpen(true);
              }}
            >
              Continuar para entrega
            </button>
          </aside>
        </div>
      )}

      {receipt && !receiptVisible && (
        <button
          type="button"
          className="order-receipt-reopen"
          onClick={() => setReceiptVisible(true)}
        >
          Ver pedido registrado #{receipt.code}
        </button>
      )}
      {receipt && receiptVisible && (
        <div className="overlay checkout-overlay">
          <aside role="dialog" tabIndex={-1} aria-modal="true" aria-label="Confirmação do pedido">
            <OrderConfirmation order={receipt} />
            <button type="button" className="back" onClick={() => setReceiptVisible(false)}>
              Voltar ao cardápio
            </button>
          </aside>
        </div>
      )}
      {checkoutOpen && !(receipt && receiptVisible) && (
        <div className="overlay checkout-overlay">
          <aside role="dialog" tabIndex={-1} aria-modal="true" aria-label="Finalizar pedido">
            <button
              className="close"
              onClick={() => setCheckoutOpen(false)}
              aria-label="Fechar checkout"
            >
              ×
            </button>
            <button
              className="back"
              type="button"
              onClick={() => {
                setCheckoutOpen(false);
                setCartOpen(true);
              }}
            >
              ← Voltar à sacola
            </button>
            <p className="eyebrow">FINALIZAR PEDIDO</p>
            <h2>Seus dados</h2>
            {checkoutError && <p role="alert">{checkoutError}</p>}
            {retryPending && (
              <div role="status">
                <p>
                  Há uma tentativa aguardando confirmação. Consulte seu resultado antes de fazer
                  outro pedido.
                </p>
                <button
                  type="button"
                  className="continue"
                  disabled={submitting}
                  onClick={submitOrder}
                >
                  {submitting ? 'Consultando...' : 'Consultar / tentar novamente'}
                </button>
              </div>
            )}
            <form className="checkout-form" onSubmit={submitOrder}>
              <fieldset disabled={submitting || retryPending}>
                <label>
                  Nome completo
                  <input
                    required
                    autoComplete="name"
                    value={customer.name}
                    onChange={(event) => setField('name', event.target.value)}
                    placeholder="Digite seu nome"
                  />
                </label>
                <label>
                  Telefone
                  <input
                    required
                    type="tel"
                    autoComplete="tel"
                    value={customer.phone}
                    onChange={(event) => setField('phone', event.target.value)}
                    placeholder="(81) 99999-9999"
                  />
                </label>
                <fieldset>
                  <legend>Como deseja receber?</legend>
                  <div className="choices">
                    <label>
                      <input
                        type="radio"
                        name="delivery"
                        checked={customer.delivery === 'delivery'}
                        onChange={() => setField('delivery', 'delivery')}
                      />{' '}
                      Entrega
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="delivery"
                        checked={customer.delivery === 'pickup'}
                        onChange={() => setField('delivery', 'pickup')}
                      />{' '}
                      Retirada
                    </label>
                  </div>
                </fieldset>
                {customer.delivery === 'delivery' && (
                  <label>
                    Onde será a entrega?
                    <select
                      required
                      value={customer.delivery_zone_id}
                      disabled={deliveryZones.loading || submitting}
                      onChange={(event) => setField('delivery_zone_id', event.target.value)}
                    >
                      <option value="">Selecione a localização</option>
                      {deliveryZones.zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name} — {money(zone.fee)}
                        </option>
                      ))}
                    </select>
                    {deliveryZones.loading ? (
                      <span role="status">Carregando localizações...</span>
                    ) : deliveryZones.error ? (
                      <span role="alert">{deliveryZones.error}</span>
                    ) : !deliveryZones.zones.length ? (
                      <span>Entrega indisponível no momento. Escolha retirada.</span>
                    ) : null}
                    {deliveryZones.error && (
                      <button type="button" onClick={deliveryZones.refresh}>
                        Tentar novamente
                      </button>
                    )}
                  </label>
                )}
                {customer.delivery === 'delivery' && (
                  <div className="address-fields">
                    <label className="wide">
                      Rua / avenida
                      <input
                        required
                        autoComplete="street-address"
                        value={customer.street}
                        onChange={(event) => setField('street', event.target.value)}
                        placeholder="Nome da rua"
                      />
                    </label>
                    <label>
                      Número
                      <input
                        required
                        inputMode="numeric"
                        value={customer.number}
                        onChange={(event) => setField('number', event.target.value)}
                        placeholder="Nº"
                      />
                    </label>
                    <label>
                      Bairro
                      <input
                        required
                        value={customer.neighborhood}
                        onChange={(event) => setField('neighborhood', event.target.value)}
                        placeholder="Seu bairro"
                      />
                    </label>
                    <label>
                      Complemento
                      <input
                        value={customer.complement}
                        onChange={(event) => setField('complement', event.target.value)}
                        placeholder="Casa, apto, bloco"
                      />
                    </label>
                    <label className="wide">
                      Ponto de referência
                      <input
                        value={customer.reference}
                        onChange={(event) => setField('reference', event.target.value)}
                        placeholder="Próximo a..."
                      />
                    </label>
                  </div>
                )}
                <fieldset>
                  <legend>Forma de pagamento</legend>
                  <div className="payment-choices">
                    <label>
                      <input
                        type="radio"
                        name="payment"
                        checked={customer.payment === 'pix'}
                        onChange={() => setField('payment', 'pix')}
                      />{' '}
                      PIX
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="payment"
                        checked={customer.payment === 'card'}
                        onChange={() => setField('payment', 'card')}
                      />{' '}
                      Cartão na entrega
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="payment"
                        checked={customer.payment === 'cash'}
                        onChange={() => setField('payment', 'cash')}
                      />{' '}
                      Dinheiro
                    </label>
                  </div>
                </fieldset>
                {customer.payment === 'cash' && (
                  <label>
                    Troco para quanto?
                    <input
                      inputMode="decimal"
                      value={customer.change}
                      onChange={(event) => setField('change', event.target.value)}
                      placeholder="Ex.: 100,00"
                    />
                  </label>
                )}
                <label>
                  Observações
                  <textarea
                    value={customer.notes}
                    onChange={(event) => setField('notes', event.target.value)}
                    placeholder="Ex.: retirar cebola, chamar no portão..."
                  />
                </label>
                <div className="checkout-items" aria-live="polite">
                  {items.map((item) => (
                    <p key={item.id}>
                      {item.qty}× {item.dish.name}{' '}
                      <b>{money((cents(item.unitPrice) * item.qty) / 100)}</b>
                    </p>
                  ))}
                </div>
                {customer.delivery === 'delivery' && (
                  <div className="checkout-breakdown" aria-live="polite">
                    <div>
                      <span>Produtos</span>
                      <b>{money(total)}</b>
                    </div>
                    <div>
                      <span>Entrega{selectedZone ? ` — ${selectedZone.name}` : ''}</span>
                      <b>{selectedZone ? money(selectedZone.fee) : 'Selecione a localização'}</b>
                    </div>
                  </div>
                )}
                <div className="checkout-total" aria-live="polite">
                  <span>Total do pedido</span>
                  <strong>{money(checkoutTotal)}</strong>
                </div>
                {storeStatus?.isOpen === false && (
                  <p className="closed-notice">
                    Pedidos voltam na próxima abertura. Você pode fechar esta tela sem perder a
                    sacola.
                  </p>
                )}
                <button
                  className="whatsapp-submit"
                  type="submit"
                  disabled={
                    submitting ||
                    !storeStatus?.isOpen ||
                    (customer.delivery === 'delivery' &&
                      (deliveryZones.loading || !!deliveryZones.error || !selectedZone))
                  }
                >
                  {submitting
                    ? 'Registrando pedido...'
                    : storeStatus?.isOpen === false
                    ? 'Pedidos encerrados'
                    : 'Registrar pedido'}
                </button>
                <small className="form-note">
                  Você poderá revisar a mensagem antes de enviá-la.
                </small>
              </fieldset>
            </form>
          </aside>
        </div>
      )}
    </main>
  );
}
