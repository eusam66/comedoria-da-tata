'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import { adminFetch } from '../../../lib/adminFetch';
import AdminField from '../../../components/AdminField';

type BannerForm = {
  title: string;
  subtitle: string;
  link: string;
  alt: string;
  position: number;
  active: boolean;
};

const initialForm: BannerForm = {
  title: '',
  subtitle: '',
  link: '/',
  alt: '',
  position: 0,
  active: true,
};

export default function AdminBannersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [removeCurrentImage, setRemoveCurrentImage] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch<any[]>('/api/admin/banners')
      .then((json) => setItems(json || []))
      .catch((e) => setError(e.message || 'Erro ao carregar promoções'))
      .finally(() => setLoading(false));
  }, []);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    const compressed = await compressImage(file, 1600, 0.8);
    const fd = new FormData();
    fd.append('file', compressed);
    fd.append('bucket', 'banners');
    fd.append('path', `banners/${Date.now()}_${compressed.name}`);
    const json = await adminFetch<{ publicUrl: string }>('/api/upload', {
      method: 'POST',
      body: fd,
    });
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
      const payload: any = { ...form };
      if (imageUrl) payload.image = imageUrl;
      if (!imageUrl && removeCurrentImage && editingId) payload.image = null;
      const json = await adminFetch<any>(
        editingId ? `/api/admin/banners/${editingId}` : '/api/admin/banners',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      if (editingId) {
        setItems((current) => current.map((item) => (item.id === editingId ? json : item)));
        toastSuccess('Promoção atualizada');
      } else {
        setItems((current) => [json, ...current]);
        toastSuccess('Promoção criada');
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar promoção');
      toastError(e?.message || 'Erro ao salvar promoção');
    }
  }

  function startEdit(banner: any) {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      link: banner.link || '/',
      alt: banner.alt || '',
      position: Number(banner.position || 0),
      active: banner.active ?? true,
    });
    setFile(null);
    setCurrentImageUrl(banner.image_url || null);
    setRemoveCurrentImage(false);
  }

  async function remove(id: string) {
    if (!confirm('Confirma exclusão desta promoção?')) return;
    try {
      await adminFetch<{ ok: boolean }>(`/api/admin/banners/${id}`, { method: 'DELETE' });
      setItems((current) => current.filter((item) => item.id !== id));
      toastSuccess('Promoção excluída');
    } catch (e: any) {
      setError(e.message || 'Erro ao excluir promoção');
      toastError(e?.message || 'Erro ao excluir promoção');
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-display">Promoções e banners</h1>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? 'Editar promoção' : 'Nova promoção'}
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <AdminField label="Título da promoção" help="Texto principal exibido sobre o banner.">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Almoço de domingo"
                className="w-full rounded border p-3"
              />
            </AdminField>
            <AdminField
              label="Subtítulo"
              help="Mensagem curta que complementa o título da promoção."
            >
              <input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Ex.: Peça até as 11h e garanta o seu"
                className="w-full rounded border p-3"
              />
            </AdminField>
            <AdminField
              label="Link de destino"
              help="Página aberta quando o cliente clicar no banner, ex.: /cardapio."
            >
              <input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="Ex.: /cardapio"
                className="w-full rounded border p-3"
              />
            </AdminField>
            <AdminField
              label="Descrição da imagem"
              help="Descreva a imagem para pessoas que usam leitores de tela."
            >
              <input
                value={form.alt}
                onChange={(e) => setForm({ ...form, alt: e.target.value })}
                placeholder="Ex.: Travessa de frango assado com batatas"
                className="w-full rounded border p-3"
              />
            </AdminField>
          </div>
          <div className="space-y-3">
            <AdminField
              label="Posição na página inicial"
              help="0 aparece antes de 1, 1 antes de 2..."
            >
              <input
                type="number"
                min="0"
                step="1"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: Number(e.target.value || 0) })}
                placeholder="Ex.: 0"
                className="w-full rounded border p-3"
              />
            </AdminField>
            <label className="block rounded border p-3">
              <span className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                <span>Promoção ativa na página inicial</span>
              </span>
              <span className="mt-1 block text-xs text-gray-500">
                Desmarque para ocultar esta promoção sem excluí-la.
              </span>
            </label>
            <label className="block rounded border p-3">
              <span className="mb-2 block text-sm font-medium">Imagem do banner</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setRemoveCurrentImage(false);
                }}
                className="w-full"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Imagem principal da promoção exibida na página inicial.
              </span>
            </label>
            {(currentImageUrl || file) && (
              <div className="rounded border p-3">
                <div className="mb-2 text-sm font-medium">Imagem atual</div>
                {currentImageUrl && !file && (
                  <Image
                    src={currentImageUrl}
                    alt={form.alt || form.title || 'Banner'}
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
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={submit}
            className="rounded bg-brand-dark px-4 py-3 text-white"
          >
            {editingId ? 'Salvar promoção' : 'Criar promoção'}
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
        {loading && (
          <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow">
            Carregando promoções...
          </div>
        )}
        {!loading && items.length === 0 && !error && (
          <div className="rounded-2xl bg-white p-4 text-sm text-gray-600 shadow">
            Nenhuma promoção cadastrada.
          </div>
        )}
        {items.map((banner) => (
          <div key={banner.id} className="rounded-2xl bg-white p-4 shadow">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{banner.title}</h3>
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      banner.active === false
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {banner.active === false ? 'Inativa' : 'Ativa'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{banner.subtitle || 'Sem subtítulo'}</div>
                <div className="text-sm text-gray-600">Link: {banner.link || '/'}</div>
                <div className="text-sm text-gray-600">Ordem: {banner.position ?? 0}</div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(banner)}
                  className="rounded border px-4 py-2"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => remove(banner.id)}
                  className="rounded bg-red-500 px-4 py-2 text-white"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
