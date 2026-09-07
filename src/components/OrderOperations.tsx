'use client';
import { useState } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { useStoreStatus } from '@/lib/useStoreStatus';
import { STORE_TIMEZONE } from '@/lib/storeHours';

export default function OrderOperations() {
  const status = useStoreStatus();
  const [until, setUntil] = useState('15:00');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function update(mode: 'automatic' | 'open' | 'closed') {
    setSaving(true);
    setMessage('');
    try {
      await adminFetch('/api/admin/order-operations', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, until }),
      });
      window.dispatchEvent(new Event('order-operations-updated'));
      setMessage('Funcionamento atualizado.');
    } catch (error: any) {
      setMessage(error.message || 'Não foi possível atualizar o funcionamento.');
    } finally { setSaving(false); }
  }
  const expiry = status?.expiresAt ? new Intl.DateTimeFormat('pt-BR', { timeZone: STORE_TIMEZONE, hour: '2-digit', minute: '2-digit' }).format(new Date(status.expiresAt)) : '';
  const label = !status ? 'Consultando funcionamento...' : status.mode === 'closed' || status.temporarilyClosed
    ? '🔴 Pedidos fechados manualmente' : status.mode === 'open'
    ? `🟢 Aberto manualmente até ${expiry}` : status.isOpen
    ? '🟢 Aberto pelo horário normal' : '🔴 Fechado pelo horário normal';
  return <section className="mb-4 rounded-2xl bg-white p-4 shadow" aria-labelledby="order-operations-title">
    <h2 id="order-operations-title" className="text-lg font-semibold">Funcionamento dos pedidos</h2>
    <p className="mt-3 font-medium" role="status">{label}</p>
    <p className="mt-1 text-sm text-gray-600">Automático: sexta, sábado e domingo, das 11h às 15h (horário de Recife).</p>
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-col gap-1 text-sm">Pedidos abertos até
        <input type="time" value={until} onChange={event => setUntil(event.target.value)} className="min-h-12 rounded border p-3" disabled={saving} />
      </label>
      <button type="button" disabled={saving || !status} onClick={() => update('open')} className="min-h-12 rounded bg-brand-dark px-4 py-3 text-white disabled:opacity-60">Abrir pedidos hoje</button>
      <button type="button" disabled={saving || !status} onClick={() => update('closed')} className="min-h-12 rounded border border-red-300 px-4 py-3 text-red-700 disabled:opacity-60">Fechar agora</button>
      <button type="button" disabled={saving || !status} onClick={() => update('automatic')} className="min-h-12 rounded border px-4 py-3 disabled:opacity-60">Voltar ao automático</button>
    </div>
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
  </section>;
}
