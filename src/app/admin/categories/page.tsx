'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import AdminLayout from '../layout';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import { slugify } from '../../../lib/slug';

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  position: number;
  isActive: boolean;
};

const initialForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  position: 0,
  isActive: true
};

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<CategoryForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then((json) => setItems(json || []))
      .catch((e) => setError(e.message || 'Erro ao carregar categorias'));
  }, []);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    const compressed = await compressImage(file, 1200, 0.8);
    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('bucket', 'branding');
    fd.append('path', `categories/${Date.now()}_${compressed.name}`);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.error || 'Falha no upload');
    return json.publicUrl;
  }

  function resetForm() {
    setForm(initialForm);
    setFile(null);
    setEditingId(null);
    setError(null);
    setCurrentImageUrl(null);
    setRemoveCurrentImage(false);
  }

  async function submit() {
    setError(null);
    try {
      const imageUrl = await uploadIfNeeded();
      const payload: any = {
        ...form,
        slug: form.slug || slugify(form.name)
      };
      if (imageUrl) payload.image = imageUrl;
      if (!imageUrl && removeCurrentImage && editingId) payload.image = null;

      const res = await fetch(editingId ? `/api/admin/categories/${editingId}` : '/api/admin/categories', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao salvar categoria');

      if (editingId) {
        setItems((current) => current.map((item) => (item.id === editingId ? json : item)));
        toastSuccess('Categoria atualizada');
      } else {
        setItems((current) => [json, ...current]);
        toastSuccess('Categoria criada');
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar categoria');
      toastError(e?.message || 'Erro ao salvar categoria');
    }
  }

  function startEdit(category: any) {
    setEditingId(category.id);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      position: Number(category.position || 0),
      isActive: category.is_active ?? true
    });
    setFile(null);
    setCurrentImageUrl(category.image_url || null);
    setRemoveCurrentImage(false);
  }

  async function remove(id: string) {
    if (!confirm('Confirma exclusão desta categoria?')) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro ao excluir categoria');
      setItems((current) => current.filter((item) => item.id !== id));
      toastSuccess('Categoria excluída');
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir categoria');
      toastError(e?.message || 'Erro ao excluir categoria');
    }
  }

  return (
    <AdminLayout>
      <h1 className="mb-4 text-2xl font-display">Categorias da loja</h1>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">{editingId ? 'Editar categoria' : 'Nova categoria'}</h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome da categoria"
              className="w-full rounded border p-3"
            />
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="Slug"
              className="w-full rounded border p-3"
            />
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descrição"
              className="min-h-[120px] w-full rounded border p-3"
            />
          </div>
          <div className="space-y-3">
            <input
              type="number"
              min="0"
              step="1"
              value={form.position}
              onChange={(e) => setForm({ ...form, position: Number(e.target.value || 0) })}
              placeholder="Ordem de exibição"
              className="w-full rounded border p-3"
            />
            <label className="flex items-center gap-2 rounded border p-3">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span>Categoria disponível na loja</span>
            </label>
            <label className="block rounded border p-3">
              <span className="mb-2 block text-sm font-medium">Imagem da categoria</span>
              <input type="file" accept="image/*" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveCurrentImage(false); }} className="w-full" />
            </label>
            {(currentImageUrl || file) && (
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Imagem atual</div>
                {currentImageUrl && !file && (
                  <Image
                    src={currentImageUrl}
                    alt={form.name || 'Categoria'}
                    width={640}
                    height={256}
                    className="h-32 w-full rounded object-cover"
                    unoptimized
                  />
                )}
                {file && <div className="text-sm text-gray-600">Nova imagem: {file.name}</div>}
                {editingId && currentImageUrl && (
                  <button
                    type="button"
                    onClick={() => { setCurrentImageUrl(null); setFile(null); setRemoveCurrentImage(true); }}
                    className="mt-3 rounded border border-red-200 px-3 py-2 text-sm text-red-600"
                  >
                    Excluir foto atual
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={submit} className="rounded bg-brand-dark px-4 py-3 text-white">
            {editingId ? 'Salvar categoria' : 'Criar categoria'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="rounded border px-4 py-3">
              Cancelar
            </button>
          )}
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>

      <div className="space-y-3">
        {items.map((category) => (
          <div key={category.id} className="rounded-2xl bg-white p-4 shadow">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                  <span className={`rounded-full px-2 py-1 text-xs ${category.is_active === false ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                    {category.is_active === false ? 'Oculta' : 'Ativa'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">Slug: {category.slug || '—'}</div>
                <div className="text-sm text-gray-600">Ordem: {category.position ?? 0}</div>
                <div className="text-sm text-gray-600">{category.description || 'Sem descrição'}</div>
              </div>
              <div className="flex flex-col gap-2 sm:w-auto">
                <button type="button" onClick={() => startEdit(category)} className="rounded border px-4 py-2">
                  Editar
                </button>
                <button type="button" onClick={() => remove(category.id)} className="rounded bg-red-500 px-4 py-2 text-white">
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
