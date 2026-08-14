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
    isAvailable: true,
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
      isAvailable: true,
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
      ingredients: Array.isArray(dish.ingredients)
        ? dish.ingredients.join(', ')
        : dish.ingredients || '',
      servings: dish.servings || dish.serves || 1,
      position: Number(dish.position || 0),
      isAvailable: dish.is_available ?? true,
      popular: dish.popular ?? dish.is_featured ?? false,
      isNew: dish.is_new || false,
      addons,
    });
    setFile(null);
    setCurrentImageUrl(dish.image_url || dish.image || null);
    setRemoveCurrentImage(false);
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
        ingredients: form.ingredients
          ? form.ingredients
              .split(',')
              .map((part: string) => part.trim())
              .filter(Boolean)
          : null,
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
        ingredients: form.ingredients
          ? form.ingredients
              .split(',')
              .map((part: string) => part.trim())
              .filter(Boolean)
          : null,
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
                <label className="block sm:col-span-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.isAvailable}
                      onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                    />
                    <span>Disponível na loja</span>
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    Desmarque quando o prato estiver esgotado ou temporariamente indisponível.
                  </span>
                </label>
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
        {items.map((d) => (
          <div
            key={d.id}
            className="bg-white p-4 rounded shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
          >
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-lg">{d.name}</div>
                {d.is_new && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                    Novo
                  </span>
                )}
                {(d.popular ?? d.is_featured) && (
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    Mais pedido
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                R$ {Number(d.price || 0).toFixed(2)} • Serve {d.servings || d.serves || 1} pessoa(s)
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Código: {d.code || '—'} • Ordem: {d.position ?? 0} •{' '}
                {d.is_available === false ? 'Indisponível' : 'Disponível'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Categoria: {categories.find((c) => c.id === d.category_id)?.name || 'Sem categoria'}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Adicionais: {normalizeDishAddons(d.extras ?? d.addons ?? null).length}
              </div>
              <div className="text-sm text-gray-600 mt-2 line-clamp-2">{d.description}</div>
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="w-full sm:w-auto py-2 px-4 border rounded"
                onClick={() => startEdit(d)}
              >
                Editar
              </button>
              <button
                type="button"
                className="w-full sm:w-auto py-2 px-4 bg-red-500 text-white rounded"
                onClick={async () => {
                  if (!confirm('Confirma exclusão deste prato?')) return;
                  await remove(d.id);
                }}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
