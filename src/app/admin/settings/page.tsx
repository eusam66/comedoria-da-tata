'use client';
import React, { useEffect, useState } from 'react';
import { toastSuccess, toastError } from '../../../lib/toast';
import { adminFetch } from '../../../lib/adminFetch';
import AdminField from '../../../components/AdminField';

type StoreSettingsForm = {
  name: string;
  phone: string;
  whatsappPhone: string;
  address: string;
  neighborhood: string;
  deliveryTime: string;
  deliveryFee: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  orderNotice: string;
};

const initialForm: StoreSettingsForm = {
  name: 'Comedoria da Tata',
  phone: '',
  whatsappPhone: '',
  address: '',
  neighborhood: '',
  deliveryTime: '30-45 min',
  deliveryFee: '0,00',
  pickupEnabled: true,
  deliveryEnabled: true,
  orderNotice: '',
};

export default function AdminSettings() {
  const [form, setForm] = useState<StoreSettingsForm>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<any>('/api/admin/settings')
      .then((json) => {
        const value = json?.value;
        if (value && typeof value === 'object') {
          setForm({ ...initialForm, ...value });
        }
      })
      .catch((e) => setError(e.message || 'Erro ao carregar configurações'))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      toastSuccess('Configurações salvas');
    } catch (e: any) {
      setError(e.message || 'Erro ao salvar configurações');
      toastError(e?.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-display">Configurações da loja</h1>
      <div className="rounded-2xl bg-white p-4 shadow">
        {loading ? (
          <div className="text-sm text-gray-600">Carregando configurações...</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <AdminField
                label="Nome da loja"
                help="Nome exibido aos clientes no site e nos pedidos."
              >
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex.: Comedoria da Tata"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField
                label="Telefone"
                help="Número usado pelos clientes para entrar em contato com a loja."
              >
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ex.: (11) 3333-4444"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField
                label="WhatsApp da loja"
                help="Número que receberá os pedidos enviados pelo WhatsApp, com DDD."
              >
                <input
                  type="tel"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  placeholder="Ex.: (11) 99999-8888"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField label="Endereço" help="Rua, número e complemento do endereço da loja.">
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Ex.: Rua das Flores, 123"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField label="Bairro" help="Bairro onde a loja está localizada.">
                <input
                  value={form.neighborhood}
                  onChange={(e) => setForm({ ...form, neighborhood: e.target.value })}
                  placeholder="Ex.: Centro"
                  className="w-full rounded border p-3"
                />
              </AdminField>
            </div>
            <div className="space-y-3">
              <AdminField
                label="Tempo médio de entrega"
                help="Estimativa mostrada ao cliente antes de finalizar o pedido."
              >
                <input
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                  placeholder="Ex.: 30–45 minutos"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField
                label="Taxa de entrega"
                help="Valor cobrado pela entrega; use 0,00 quando for grátis."
              >
                <input
                  inputMode="decimal"
                  value={form.deliveryFee}
                  onChange={(e) => setForm({ ...form, deliveryFee: e.target.value })}
                  placeholder="Ex.: 8,00"
                  className="w-full rounded border p-3"
                />
              </AdminField>
              <AdminField
                label="Aviso para os clientes"
                help="Mensagem importante exibida durante o pedido, como horários ou regiões atendidas."
              >
                <textarea
                  value={form.orderNotice}
                  onChange={(e) => setForm({ ...form, orderNotice: e.target.value })}
                  placeholder="Ex.: Pedidos para o almoço devem ser feitos até as 11h"
                  className="min-h-[140px] w-full rounded border p-3"
                />
              </AdminField>
              <label className="block rounded border p-3">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.deliveryEnabled}
                    onChange={(e) => setForm({ ...form, deliveryEnabled: e.target.checked })}
                  />
                  <span>Delivery disponível</span>
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Desmarque para impedir temporariamente novos pedidos com entrega.
                </span>
              </label>
              <label className="block rounded border p-3">
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.pickupEnabled}
                    onChange={(e) => setForm({ ...form, pickupEnabled: e.target.checked })}
                  />
                  <span>Retirada disponível</span>
                </span>
                <span className="mt-1 block text-xs text-gray-500">
                  Desmarque para impedir temporariamente pedidos para retirada na loja.
                </span>
              </label>
            </div>
          </div>
        )}
        <div className="mt-4">
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded bg-brand-dark px-4 py-3 text-white disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      </div>
    </>
  );
}

