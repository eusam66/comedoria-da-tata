'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { slugify } from '../../../lib/slug';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import Skeleton from '../../../components/Skeleton';
import { DishAddon, normalizeDishAddons, serializeDishAddons } from '../../../lib/addons';
import { adminFetch } from '../../../lib/adminFetch';
import AdminField from '../../../components/AdminField';

export default function AdminDishesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({
    code: '',
    name: '',
    price: 0,
    categoryId: '',
    slug: '',
    description: '',
    ingredients: '',
    servings: 1,
    position: 0,
    stock: 1,
    popular: false,
    isNew: false,
    addons: [] as DishAddon[],
  });
  const [file, setFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminFetch<any[]>('/api/admin/dishes'),
      adminFetch<any[]>('/api/admin/categories'),
    ])
      .then(([dishes, categories]) => {
        setItems(dishes || []);
        setCategories(categories || []);
      })
      .catch((e) => setError(e.message || 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    try {
      const compressed = await compressImage(file, 1200, 0.78);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('bucket', 'dishes');
      fd.append('path', `dishes/${Date.now()}_${compressed.name}`);
      const json = await adminFetch<{ publicUrl: string }>('/api/upload', {
        method: 'POST',
        body: fd,
      });
      return json.publicUrl;
    } catch (err: any) {
      throw new Error(err?.message || 'Upload/compress failed');
    }
  }

  function resetForm() {
    setForm({
      code: '',
      name: '',
      price: 0,
      categoryId: '',
      slug: '',
      description: '',
      ingredients: '',
      servings: 1,
      position: 0,
      stock: 1,
      popular: false,
      isNew: false,
      addons: [] as DishAddon[],
    });
    setFile(null);
    setCurrentImageUrl(null);
    setRemoveCurrentImage(false);
    setEditingId(null);
    setError(null);
  }

  function startEdit(dish: any) {
    const addons = normalizeDishAddons(dish?.extras ?? dish?.addons ?? null);
    setEditingId(dish.id);
    setForm({
      code: dish.code || '',
      name: dish.name || '',
      price: Number(dish.price) || 0,
      categoryId: dish.category_id || '',
      slug: dish.slug || '',
      description: dish.description || '',
      ingredients: typeof dish.ingredients === 'string' ? dish.ingredients : '',
      servings: dish.servings || dish.serves || 1,
      position: Number(dish.position || 0),
      stock: Number(dish.stock ?? (dish.is_available === false ? 0 : 1)),
      popular: dish.popular ?? dish.is_featured ?? false,
      isNew: dish.is_new || false,
      addons,
    });
    setFile(null);
    setCurrentImageUrl(dish.image_url || dish.image || null);
    setRemoveCurrentImage(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  function updateAddonRow(addonId: string, patch: Partial<DishAddon>) {
    setForm((current: any) => ({
      ...current,
      addons: (current.addons || []).map((addon: DishAddon) =>
        addon.id === addonId ? { ...addon, ...patch } : addon
      ),
    }));
  }

  function removeAddonRow(addonId: string) {
    setForm((current: any) => ({
      ...current,
      addons: (current.addons || []).filter((addon: DishAddon) => addon.id !== addonId),
    }));
  }

  async function create() {
    setError(null);
    try {
      const imageUrl = await uploadIfNeeded();
      const normalizedAddons = normalizeDishAddons(form.addons || []);
      const payload: any = {
        ...form,
        code: form.code || undefined,
        slug: form.slug || slugify(form.name),
        ingredients: form.ingredients.trim() || null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null,
        extras: normalizedAddons.length > 0 ? serializeDishAddons(normalizedAddons) : null,
      };
      if (imageUrl) payload.image = imageUrl;
      const json = await adminFetch<any>('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setItems((s) => [json, ...s]);
      resetForm();
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
      const imageUrl = await uploadIfNeeded();
      const normalizedAddons = normalizeDishAddons(form.addons || []);
      const payload: any = {
        ...form,
        code: form.code || undefined,
        slug: form.slug || slugify(form.name),
        ingredients: form.ingredients.trim() || null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null,
        extras: normalizedAddons.length > 0 ? serializeDishAddons(normalizedAddons) : null,
      };
      if (imageUrl) payload.image = imageUrl;
      if (!imageUrl && removeCurrentImage) payload.image = null;
      const json = await adminFetch<any>(`/api/admin/dishes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setItems((s) => s.map((x) => (x.id === editingId ? json : x)));
      resetForm();
      toastSuccess('Prato atualizado com sucesso');
    } catch (e: any) {
      setError(e.message || 'Erro ao atualizar prato');
      toastError(e?.message || 'Erro ao atualizar prato');
    }
  }

  async function remove(id: string) {
    try {
      await adminFetch<{ ok: boolean }>(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      setItems((s) => s.filter((x) => x.id !== id));
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
    <>
      <h1 className="text-2xl font-display mb-4">CRUD de Pratos</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-4">{editingId ? 'Editar prato' : 'Criar prato'}</h3>
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
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value || '0') })}
                  placeholder="Ex.: 39,99"
                  className="border p-3 rounded w-full"
                />
              </AdminField>
              <AdminField label="Posição no cardápio" help="0 aparece antes de 1, 1 antes de 2...">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: parseInt(e.target.value || '0', 10) })
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
                    setForm({ ...form, servings: parseInt(e.target.value || '1', 10) })
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
                    setForm({ ...form, stock: Math.max(0, parseInt(e.target.value || '0', 10)) })
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
                label="Imagem do prato"
                help="Foto principal exibida no cardápio. Prefira uma imagem nítida e bem iluminada."
              >
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setRemoveCurrentImage(false);
                  }}
                  className="w-full"
                />
              </AdminField>
            </div>
            {(currentImageUrl || file) && (
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-semibold">Imagem atual</div>
                {currentImageUrl && !file && (
                  <Image
                    src={currentImageUrl}
                    alt={form.name || 'Prato'}
                    width={640}
                    height={320}
                    className="h-40 w-full rounded object-cover"
                    unoptimized
                  />
                )}
                {file && <div className="text-sm text-gray-600">{file.name}</div>}
                {editingId && currentImageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentImageUrl(null);
                      setFile(null);
                      setRemoveCurrentImage(true);
                    }}
                    className="mt-3 rounded border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    Excluir foto atual
                  </button>
                )}
              </div>
            )}
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
                {(form.addons || []).map((addon: DishAddon) => (
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
                            updateAddonRow(addon.id, { price: Number(e.target.value || 0) })
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
                              maxQty: Math.max(1, parseInt(e.target.value || '1', 10)),
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
                onClick={editingId ? update : create}
                className="flex-1 bg-brand-dark text-white py-3 rounded"
              >
                {submitLabel}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="flex-1 border py-3 rounded">
                  Cancelar
                </button>
              )}
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </div>
          <div className="space-y-3">
            <div className="bg-brand-beige p-4 rounded">
              <div className="font-semibold mb-2">Resumo</div>
              <div className="text-sm text-gray-600">
                Use este formulário para cadastrar e editar pratos. Selecione um prato existente
                para carregar os detalhes e atualizar preço, categoria, status e imagem.
              </div>
            </div>
            {file && (
              <div className="bg-white p-4 rounded shadow">
                <div className="font-semibold mb-2">Nova imagem selecionada</div>
                <div className="text-sm text-gray-600">{file.name}</div>
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

      <div className="space-y-3">
        {loading && <Skeleton lines={3} />}
        {!loading && items.length === 0 && !error && (
          <div className="rounded bg-white p-4 text-sm text-gray-600 shadow">
            Nenhum prato cadastrado.
          </div>
        )}
        {items.map((d) => {
          const stock = Math.max(0, Number(d.stock || 0));
          const categoryName =
            categories.find((category) => category.id === d.category_id)?.name || 'Sem categoria';
          const addonCount = normalizeDishAddons(d.extras ?? d.addons ?? null).length;
          const imageUrl = d.image_url || d.image || null;

          return (
            <article
              key={d.id}
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
                      R$ {Number(d.price || 0).toFixed(2)}
                    </span>{' '}
                    · {categoryName} · Serve {d.servings || d.serves || 1}
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
                    onClick={() => setStock(d, stock - 1)}
                    disabled={stock < 1}
                    className="min-h-11 min-w-11 rounded border px-3 py-2 disabled:opacity-40"
                  >
                    −
                  </button>
                  <b className="min-w-8 text-center">{stock}</b>
                  <button
                    type="button"
                    aria-label={`Aumentar estoque de ${d.name}`}
                    onClick={() => setStock(d, stock + 1)}
                    className="min-h-11 min-w-11 rounded border px-3 py-2"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setStock(d, 0)}
                    className="min-h-11 rounded border border-red-200 px-3 py-2 text-sm text-red-700"
                  >
                    Zerar estoque
                  </button>
                </div>
                <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
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
                    onClick={() => duplicate(d)}
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
                      await remove(d.id);
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
    </>
  );
}
