'use client';
import React, { useEffect, useState } from 'react';
import Skeleton from '../../../components/Skeleton';
import { toastSuccess, toastError } from '../../../lib/toast';
import { adminFetch } from '../../../lib/adminFetch';

const STATUSES = [
  'Novo',
  'Confirmado',
  'Em preparo',
  'Saiu para entrega',
  'Entregue',
  'Cancelado',
] as const;

type AdminOrder = {
  id: string;
  code: string;
  items: Array<{ dishId?: string; name: string; price: number; quantity: number; notes?: string }>;
  total: number;
  status: (typeof STATUSES)[number];
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  metadata?: {
    payment?: 'pix' | 'card' | 'cash';
    change?: string;
    notes?: string;
    reference?: string;
  } | null;
};

function paymentLabel(order: AdminOrder) {
  if (order.metadata?.payment === 'cash') {
    return `Dinheiro${order.metadata.change ? ` — troco para R$ ${order.metadata.change}` : ''}`;
  }
  if (order.metadata?.payment === 'card') return 'Cartão na entrega';
  if (order.metadata?.payment === 'pix') return 'PIX';
  return null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<AdminOrder[]>('/api/admin/orders')
      .then((d) => setOrders(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function changeStatus(code: string, status: string) {
    try {
      await adminFetch(`/api/admin/orders/${code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await adminFetch<AdminOrder[]>('/api/admin/orders');
      setOrders(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function createSample() {
    try {
      const json = await adminFetch<any>('/api/admin/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ dishId: 'd1', name: 'Pizza Margherita', price: 42.5, quantity: 1 }],
        }),
      });
      setOrders((s) => [json, ...s]);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-display">Gerenciamento de Pedidos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Cada coluna representa a etapa atual do pedido. Use os botões do cartão para mover o
            pedido para a próxima situação.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={createSample}
            className="bg-brand-dark text-white px-3 py-2 rounded"
          >
            Criar pedido
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      {loading ? (
        <Skeleton lines={6} />
      ) : orders.length === 0 ? (
        <div className="rounded bg-white p-4 text-sm text-gray-600 shadow">
          Nenhum pedido encontrado.
        </div>
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {STATUSES.map((s) => (
            <div key={s} className="bg-white p-3 rounded shadow">
              <div className="font-semibold mb-2">{s}</div>
              <div className="space-y-3">
                {orders
                  .filter((o) => o.status === s)
                  .map((o) => (
                    <div key={o.code} className="border p-4 rounded touch-manipulation">
                      <div className="font-medium text-lg">{o.code}</div>
                      <div className="text-base text-gray-600">
                        R$ {Number(o.total || 0).toFixed(2)}
                      </div>
                      {(o.customer_name || o.customer_phone || o.customer_address || o.metadata) && (
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          {o.customer_name && <div>Cliente: {o.customer_name}</div>}
                          {o.customer_phone && <div>Telefone: {o.customer_phone}</div>}
                          {o.customer_address && <div>Endereço: {o.customer_address}</div>}
                          {o.metadata?.reference && <div>Referência: {o.metadata.reference}</div>}
                          {paymentLabel(o) && <div>Pagamento: {paymentLabel(o)}</div>}
                          {o.metadata?.notes && <div>Observações: {o.metadata.notes}</div>}
                        </div>
                      )}
                      <div className="mt-3">
                        <div className="font-semibold text-sm mb-2">Itens</div>
                        <div className="space-y-2 text-sm text-gray-700">
                          {Array.isArray(o.items) ? (
                            o.items.map((item) => (
                              <div
                                key={`${o.code}-${item.dishId || item.name}`}
                                className="rounded border p-2 bg-gray-50"
                              >
                                <div>
                                  {item.quantity}x {item.name}
                                </div>
                                <div className="text-xs text-gray-500">
                                  R$ {Number(item.price).toFixed(2)} cada
                                </div>
                                {item.notes && (
                                  <div className="text-xs text-gray-500">Obs: {item.notes}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div>Nenhum item</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-col gap-2">
                        {STATUSES.map(
                          (t) =>
                            t !== s && (
                              <button
                                key={t}
                                type="button"
                                aria-label={`Alterar pedido ${o.code} para ${t}`}
                                onClick={async () => {
                                  try {
                                    await changeStatus(o.code, t);
                                    toastSuccess('Status atualizado');
                                  } catch (e: any) {
                                    toastError(e?.message || 'Erro');
                                  }
                                }}
                                className="w-full bg-brand-beige hover:bg-brand-orange text-brand-dark py-3 rounded text-sm"
                              >
                                Mover para {t}
                              </button>
                            )
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
