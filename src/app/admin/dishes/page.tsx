'use client';
import { validMoney } from '../../../lib/pricing';
import { useAdminListContext } from '../../../lib/useAdminListContext';
import { useAdminEditor } from '../../../lib/useAdminEditor';
import { pricingError, discountPercent, hasPromotion, money, cents } from '../../../lib/pricing';
import DishPrice from '../../../components/DishPrice';
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import AdminDishGallery, { type GalleryDraft } from '@/components/AdminDishGallery';
import { dishPhotos } from '@/lib/dishMedia';
import { slugify } from '../../../lib/slug';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import Skeleton from '../../../components/Skeleton';
import { DishAddon, normalizeDishAddons, serializeDishAddons } from '../../../lib/addons';
import { adminFetch } from '../../../lib/adminFetch';
import AdminField from '../../../components/AdminField';

type AddonDraft = Omit<DishAddon, 'price' | 'maxQty'> & { price: number | ''; maxQty: number | '' };

export default function AdminDishesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [beverages, setBeverages] = useState<any[]>([]);
  const [gallery, setGallery] = useState<GalleryDraft[]>([]);
  const uploaded = useRef(new Map<File, string>());
  const galleryBaseline = useRef('[]');
  const uploadKeys = useRef(new WeakMap<File, string>());
  const gallerySnapshot = (rows: GalleryDraft[]) =>
    JSON.stringify(
      rows.map((p) => ({
        key: p.key,
        url: p.url,
        alt: p.alt,
        file: p.file?.name,
        size: p.file?.size,
        lastModified: p.file?.lastModified,
      }))
    );
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({
    code: '',
    name: '',
    price: 0,
    promo_price: null,
    promo_active: false,
    categoryId: '',
    slug: '',
    description: '',
    ingredients: '',
    accompaniments: '',
    dish_notes: '',
    related_products: [],
    servings: 1,
    position: 0,
    stock: 1,
    popular: false,
    isNew: false,
    addons: [] as AddonDraft[],
  });
  const [error, setError] = useState<string | null>(null);
  const originalStock = useRef(0);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editor = useAdminEditor(
    editingId,
    JSON.stringify([
      form,
      gallery.map((p) => ({ key: p.key, url: p.url, name: p.file?.name, alt: p.alt })),
    ])
  );
  const [query, setQuery] = useAdminListContext('admin-dishes-query', '');
  const [filter, setFilter] = useAdminListContext('admin-dishes-filter', 'all');
  const pricing = {
    price: Number(form.price),
    promo_price: form.promo_price,
    promo_active: form.promo_active,
  };
  const promoError = pricingError(pricing);
  function validateDraft() {
    const validation = pricingError(pricing);
    if (validation) throw new Error(validation);
    for (const [key, label, min] of [
      ['stock', 'estoque', 0],
      ['servings', 'quantidade de pessoas', 1],
    ] as const) {
      if (form[key] === '' || !Number.isInteger(Number(form[key])) || Number(form[key]) < min)
        throw new Error(`Informe ${label} válido antes de salvar.`);
    }
    for (const addon of form.addons as AddonDraft[]) {
      if (!addon.name.trim()) continue;
      if (addon.price === '' || (addon.price !== 0 && !validMoney(addon.price)))
        throw new Error('Informe o preço do adicional; use 0 para um adicional gratuito.');
      if (addon.maxQty === '' || !Number.isInteger(addon.maxQty) || addon.maxQty < 1)
        throw new Error('Informe a quantidade máxima do adicional.');
    }
  }
  const visibleItems = items.filter(
    (d) =>
      d.name.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')) &&
      (filter === 'all' ||
        (filter === 'promo' && hasPromotion(d)) ||
        (filter === 'available' && d.stock > 0 && d.is_available !== false) ||
        (filter === 'empty' && (d.stock < 1 || d.is_available === false)))
  );
  async function togglePromotion(dish: any) {
    if (!dish.promo_active && pricingError({ ...dish, promo_active: true })) {
      startEdit(dish);
      return;
    }
    await editor.run(async () => {
      try {
        const updated = await adminFetch<any>(`/api/admin/dishes/${dish.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ promo_active: !dish.promo_active }),
        });
        setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
        toastSuccess(updated.promo_active ? 'Promoção ativada' : 'Promoção desativada');
      } catch {
        toastError('Não foi possível salvar a promoção');
      }
    });
  }

  useEffect(() => {
    Promise.all([
      adminFetch<any[]>('/api/admin/dishes'),
      adminFetch<any[]>('/api/admin/categories'),
      adminFetch<any[]>('/api/admin/beverages'),
    ])
      .then(([dishes, categories, drinks]) => {
        setItems(dishes || []);
        setCategories(categories || []);
        setBeverages(drinks || []);
      })
      .catch((e) => setError(e.message || 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  async function cleanupUploads() {
    for (const [file, url] of uploaded.current) {
      try {
        await adminFetch('/api/upload', {
          method: 'DELETE',
          body: JSON.stringify({ publicUrl: url }),
        });
        uploaded.current.delete(file);
      } catch {
        /* Conserva o arquivo para nova tentativa de limpeza; nunca apaga sem verificar referências. */
      }
    }
  }
  async function prepareGallery() {
    const photos = [];
    for (const photo of gallery) {
      let url = photo.url;
      if (photo.file) {
        url = uploaded.current.get(photo.file);
        if (!url) {
          const compressed = await compressImage(photo.file, 1600, 0.8);
          const body = new FormData();
          body.append('file', compressed);
          body.append('bucket', 'dishes');
          body.append('deduplicate', 'true');
          let uploadKey = uploadKeys.current.get(photo.file);
          if (!uploadKey) {
            uploadKey = crypto.randomUUID();
            uploadKeys.current.set(photo.file, uploadKey);
          }
          body.append('uploadKey', uploadKey);
          const saved = await adminFetch<{ publicUrl: string }>('/api/upload', {
            method: 'POST',
            body,
          });
          url = saved.publicUrl;
          uploaded.current.set(photo.file, url);
        }
      }
      if (url) photos.push({ url, alt: photo.alt || form.name });
    }
    return photos;
  }

  function resetForm() {
    setForm({
      code: '',
      name: '',
      price: 0,
      promo_price: null,
      promo_active: false,
      categoryId: '',
      slug: '',
      description: '',
      ingredients: '',
      accompaniments: '',
      dish_notes: '',
      related_products: [],
      servings: 1,
      position: 0,
      stock: 1,
      popular: false,
      isNew: false,
      addons: [] as AddonDraft[],
    });
    setGallery([]);
    galleryBaseline.current = '[]';
    void cleanupUploads();
    setEditingId(null);
    setError(null);
  }

  function startEdit(dish: any) {
    if (!editor.begin(dish.id)) return;
    setError(null);
    const addons = normalizeDishAddons(dish?.extras ?? dish?.addons ?? null);
    originalStock.current = Number(dish.stock ?? 0);
    setEditingId(dish.id);
    setForm({
      code: dish.code || '',
      name: dish.name || '',
      price: Number(dish.price) || 0,
      promo_price: dish.promo_price ?? null,
      promo_active: dish.promo_active === true,
      categoryId: dish.category_id || '',
      slug: dish.slug || '',
      description: dish.description || '',
      ingredients: typeof dish.ingredients === 'string' ? dish.ingredients : '',
      accompaniments: dish.accompaniments || '',
      dish_notes: dish.dish_notes || '',
      related_products: dish.related_products || [],
      servings: dish.servings || dish.serves || 1,
      position: Number(dish.position || 0),
      stock: Number(dish.stock ?? (dish.is_available === false ? 0 : 1)),
      popular: dish.popular ?? dish.is_featured ?? false,
      isNew: dish.is_new || false,
      addons,
    });
    const photos = dishPhotos(dish.gallery, dish.image_url || dish.image, dish.name).map(
      (p, i) => ({ ...p, key: `${dish.id}-${i}` })
    );
    setGallery(photos);
    galleryBaseline.current = gallerySnapshot(photos);
    void cleanupUploads();
  }

  function addAddonRow() {
    setForm((current: any) => ({
      ...current,
      addons: [
        ...(current.addons || []),
        { id: `addon-${Date.now()}`, name: '', price: 0, maxQty: 1, required: false },
      ],
    }));
  }

  function updateAddonRow(addonId: string, patch: Partial<AddonDraft>) {
    setForm((current: any) => ({
      ...current,
      addons: (current.addons || []).map((addon: AddonDraft) =>
        addon.id === addonId ? { ...addon, ...patch } : addon
      ),
    }));
  }

  function removeAddonRow(addonId: string) {
    setForm((current: any) => ({
      ...current,
      addons: (current.addons || []).filter((addon: AddonDraft) => addon.id !== addonId),
    }));
  }

  async function create() {
    setError(null);
    try {
      validateDraft();
      const photos = await prepareGallery();
      const normalizedAddons = normalizeDishAddons(form.addons || []);
      const payload: any = {
        ...form,
        price: Number(form.price),
        position: Number(form.position),
        code: form.code || undefined,
        slug: form.slug || slugify(form.name),
        ingredients: form.ingredients.trim() || null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null,
        extras: normalizedAddons.length > 0 ? serializeDishAddons(normalizedAddons) : null,
      };
      payload.gallery = photos;
      payload.image = photos[0]?.url || null;
      const json = await adminFetch<any>('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setItems((s) => [json, ...s]);
      resetForm();
      editor.finish(json.id);
      toastSuccess('Prato criado com sucesso');
    } catch (e: any) {
      setError(e.message || 'Erro ao criar prato');
      toastError(e?.message || 'Erro ao criar prato');
    }
  }

  async function update() {
    if (!editingId) return;
    setError(null);
    try {
      validateDraft();
      const galleryChanged = gallerySnapshot(gallery) !== galleryBaseline.current;
      const photos = galleryChanged ? await prepareGallery() : null;
      const normalizedAddons = normalizeDishAddons(form.addons || []);
      const payload: any = {
        ...form,
        price: Number(form.price),
        position: Number(form.position),
        code: form.code || undefined,
        slug: form.slug || slugify(form.name),
        ingredients: form.ingredients.trim() || null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null,
        extras: normalizedAddons.length > 0 ? serializeDishAddons(normalizedAddons) : null,
      };
      if (form.stock === originalStock.current) delete payload.stock;
      if (photos) {
        payload.gallery = photos;
        payload.image = photos[0]?.url || null;
      }

      const json = await adminFetch<any>(`/api/admin/dishes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setItems((s) => s.map((x) => (x.id === editingId ? json : x)));
      resetForm();
      editor.finish(json.id);
      toastSuccess('Prato e preço promocional atualizados');
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar prato');
      toastError(e?.message || 'Erro ao atualizar prato');
    }
  }

  async function remove(id: string) {
    try {
      await adminFetch<{ ok: boolean }>(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      setItems((s) => s.filter((x) => x.id !== id));
      if (editingId === id) resetForm();
      editor.removed(id);
      toastSuccess('Prato excluído');
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir');
      toastError(e?.message || 'Erro ao excluir');
    }
  }

  async function setStock(dish: any, stock: number) {
    try {
      const json = await adminFetch<any>(`/api/admin/dishes/${dish.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: Math.max(0, stock) }),
      });
      setItems((current) => current.map((item) => (item.id === dish.id ? json : item)));
      toastSuccess('Estoque atualizado');
    } catch (e: any) {
      toastError(e.message || 'Erro ao atualizar estoque');
    }
  }

  async function duplicate(dish: any) {
    try {
      const suffix = Date.now().toString(36);
      const created = await adminFetch<any>('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${dish.name} (cópia)`,
          price: dish.price,
          categoryId: dish.category_id || null,
          slug: `${slugify(dish.name)}-copia-${suffix}`,
          description: dish.description,
          ingredients: typeof dish.ingredients === 'string' ? dish.ingredients : null,
          servings: dish.servings || dish.serves || 1,
          position: dish.position || 0,
          popular: false,
          isNew: false,
          extras: dish.extras || null,
          image: dish.image_url || dish.image || null,
          stock: 0,
        }),
      });
      setItems((current) => [created, ...current]);
      toastSuccess('Prato duplicado com estoque 0 para revisão');
    } catch (e: any) {
      toastError(e.message || 'Erro ao duplicar prato');
    }
  }

  const submitLabel = editingId ? 'Salvar alterações' : 'Criar prato';

  return (
    <fieldset disabled={editor.busy} className="min-w-0">
      <h1 className="text-2xl font-display mb-4">Pratos</h1>
      <div
        className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-label="Indicadores de pratos"
      >
        {[
          ['Cadastrados', items.length],
          ['Disponíveis', items.filter((d) => d.stock > 0 && d.is_available !== false).length],
          ['Esgotados', items.filter((d) => d.stock < 1 || d.is_available === false).length],
          ['Promoções ativas', items.filter(hasPromotion).length],
        ].map(([label, value]) => (
          <div className="rounded bg-white p-3" key={label}>
            <b>{value}</b> {label}
          </div>
        ))}
      </div>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h2
          ref={editor.headingRef}
          tabIndex={-1}
          className="admin-editor-heading font-semibold mb-4"
        >
          {editingId ? `EDITANDO: ${form.name}` : 'Criar prato'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <AdminField label="Código do prato" help="Código interno do prato, ex.: CDT009.">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Ex.: CDT009"
                className="border p-3 rounded w-full"
              />
            </AdminField>
            <AdminField label="Nome do prato" help="Nome exibido para o cliente no cardápio.">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Frango assado com batatas"
                className="border p-3 rounded w-full text-lg"
              />
            </AdminField>
            <div className="grid grid-cols-2 gap-3">
              <AdminField label="Preço" help="Preço de venda do prato.">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  aria-invalid={form.price === ''}
                  aria-describedby="dish-price-validation"
                  onChange={(e) =>
                    setForm({ ...form, price: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                  placeholder="Ex.: 39,99"
                  className="border p-3 rounded w-full"
                />
                {form.price === '' && (
                  <span
                    id="dish-price-validation"
                    role="alert"
                    className="mt-1 block text-sm text-red-700"
                  >
                    Informe o preço normal para salvar.
                  </span>
                )}
              </AdminField>
              <AdminField label="Posição no cardápio" help="0 aparece antes de 1, 1 antes de 2...">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.position}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      position: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  placeholder="Ex.: 0"
                  className="border p-3 rounded w-full"
                />
              </AdminField>
              <AdminField
                label="Serve quantas pessoas?"
                help="Quantidade aproximada de pessoas que o prato serve."
              >
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.servings}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      servings: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  placeholder="Ex.: 2"
                  className="border p-3 rounded w-full"
                />
              </AdminField>
              <AdminField
                label="Estoque"
                help="1 ou mais: disponível. 0: esgotado automaticamente."
              >
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({ ...form, stock: e.target.value === '' ? '' : Number(e.target.value) })
                  }
                  className="border p-3 rounded w-full"
                />
              </AdminField>
            </div>
            <AdminField label="Descrição" help="Descrição curta e atrativa exibida no cardápio.">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Frango dourado, acompanhado de batatas assadas"
                className="border p-3 rounded w-full min-h-[120px]"
              />
            </AdminField>
            <AdminField
              label="Slug"
              help="Endereço amigável da página do prato; deixe em branco para gerar automaticamente."
            >
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="Ex.: frango-assado-com-batatas"
                className="border p-3 rounded w-full"
              />
            </AdminField>
            <AdminField label="Ingredientes" help="Ingredientes separados por vírgula.">
              <input
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                placeholder="Ex.: frango, batata, cebola, alecrim"
                className="border p-3 rounded w-full"
              />
            </AdminField>
            <fieldset className="rounded border p-3">
              <legend className="px-1 text-sm font-medium text-gray-800">
                Destaques e disponibilidade
              </legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isNew}
                      onChange={(e) => setForm({ ...form, isNew: e.target.checked })}
                    />
                    <span>Novo</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Marque para exibir o selo de novidade.
                  </span>
                </label>
                <label className="block">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.popular}
                      onChange={(e) => setForm({ ...form, popular: e.target.checked })}
                    />
                    <span>Mais pedido</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Marque para destacar entre os pratos mais pedidos.
                  </span>
                </label>
                <p className="text-xs text-gray-500 sm:col-span-2">
                  A disponibilidade normal é definida automaticamente pelo estoque.
                </p>
              </div>
            </fieldset>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AdminField
                label="Categoria"
                help="Selecione a categoria em que o prato será exibido."
              >
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="border p-3 rounded w-full"
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField
                label="O que acompanha?"
                help="Informe apenas acompanhamentos reais; opcional."
              >
                <textarea
                  className="w-full rounded border p-3"
                  maxLength={2000}
                  value={form.accompaniments}
                  onChange={(e) => setForm({ ...form, accompaniments: e.target.value })}
                />
              </AdminField>
              <AdminField
                label="Observações do prato"
                help="Informações públicas sobre preparo ou porção; opcional."
              >
                <textarea
                  className="w-full rounded border p-3"
                  maxLength={2000}
                  value={form.dish_notes}
                  onChange={(e) => setForm({ ...form, dish_notes: e.target.value })}
                />
              </AdminField>
              <details className="rounded border p-3">
                <summary>Produtos relacionados (até 6)</summary>
                <p>Somente produtos disponíveis serão sugeridos no carrinho.</p>
                {[
                  ...items.filter((p) => p.id !== editingId).map((p) => ({ ...p, type: 'dish' })),
                  ...beverages.map((p) => ({ ...p, type: 'beverage' })),
                ].map((p) => {
                  const selected = form.related_products.some(
                    (r: any) => r.id === p.id && r.type === p.type
                  );
                  return (
                    <label key={p.id} className="flex min-h-11 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={!selected && form.related_products.length >= 6}
                        onChange={() =>
                          setForm({
                            ...form,
                            related_products: selected
                              ? form.related_products.filter((r: any) => r.id !== p.id)
                              : [...form.related_products, { id: p.id, type: p.type }],
                          })
                        }
                      />
                      {p.name}
                      {p.type === 'beverage' ? ' · bebida' : ''}
                    </label>
                  );
                })}
                {form.related_products
                  .filter(
                    (r: any) =>
                      !(r.type === 'beverage' ? beverages : items).some((p: any) => p.id === r.id)
                  )
                  .map((r: any) => (
                    <p key={r.id} className="mt-2">
                      <span>Relação com produto removido do catálogo.</span>
                      <button
                        type="button"
                        className="ml-2 min-h-11 rounded border p-2"
                        onClick={() =>
                          setForm({
                            ...form,
                            related_products: form.related_products.filter(
                              (p: any) => p.id !== r.id
                            ),
                          })
                        }
                      >
                        Remover relação indisponível
                      </button>
                    </p>
                  ))}
              </details>
              <AdminDishGallery value={gallery} onChange={setGallery} />
            </div>
            <section className="rounded-lg border p-3" aria-labelledby="dish-promo-heading">
              <h3 id="dish-promo-heading" className="font-semibold">
                PROMOÇÃO DO PRATO
              </h3>
              <p className="my-2 text-sm">
                Ativa até ser desligada manualmente. Preço normal: {money(form.price)}
              </p>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.promo_active}
                  onChange={(e) => setForm({ ...form, promo_active: e.target.checked })}
                />
                Ativar promoção
              </label>
              <label className="block">
                Preço promocional (R$)
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={form.promo_price ?? ''}
                  aria-describedby="promo-validation"
                  aria-invalid={!!promoError && (form.promo_active || form.promo_price != null)}
                  className="mt-1 w-full rounded border p-3"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      promo_price: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </label>
              <p
                id="promo-validation"
                className="my-2 text-sm"
                role={
                  promoError && (form.promo_active || form.promo_price != null)
                    ? 'alert'
                    : undefined
                }
              >
                {promoError && (form.promo_active || form.promo_price != null)
                  ? promoError
                  : form.promo_price != null
                  ? `Desconto: ${discountPercent(pricing)}% · Economia: ${money(
                      (cents(form.price) - cents(form.promo_price)) / 100
                    )}`
                  : 'Configure o preço para ativar a oferta.'}
              </p>
              <div aria-label="Prévia do card" className="rounded bg-orange-50 p-3">
                <b>{form.name || 'Nome do prato'}</b>
                <DishPrice dish={pricing} />
              </div>
            </section>
            <div className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Adicionais do prato</span>
                <button
                  type="button"
                  onClick={addAddonRow}
                  className="rounded border px-3 py-1 text-sm"
                >
                  + Adicional
                </button>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-gray-500">
                Cadastre opções extras que o cliente pode escolher, como queijo, molho ou
                acompanhamento.
              </p>
              <div className="space-y-3">
                {(form.addons || []).length === 0 && (
                  <p className="text-sm text-gray-600">
                    Nenhum adicional cadastrado para este prato.
                  </p>
                )}
                {(form.addons || []).map((addon: AddonDraft) => (
                  <div key={addon.id} className="rounded border p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                      <AdminField
                        label="Nome"
                        help="Nome exibido ao cliente, ex.: Queijo extra."
                        className="sm:col-span-4"
                      >
                        <input
                          value={addon.name}
                          onChange={(e) => updateAddonRow(addon.id, { name: e.target.value })}
                          placeholder="Ex.: Queijo extra"
                          className="border p-2 rounded w-full"
                        />
                      </AdminField>
                      <AdminField
                        label="Preço adicional"
                        help="Valor somado ao preço do prato."
                        className="sm:col-span-3"
                      >
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={addon.price}
                          onChange={(e) =>
                            updateAddonRow(addon.id, {
                              price: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 3,50"
                          className="border p-2 rounded w-full"
                        />
                      </AdminField>
                      <AdminField
                        label="Quantidade máxima"
                        help="Limite que o cliente pode escolher."
                        className="sm:col-span-2"
                      >
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={addon.maxQty}
                          onChange={(e) =>
                            updateAddonRow(addon.id, {
                              maxQty: e.target.value === '' ? '' : Number(e.target.value),
                            })
                          }
                          placeholder="Ex.: 1"
                          className="border p-2 rounded w-full"
                        />
                      </AdminField>
                      <label className="block sm:col-span-2">
                        <span className="mb-1 block text-sm font-medium">Escolha obrigatória?</span>
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={addon.required}
                            onChange={(e) =>
                              updateAddonRow(addon.id, { required: e.target.checked })
                            }
                          />
                          <span className="text-sm">Obrigatório</span>
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          Marcado: o cliente precisa escolher. Desmarcado: é opcional.
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={() => removeAddonRow(addon.id)}
                        className="rounded border px-2 py-2 text-sm text-red-600 sm:col-span-1"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => editor.run(editingId ? update : create)}
                disabled={editor.busy || !!promoError}
                className="flex-1 bg-brand-dark text-white py-3 rounded"
              >
                {editor.busy ? 'Salvando...' : submitLabel}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => editor.cancel(resetForm)}
                  disabled={editor.busy}
                  className="flex-1 border py-3 rounded"
                >
                  Cancelar
                </button>
              )}
            </div>
            {error && (
              <div role="alert" className="text-red-600 mt-2">
                {error}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="bg-brand-beige p-4 rounded">
              <div className="font-semibold mb-2">Resumo</div>
              <div className="text-sm text-gray-600">
                Use este formulário para cadastrar e editar pratos. Selecione um prato existente
                para carregar os detalhes e atualizar preço, categoria, status e imagem.
              </div>
            </div>
            {gallery.some((p) => p.file) && (
              <div className="bg-white p-4 rounded shadow">
                <div className="font-semibold mb-2">Nova imagem selecionada</div>
                <div className="text-sm text-gray-600">
                  {gallery
                    .filter((p) => p.file)
                    .map((p) => p.file!.name)
                    .join(', ')}
                </div>
              </div>
            )}
            {editingId && (
              <div className="bg-white p-4 rounded shadow">
                <div className="font-semibold mb-2">Editando prato</div>
                <div className="text-sm text-gray-600">ID: {editingId}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <label className="flex-1">
          Pesquisar pratos
          <input
            className="block w-full rounded border p-3"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="search"
          />
        </label>
        <label>
          Exibir
          <select
            className="block rounded border p-3"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="promo">Em promoção</option>
            <option value="available">Disponíveis</option>
            <option value="empty">Esgotados</option>
          </select>
        </label>
      </div>
      <div data-admin-list tabIndex={-1} aria-label="Lista de pratos" className="space-y-3">
        {!loading && !visibleItems.length && items.length > 0 && (
          <p role="status">Nenhum prato para estes filtros.</p>
        )}
        {loading && <Skeleton lines={3} />}
        {!loading && items.length === 0 && !error && (
          <div className="rounded bg-white p-4 text-sm text-gray-600 shadow">
            Nenhum prato cadastrado.
          </div>
        )}
        {visibleItems.map((d) => {
          const stock = Math.max(0, Number(d.stock || 0));
          const categoryName =
            categories.find((category) => category.id === d.category_id)?.name || 'Sem categoria';
          const addonCount = normalizeDishAddons(d.extras ?? d.addons ?? null).length;
          const imageUrl = d.image_url || d.image || null;

          return (
            <article
              key={d.id}
              data-admin-item={d.id}
              tabIndex={-1}
              data-updated={editor.highlighted === d.id}
              className="flex min-w-0 flex-col gap-3 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={d.name || 'Prato'}
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="px-2 text-center text-xs text-gray-500">Sem foto</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <b className="min-w-0 break-words text-base leading-tight">{d.name}</b>
                    {d.is_new && (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-800">
                        Novo
                      </span>
                    )}
                    {(d.popular ?? d.is_featured) && (
                      <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                        Mais pedido
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className="font-semibold whitespace-nowrap">
                      <DishPrice dish={d} />
                    </span>{' '}
                    · {categoryName} · Serve {d.servings || d.serves || 1}
                  </p>
                  <p className="text-xs font-semibold">
                    Promoção {d.promo_active ? 'ativa' : 'inativa'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Estoque: {stock} · {addonCount} adicional{addonCount === 1 ? '' : 'is'}
                  </p>
                  <span
                    className={`text-xs font-semibold ${
                      stock === 0
                        ? 'text-red-600'
                        : stock <= 2
                        ? 'text-amber-700'
                        : 'text-green-700'
                    }`}
                  >
                    {stock === 0 ? 'Esgotado' : stock <= 2 ? `Restam ${stock}` : 'Disponível'}
                  </span>
                </div>
              </div>

              <div className="flex w-full min-w-0 flex-wrap gap-2 sm:w-auto sm:max-w-[30rem] sm:justify-end">
                <div className="flex min-h-11 items-center gap-2">
                  <button
                    type="button"
                    aria-label={`Diminuir estoque de ${d.name}`}
                    onClick={() => editor.run(() => setStock(d, stock - 1))}
                    disabled={editor.busy || stock < 1}
                    className="min-h-11 min-w-11 rounded border px-3 py-2 disabled:opacity-40"
                  >
                    −
                  </button>
                  <b className="min-w-8 text-center">{stock}</b>
                  <button
                    type="button"
                    aria-label={`Aumentar estoque de ${d.name}`}
                    onClick={() => editor.run(() => setStock(d, stock + 1))}
                    className="min-h-11 min-w-11 rounded border px-3 py-2"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => editor.run(() => setStock(d, 0))}
                    className="min-h-11 rounded border border-red-200 px-3 py-2 text-sm text-red-700"
                  >
                    Zerar estoque
                  </button>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
                  <button
                    type="button"
                    disabled={editor.busy}
                    onClick={() => togglePromotion(d)}
                    className="min-h-11 rounded border px-3 py-2 text-sm"
                    aria-label={`${d.promo_active ? 'Desativar' : 'Ativar'} promoção de ${d.name}`}
                  >
                    {d.promo_active ? 'Desativar promoção' : 'Ativar promoção'}
                  </button>
                  <a
                    href={`/dishes/${d.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-11 rounded border px-3 py-2.5 text-center text-sm"
                  >
                    Ver no cardápio
                  </a>
                  <button
                    type="button"
                    className="min-h-11 rounded border px-3 py-2 text-sm"
                    onClick={() => editor.run(() => duplicate(d))}
                  >
                    Duplicar
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded border px-3 py-2 text-sm"
                    onClick={() => startEdit(d)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded bg-red-500 px-3 py-2 text-sm text-white"
                    onClick={async () => {
                      if (!confirm('Confirma exclusão deste prato?')) return;
                      await editor.run(() => remove(d.id));
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </fieldset>
  );
}
