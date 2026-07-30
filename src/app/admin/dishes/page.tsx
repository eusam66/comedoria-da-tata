'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../layout';
import { slugify } from '../../../lib/slug';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';
import Skeleton from '../../../components/Skeleton';

export default function AdminDishesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>({ name: '', price: 0, categoryId: '', slug: '', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    fetch('/api/admin/dishes')
      .then((r) => r.json())
      .then((data) => setItems(data || []))
      .catch((e) => setError(e.message || 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    try{
      // compress image on client before upload
      const compressed = await compressImage(file, 1200, 0.78);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('bucket', 'dishes');
      fd.append('path', `dishes/${Date.now()}_${compressed.name}`);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      return json.publicUrl;
    }catch(err:any){
      throw new Error(err?.message || 'Upload/compress failed');
    }
  }

  async function create() {
    setError(null);
    try {
      const imageUrl = await uploadIfNeeded();
      const payload = { ...form, slug: form.slug || slugify(form.name), image: imageUrl };
      const res = await fetch('/api/admin/dishes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Create failed');
      setItems((s) => [json, ...s]);
      setForm({ name: '', price: 0, categoryId: '', slug: '', description: '' });
      setFile(null);
      setStep(1);
      toastSuccess('Prato criado com sucesso');
    } catch (e:any) {
      setError(e.message || 'Erro ao criar prato');
      toastError(e?.message || 'Erro ao criar prato');
    }
  }

  async function update(id: string) {
    try {
      const updated = await fetch(`/api/admin/dishes/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Edited: ' + Date.now() }) }).then((r) => r.json());
      setItems((s) => s.map((x) => (x.id === id ? updated : x)));
    } catch (e:any) {
      setError(e.message || 'Erro ao atualizar');
    }
  }

  async function remove(id: string) {
    try {
      await fetch(`/api/admin/dishes/${id}`, { method: 'DELETE' });
      setItems((s) => s.filter((x) => x.id !== id));
    } catch (e:any) {
      setError(e.message || 'Erro ao excluir');
    }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">CRUD de Pratos</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-2">Criar prato</h3>
            {/* Stepper for mobile-first */}
            <div className="space-y-3">
              {step === 1 && (
                <div>
                  <input aria-label="Nome do prato" value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} placeholder="Nome" className="border p-3 rounded w-full mb-2 text-lg" />
                  <input aria-label="Preço do prato" value={form.price} onChange={(e)=>setForm({...form, price:parseFloat(e.target.value||'0')})} placeholder="Preço" className="border p-3 rounded w-full mb-2" />
                  <textarea aria-label="Descrição do prato" value={form.description} onChange={(e)=>setForm({...form, description:e.target.value})} placeholder="Descrição (opcional)" className="border p-3 rounded w-full mb-2" />
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setStep(2)} className="flex-1 bg-brand-orange text-white py-3 rounded text-center">Próximo</button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <label className="block mb-2 text-sm">Imagem (câmera ou galeria)</label>
                  <input aria-label="Imagem do prato" type="file" accept="image/*" capture="environment" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="w-full mb-3" />
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setStep(1)} className="flex-1 border py-3 rounded">Voltar</button>
                    <button type="button" onClick={()=>setStep(3)} className="flex-1 bg-brand-orange text-white py-3 rounded">Próximo</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <div className="mb-3">Confirme os dados antes de criar</div>
                  <div className="bg-brand-beige p-3 rounded mb-2">
                    <div className="font-medium">{form.name}</div>
                    <div className="text-sm">R$ {Number(form.price || 0).toFixed(2)}</div>
                    <div className="text-sm text-gray-600">{form.description}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={()=>setStep(2)} className="flex-1 border py-3 rounded">Voltar</button>
                    <button type="button" onClick={create} className="flex-1 bg-brand-dark text-white py-3 rounded">Criar prato</button>
                  </div>
                </div>
              )}
            </div>
            {error && <div className="text-red-600 mt-2">{error}</div>}
          </div>

      <div className="space-y-3">
        {loading && <Skeleton lines={3} />}
        {items.map((d) => (
          <div key={d.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <div>
              <div className="font-medium">{d.name} <span className="text-xs text-gray-500">({d.slug})</span></div>
              <div className="text-sm text-gray-600">R$ {Number(d.price || 0).toFixed(2)}</div>
            </div>
            <div className="flex md:flex-row flex-col gap-2 md:items-center md:gap-2">
              <button type="button" className="w-full md:w-auto py-3 px-3 border rounded text-center" onClick={()=>update(d.id)}>Editar</button>
              <button type="button" className="w-full md:w-auto py-3 px-3 bg-red-500 text-white rounded text-center" onClick={async ()=>{ if(!confirm('Confirma exclusão deste prato?')) return; try{ await remove(d.id); toastSuccess('Prato excluído'); }catch(e:any){ toastError(e?.message || 'Erro ao excluir'); } }}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
