'use client';
import { useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useStoreStatus } from '@/lib/useStoreStatus';
import { STORE_TIMEZONE } from '@/lib/storeHours';

export default function OrderOperations() {
  const status = useStoreStatus();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function update(mode: 'automatic' | 'open' | 'closed') {
    setSaving(true);
    setMessage('');
    try {
      await adminFetch('/api/admin/order-operations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      window.dispatchEvent(new Event('order-operations-updated'));
      setMessage('Funcionamento atualizado.');
    } catch (error: any) {
      setMessage(error.message || 'Não foi possível atualizar o funcionamento.');
    } finally { setSaving(false); }
  }
  const expiry = status?.expiresAt ? new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIMEZONE, dateStyle: 'short', timeStyle: 'short' }).format(new Date(status.expiresAt)) : '';
  const label = !status ? 'Consultando funcionamento...' : status.mode === 'closed'
    ? 'FECHADO MANUALMENTE' : status.mode === 'open' ? 'ABERTO MANUALMENTE' : 'HORÁRIO PADRÃO';
  return <section className="mb-4 rounded-2xl bg-white p-4 shadow" aria-labelledby="order-operations-title">
    <h2 id="order-operations-title" className="text-lg font-semibold">Funcionamento dos pedidos</h2>
    <p className="mt-3 font-medium" role="status">{label}</p>
    {status && <p className="mt-1 text-sm text-gray-600">{status.mode === 'open'
      ? expiry ? `Abertura temporária anterior: até ${expiry}. Abra novamente para remover esse prazo.`
        : 'Abertura manual sem expiração. Continuará ativa até nova ação.'
      : status.mode === 'closed' ? 'Fechamento manual ativo até nova ação.'
        : `Horários cadastrados em Configurações (${status.timezone}). ${status.label}`}</p>}
    <p className="mt-2 text-sm text-gray-600">A loja permanecerá aberta até você fechar manualmente ou retornar ao horário padrão.</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <button type="button" disabled={saving || !status} onClick={() => update('open')} className="min-h-12 rounded bg-brand-dark px-4 py-3 text-white disabled:opacity-60">Abrir pedidos agora</button>
      <button type="button" disabled={saving || !status} onClick={() => update('closed')} className="min-h-12 rounded border border-red-300 px-4 py-3 text-red-700 disabled:opacity-60">Fechar agora</button>
      <button type="button" disabled={saving || !status} onClick={() => update('automatic')} className="min-h-12 rounded border px-4 py-3 disabled:opacity-60">Horário padrão</button>
    </div>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
  </section>;
}
