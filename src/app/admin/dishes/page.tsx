'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../layout';
import { slugify } from '../../../lib/slug';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import Skeleton from '../../../components/Skeleton';

export default function AdminDishesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({
    name: '',
    price: 0,
    categoryId: '',
    slug: '',
    description: '',
    ingredients: '',
    servings: 1,
    popular: false,
    isNew: false
  });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/dishes').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json())
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
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      return json.publicUrl;
    } catch (err: any) {
      throw new Error(err?.message || 'Upload/compress failed');
    }
  }

  function resetForm() {
    setForm({
      name: '',
      price: 0,
      categoryId: '',
      slug: '',
      description: '',
      ingredients: '',
      servings: 1,
      popular: false,
      isNew: false
    });
    setFile(null);
    setEditingId(null);
    setError(null);
  }

  function startEdit(dish: any) {
    setEditingId(dish.id);
    setForm({
      name: dish.name || '',
      price: Number(dish.price) || 0,
      categoryId: dish.category_id || '',
      slug: dish.slug || '',
      description: dish.description || '',
      ingredients: Array.isArray(dish.ingredients) ? dish.ingredients.join(', ') : dish.ingredients || '',
      servings: dish.servings || 1,
      popular: dish.popular || false,
      isNew: dish.is_new || false
    });
    setFile(null);
  }

  async function create() {
    setError(null);
    try {
      const imageUrl = await uploadIfNeeded();
      const payload = {
        ...form,
        slug: form.slug || slugify(form.name),
        image: imageUrl,
        ingredients: form.ingredients ? form.ingredients.split(',').map((part: string) => part.trim()).filter(Boolean) : null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null
      };
      const res = await fetch('/api/admin/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Create failed');
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
      const payload: any = {
        ...form,
        slug: form.slug || slugify(form.name),
        ingredients: form.ingredients ? form.ingredients.split(',').map((part: string) => part.trim()).filter(Boolean) : null,
        popular: form.popular,
        isNew: form.isNew,
        categoryId: form.categoryId || null
      };
      if (imageUrl) payload.image = imageUrl;
      const res = await fetch(`/api/admin/dishes/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Update failed');
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
      await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      setItems((s) => s.filter((x) => x.id !== id));
      toastSuccess('Prato excluído');
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir');
      toastError(e?.message || 'Erro ao excluir');
    }
  }

  const submitLabel = editingId ? 'Salvar alterações' : 'Criar prato';

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">CRUD de Pratos</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-4">{editingId ? 'Editar prato' : 'Criar prato'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <input
              aria-label="Nome do prato"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome"
              className="border p-3 rounded w-full mb-2 text-lg"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                aria-label="Preço do prato"
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value || '0') })}
                placeholder="Preço"
                className="border p-3 rounded w-full"
              />
              <input
                aria-label="Serviços por pessoa"
                type="number"
                min="1"
                step="1"
                value={form.servings}
                onChange={(e) => setForm({ ...form, servings: parseInt(e.target.value || '1', 10) })}
                placeholder="Serve"
                className="border p-3 rounded w-full"
              />
            </div>
            <textarea
              aria-label="Descrição do prato"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição (opcional)"
              className="border p-3 rounded w-full min-h-[120px]"
            />
            <input
              aria-label="Slug do prato"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Slug (opcional)"
              className="border p-3 rounded w-full"
            />
            <input
              aria-label="Ingredientes"
              value={form.ingredients}
              onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
              placeholder="Ingredientes separados por vírgula"
              className="border p-3 rounded w-full"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isNew} onChange={(e) => setForm({ ...form, isNew: e.target.checked })} />
                <span>Novo</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.popular} onChange={(e) => setForm({ ...form, popular: e.target.checked })} />
                <span>Mais pedido</span>
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="border p-3 rounded w-full"
              >
                <option value="">Selecione categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
              <label className="block">
                <span className="block text-sm mb-1">Imagem do prato</span>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full" />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={editingId ? update : create} className="flex-1 bg-brand-dark text-white py-3 rounded">
                {submitLabel}
              </button>
              {editingId && (
                <button type="button" onClick={resetForm} className="flex-1 border py-3 rounded">Cancelar</button>
              )}
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </div>
          <div className="space-y-3">
            <div className="bg-brand-beige p-4 rounded">
              <div className="font-semibold mb-2">Resumo</div>
              <div className="text-sm text-gray-600">Use este formulário para cadastrar e editar pratos. Selecione um prato existente para carregar os detalhes e atualizar preço, categoria, status e imagem.</div>
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
        {items.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium text-lg">{d.name}</div>
                {d.is_new && <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Novo</span>}
                {d.popular && <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Mais pedido</span>}
              </div>
              <div className="text-sm text-gray-600 mt-1">R$ {Number(d.price || 0).toFixed(2)} • Serve {d.servings || 1} pessoa(s)</div>
              <div className="text-sm text-gray-600 mt-1">Categoria: {categories.find((c) => c.id === d.category_id)?.name || 'Sem categoria'}</div>
              <div className="text-sm text-gray-600 mt-2 line-clamp-2">{d.description}</div>
            </div>
            <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
              <button type="button" className="w-full sm:w-auto py-2 px-4 border rounded" onClick={() => startEdit(d)}>Editar</button>
              <button type="button" className="w-full sm:w-auto py-2 px-4 bg-red-500 text-white rounded" onClick={async () => { if (!confirm('Confirma exclusão deste prato?')) return; await remove(d.id); }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
