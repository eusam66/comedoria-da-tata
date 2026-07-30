'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../layout';
import { compressImage } from '../../../lib/imageCompress';
import { toastSuccess, toastError } from '../../../lib/toast';

export default function AdminBannersPage(){

  const [items,setItems]=useState<any[]>([]);
  const [title,setTitle]=useState('');
  const [subtitle,setSubtitle]=useState('');
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{ fetch('/api/admin/banners').then(r=>r.json()).then(setItems).catch(e=>setError(e.message)); },[]);
  const [file, setFile] = React.useState<File | null>(null);
  const [step, setStep] = React.useState<number>(1);

  async function uploadIfNeeded(): Promise<string | null> {
    if (!file) return null;
    try{
      const compressed = await compressImage(file, 1400, 0.78);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('bucket', 'banners');
      fd.append('path', `banners/${Date.now()}_${compressed.name}`);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Upload failed');
      return json.publicUrl;
    }catch(err:any){
      throw new Error(err?.message || 'Upload/compress failed');
    }
  }

  async function create(){
    setError(null);
    try{
      const imageUrl = await uploadIfNeeded();
      const res = await fetch('/api/admin/banners', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ title, subtitle, image: imageUrl }) });
      const json = await res.json();
      if(!res.ok) throw new Error(json?.error || 'Erro');
      setItems(s=>[json,...s]); setTitle(''); setSubtitle(''); setFile(null); setStep(1);
    } catch(e:any){ setError(e.message); }
  }
  async function remove(id:string){
    try{
      await fetch(`/api/admin/banners/${id}`, { method: 'DELETE' });
      setItems(s=>s.filter(x=>x.id!==id));
    } catch(e:any){ setError(e.message); }
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">CRUD de Banners</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        {/* Mobile-first stepper */}
        {step === 1 && (
          <div>
            <input aria-label="Título do banner" value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Título" className="border p-3 rounded mb-2 w-full text-lg" />
            <input aria-label="Subtítulo do banner" value={subtitle} onChange={(e)=>setSubtitle(e.target.value)} placeholder="Subtítulo" className="border p-3 rounded mb-2 w-full" />
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStep(2)} className="flex-1 bg-brand-orange text-white py-3 rounded">Próximo</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <label className="block mb-2 text-sm">Imagem (câmera ou galeria)</label>
            <input aria-label="Imagem do banner" type="file" accept="image/*" capture="environment" onChange={(e)=>setFile(e.target.files?.[0]||null)} className="w-full mb-3" />
            <div className="flex gap-2">
              <button type="button" onClick={()=>setStep(1)} className="flex-1 border py-3 rounded">Voltar</button>
                  <button type="button" onClick={async ()=>{ try{ await create(); toastSuccess('Banner criado'); }catch(e:any){ toastError(e?.message||'Erro'); } }} className="flex-1 bg-brand-dark text-white py-3 rounded">Criar Banner</button>
            </div>
          </div>
        )}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
      <div className="space-y-2">
        {items.map(b=> (
          <div key={b.id} className="bg-white p-3 rounded shadow flex justify-between">
            <div>
              <div className="font-medium">{b.title}</div>
              <div className="text-sm text-gray-600">{b.subtitle}</div>
            </div>
                <button type="button" className="px-3 py-1 bg-red-500 text-white rounded" onClick={async ()=>{ if(!confirm('Confirma exclusão deste banner?')) return; try{ await remove(b.id); toastSuccess('Banner excluído'); }catch(e:any){ toastError(e?.message||'Erro ao excluir'); } }}>Excluir</button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
