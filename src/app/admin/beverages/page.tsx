'use client';

import { validMoney } from '@/lib/pricing';
import { useAdminEditor } from '@/lib/useAdminEditor';
import { toastSuccess, toastError } from '@/lib/toast';
import { useEffect, useState, useRef } from 'react';
import { adminFetch } from '@/lib/adminFetch';

type Beverage = {
  id: string;
  name: string;
  size: string;
  price: number;
  image_url?: string | null;
  stock: number;
  position: number;
};
const empty = {
  name: '',
  size: '',
  price: 0 as number | '',
  stock: 0 as number | '',
  position: 0 as number | '',
  image: '',
};

export default function BeveragesAdmin() {
  const [items, setItems] = useState<Beverage[]>([]);
  const [form, setForm] = useState(empty);
  const originalStock = useRef(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState('');
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState('');
  const load = () =>
    adminFetch<Beverage[]>('/api/admin/beverages')
      .then(setItems)
      .catch((e) => setError(e.message));

  const editor = useAdminEditor(editing, JSON.stringify([form, file?.name]));

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    if (!file) {
      setFilePreview('');
      return;
    }
    const preview = URL.createObjectURL(file);
    setFilePreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);

  const field = (name: keyof typeof empty, value: string | number) =>
    setForm((old) => ({ ...old, [name]: value }));
  function resetForm() {
    setForm(empty);
    setEditing(null);
    setFile(null);
    setFileInputKey((key) => key + 1);
    setError('');
  }

  async function save() {
    let uploadedUrl = '';
    try {
      setError('');
      if (!form.name.trim() || !form.size.trim()) throw new Error('Informe nome e volume/tamanho.');
      if (form.price === '' || (form.price !== 0 && !validMoney(form.price)))
        throw new Error('Informe um preço válido antes de salvar.');
      if (form.stock === '' || !Number.isInteger(form.stock) || form.stock < 0)
        throw new Error('Informe um estoque válido antes de salvar.');
      let image = form.image;
      if (file) {
        const data = new FormData();
        data.append('file', file);
        data.append('bucket', 'dishes');
        data.append('folder', 'beverages');
        const response = await fetch('/api/upload', { method: 'POST', body: data });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Falha no upload.');
        uploadedUrl = body.publicUrl;
        image = uploadedUrl;
      }
      const payload: Partial<typeof form> = {
        ...form,
        price: Number(form.price),
        position: Number(form.position),
        image,
      };
      if (editing && form.stock === originalStock.current) delete payload.stock;
      const saved = await adminFetch<Beverage>(
        editing ? `/api/admin/beverages/${editing}` : '/api/admin/beverages',
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        }
      );
      setItems((current) =>
        editing ? current.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...current]
      );
      resetForm();
      editor.finish(saved.id);
      toastSuccess('Bebida salva');
    } catch (e) {
      if (uploadedUrl)
        await fetch('/api/upload', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicUrl: uploadedUrl }),
        }).catch(() => undefined);
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.');
      toastError('Não foi possível salvar a bebida');
    }
  }

  async function setStock(item: Beverage, stock: number) {
    try {
      await adminFetch(`/api/admin/beverages/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ stock: Math.max(0, stock) }),
      });
      await load();
      toastSuccess('Estoque atualizado');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao atualizar estoque.');
    }
  }

  const preview = filePreview || form.image;
  return (
    <fieldset disabled={editor.busy} className="min-w-0">
      <div className="mb-5">
        <h1 className="text-2xl font-display">Bebidas</h1>
        <p className="text-sm text-gray-600">
          Cadastro separado dos pratos. Estoque 0 aparece como esgotado.
        </p>
      </div>
      <section className="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
        <h2
          ref={editor.headingRef}
          tabIndex={-1}
          className="admin-editor-heading font-semibold sm:col-span-2"
        >
          {editing ? `EDITANDO: ${form.name}` : 'Cadastrar bebida'}
        </h2>
        <label className="text-sm">
          Nome
          <input
            className="mt-1 w-full rounded border p-3"
            value={form.name}
            onChange={(e) => field('name', e.target.value)}
          />
        </label>
        <label className="text-sm">
          Volume / tamanho
          <input
            className="mt-1 w-full rounded border p-3"
            placeholder="Ex.: Lata · 350 ml"
            value={form.size}
            onChange={(e) => field('size', e.target.value)}
          />
        </label>
        <label className="text-sm">
          Preço
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded border p-3"
            value={form.price}
            onChange={(e) => field('price', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Estoque
          <input
            type="number"
            min="0"
            step="1"
            className="mt-1 w-full rounded border p-3"
            value={form.stock}
            onChange={(e) => field('stock', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Ordem
          <input
            type="number"
            min="0"
            step="1"
            className="mt-1 w-full rounded border p-3"
            value={form.position}
            onChange={(e) => field('position', e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Foto
          <input
            key={fileInputKey}
            type="file"
            accept="image/*"
            className="mt-1 w-full rounded border p-3"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        {preview && (
          <div className="flex items-center gap-3 rounded-xl border p-3 sm:col-span-2">
            <img
              src={preview}
              alt="Prévia da bebida"
              className="h-28 w-28 rounded-lg bg-orange-50 object-contain p-2"
            />
            <div>
              <p className="text-sm font-semibold">Prévia da foto</p>
              <button
                type="button"
                className="mt-2 rounded border border-red-200 px-3 py-2 text-sm text-red-700"
                onClick={() => {
                  setFile(null);
                  field('image', '');
                  setFileInputKey((key) => key + 1);
                }}
              >
                Remover foto
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2 sm:col-span-2">
          <button
            onClick={() => editor.run(save)}
            className="rounded bg-brand-dark px-5 py-3 text-white"
          >
            {editing ? 'Salvar alterações' : 'Cadastrar bebida'}
          </button>
          {editing && (
            <button onClick={() => editor.cancel(resetForm)} className="rounded border px-5 py-3">
              Cancelar
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2">
            {error}
          </p>
        )}
      </section>
      <div data-admin-list tabIndex={-1} aria-label="Lista de bebidas" className="space-y-3">
        {items.map((item) => (
          <article
            key={item.id}
            data-admin-item={item.id}
            tabIndex={-1}
            data-updated={editor.highlighted === item.id}
            className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-orange-50">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="px-2 text-center text-xs text-gray-500">Sem foto</span>
                )}
              </div>
              <div>
                <b>{item.name}</b>
                <p className="text-sm text-gray-600">
                  {item.size} · R$ {Number(item.price).toFixed(2)} · Estoque: {item.stock} · Ordem:{' '}
                  {item.position}
                </p>
                <span
                  className={`text-xs font-semibold ${
                    item.stock === 0
                      ? 'text-red-600'
                      : item.stock <= 2
                      ? 'text-amber-700'
                      : 'text-green-700'
                  }`}
                >
                  {item.stock === 0
                    ? 'Esgotado'
                    : item.stock <= 2
                    ? `Restam ${item.stock}`
                    : 'Disponível'}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  aria-label={`Diminuir estoque de ${item.name}`}
                  disabled={item.stock < 1}
                  onClick={() => editor.run(() => setStock(item, item.stock - 1))}
                  className="rounded border px-3 py-2 disabled:opacity-40"
                >
                  −
                </button>
                <b>{item.stock}</b>
                <button
                  aria-label={`Aumentar estoque de ${item.name}`}
                  onClick={() => editor.run(() => setStock(item, item.stock + 1))}
                  className="rounded border px-3 py-2"
                >
                  +
                </button>
                <button
                  onClick={() => editor.run(() => setStock(item, 0))}
                  className="rounded border border-red-200 px-3 py-2 text-red-700"
                >
                  Zerar estoque
                </button>
              </div>
              <button
                className="rounded border px-4 py-2"
                onClick={() => {
                  if (!editor.begin(item.id)) return;
                  setError('');
                  originalStock.current = item.stock;
                  setEditing(item.id);
                  setFile(null);
                  setFileInputKey((key) => key + 1);
                  setForm({
                    name: item.name,
                    size: item.size,
                    price: item.price,
                    stock: item.stock,
                    position: item.position,
                    image: item.image_url || '',
                  });
                }}
              >
                Editar
              </button>
              <button
                className="rounded bg-red-500 px-4 py-2 text-white"
                onClick={async () => {
                  if (!confirm('Excluir esta bebida?')) return;
                  await editor.run(async () => {
                    try {
                      await adminFetch(`/api/admin/beverages/${item.id}`, { method: 'DELETE' });
                      setItems((current) => current.filter((row) => row.id !== item.id));
                      if (editing === item.id) resetForm();
                      editor.removed(item.id);
                      toastSuccess('Bebida excluída');
                    } catch {
                      toastError('Não foi possível excluir a bebida');
                    }
                  });
                }}
              >
                Excluir
              </button>
            </div>
          </article>
        ))}
      </div>
    </fieldset>
  );
}
