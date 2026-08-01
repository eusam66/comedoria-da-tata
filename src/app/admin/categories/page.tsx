'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../layout';
import { toastSuccess, toastError } from '../../../lib/toast';

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1);

  useEffect(() => {
    fetch('/api/admin/categories')
      .then((r) => r.json())
      .then(setItems)
      .catch((e) => setError(e.message));
  }, []);

  async function create() {
    setError(null);
    try {
      const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro');
      setItems((s) => [json, ...s]);
      setName('');
      toastSuccess('Categoria criada');
    } catch (e: any) {
      setError(e.message);
      toastError(e?.message || 'Erro');
    }
  }

  async function update() {
    if (!editingId) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro');
      setItems((s) => s.map((c) => (c.id === editingId ? json : c)));
      setName('');
      setEditingId(null);
      setStep(1);
      toastSuccess('Categoria atualizada');
    } catch (e: any) {
      setError(e.message);
      toastError(e?.message || 'Erro');
    }
  }

  async function remove(id: string) {
    if (!confirm('Confirma exclusão desta categoria?')) return;
    try {
      await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      setItems((s) => s.filter((x) => x.id !== id));
      toastSuccess('Categoria excluída');
    } catch (e: any) {
      setError(e.message);
      toastError(e.message);
    }
  }

  function startEdit(category: any) {
    setEditingId(category.id);
    setName(category.name || '');
    setStep(2);
  }

  function cancelEdit() {
    setEditingId(null);
    setName('');
    setStep(1);
  }

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">CRUD de Categorias</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        {step === 1 && (
          <div>
            <input aria-label="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da categoria" className="border p-3 rounded w-full mb-2 text-lg" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setStep(2)} className="flex-1 bg-brand-orange text-white py-3 rounded">Próximo</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <div className="mb-3">{editingId ? 'Confirme a atualização da categoria:' : 'Confirme a criação da categoria:'} <strong>{name}</strong></div>
            <div className="flex gap-2">
              <button type="button" onClick={cancelEdit} className="flex-1 border py-3 rounded">Voltar</button>
              <button
                type="button"
                onClick={editingId ? update : async () => { await create(); setStep(1); }}
                className="flex-1 bg-brand-dark text-white py-3 rounded"
              >
                {editingId ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        )}
        {error && <div className="text-red-600 mt-2">{error}</div>}
      </div>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="bg-white p-3 rounded shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">ID: {c.id}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" className="px-3 py-1 border rounded" onClick={() => startEdit(c)}>Editar</button>
              <button type="button" className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => remove(c.id)}>Excluir</button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
