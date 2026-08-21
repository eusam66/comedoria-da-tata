'use client';
import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';

type Beverage = { id: string; name: string; size: string; price: number; image_url?: string | null; stock: number; position: number };
const empty = { name: '', size: '', price: 0, stock: 0, position: 0, image: '' };
export default function BeveragesAdmin() {
  const [items, setItems] = useState<Beverage[]>([]); const [form, setForm] = useState(empty); const [editing, setEditing] = useState<string | null>(null); const [file, setFile] = useState<File | null>(null); const [error, setError] = useState('');
  const load = () => adminFetch<Beverage[]>('/api/admin/beverages').then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);
  const field = (name: keyof typeof empty, value: string | number) => setForm((old) => ({ ...old, [name]: value }));
  async function save() {
    try {
      if (!form.name.trim() || !form.size.trim()) throw new Error('Informe nome e volume/tamanho.');
      let image = form.image;
      if (file) { const data = new FormData(); data.append('file', file); data.append('bucket', 'dishes'); data.append('path', `beverages/${Date.now()}_${file.name}`); const response = await fetch('/api/upload', { method: 'POST', body: data }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Falha no upload.'); image = body.publicUrl; }
      await adminFetch(editing ? `/api/admin/beverages/${editing}` : '/api/admin/beverages', { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, image }) });
      setForm(empty); setEditing(null); setFile(null); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível salvar.'); }
  }
  async function setStock(item: Beverage, stock: number) { try { await adminFetch(`/api/admin/beverages/${item.id}`, { method: 'PATCH', body: JSON.stringify({ stock: Math.max(0, stock) }) }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao atualizar estoque.'); } }
  return <><div className="mb-5"><h1 className="text-2xl font-display">Bebidas</h1><p className="text-sm text-gray-600">Cadastro separado dos pratos. Estoque 0 aparece como esgotado.</p></div>
    <section className="mb-6 grid gap-3 rounded-2xl bg-white p-4 shadow sm:grid-cols-2">
      <label className="text-sm">Nome<input className="mt-1 w-full rounded border p-3" value={form.name} onChange={(e) => field('name', e.target.value)} /></label>
      <label className="text-sm">Volume / tamanho<input className="mt-1 w-full rounded border p-3" placeholder="Ex.: Lata · 350 ml" value={form.size} onChange={(e) => field('size', e.target.value)} /></label>
      <label className="text-sm">Preço<input type="number" min="0" step="0.01" className="mt-1 w-full rounded border p-3" value={form.price} onChange={(e) => field('price', Number(e.target.value))} /></label>
      <label className="text-sm">Estoque<input type="number" min="0" step="1" className="mt-1 w-full rounded border p-3" value={form.stock} onChange={(e) => field('stock', Number(e.target.value))} /></label>
      <label className="text-sm">Ordem<input type="number" min="0" step="1" className="mt-1 w-full rounded border p-3" value={form.position} onChange={(e) => field('position', Number(e.target.value))} /></label>
      <label className="text-sm">Foto<input type="file" accept="image/*" className="mt-1 w-full rounded border p-3" onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
      <div className="flex gap-2 sm:col-span-2"><button onClick={save} className="rounded bg-brand-dark px-5 py-3 text-white">{editing ? 'Salvar alterações' : 'Cadastrar bebida'}</button>{editing && <button onClick={() => { setEditing(null); setForm(empty); }} className="rounded border px-5 py-3">Cancelar</button>}</div>
      {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
    </section>
    <div className="space-y-3">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between"><div><b>{item.name}</b><p className="text-sm text-gray-600">{item.size} · R$ {Number(item.price).toFixed(2)} · Estoque: {item.stock} · Ordem: {item.position}</p><span className={`text-xs font-semibold ${item.stock === 0 ? 'text-red-600' : item.stock <= 2 ? 'text-amber-700' : 'text-green-700'}`}>{item.stock === 0 ? 'Esgotado' : item.stock <= 2 ? `Restam ${item.stock}` : 'Disponível'}</span></div><div className="flex flex-wrap gap-2"><div className="flex items-center gap-2"><button disabled={item.stock<1} onClick={()=>setStock(item,item.stock-1)} className="rounded border px-3 py-2 disabled:opacity-40">−</button><b>{item.stock}</b><button onClick={()=>setStock(item,item.stock+1)} className="rounded border px-3 py-2">+</button><button onClick={()=>setStock(item,0)} className="rounded border border-red-200 px-3 py-2 text-red-700">Zerar estoque</button></div><button className="rounded border px-4 py-2" onClick={() => { setEditing(item.id); setForm({ name: item.name, size: item.size, price: item.price, stock: item.stock, position: item.position, image: item.image_url || '' }); }}>Editar</button><button className="rounded bg-red-500 px-4 py-2 text-white" onClick={async () => { if (confirm('Excluir esta bebida?')) { await adminFetch(`/api/admin/beverages/${item.id}`, { method: 'DELETE' }); load(); } }}>Excluir</button></div></article>)}</div>
  </>;
}
