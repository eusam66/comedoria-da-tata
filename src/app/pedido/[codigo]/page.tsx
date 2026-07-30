import React from 'react';
import { notFound } from 'next/navigation';
import { adminGetOrderByCode } from '../../../lib/adminApi';

export async function generateMetadata({ params }: { params: { codigo: string } }) {
  const order = await adminGetOrderByCode(params.codigo);
  if (!order) return { title: 'Pedido não encontrado' };
  return { title: `Pedido ${order.code} — Comedoria da Tata`, description: `Status atual: ${order.status}` };
}

export default async function OrderPage({ params }: { params: { codigo: string } }) {
  const order = await adminGetOrderByCode(params.codigo);
  if (!order) return notFound();

  const timeline = ['Novo','Confirmado','Em preparo','Saiu para entrega','Entregue'];

  return (
    <main className="min-h-screen bg-brand-beige p-6">
      <div className="container mx-auto">
        <div className="bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-display mb-2">Pedido {order.code}</h1>
          <div className="text-sm text-gray-600 mb-4">Total: R$ {order.total.toFixed(2)}</div>

          <div className="space-y-3">
            {timeline.map((t)=> (
              <div key={t} className={`p-3 rounded border ${order.status===t ? 'bg-brand-orange text-white' : ''}`}>
                <div className="font-medium">{t}</div>
                {/* Você poderia exibir timestamps reais por status quando disponível */}
              </div>
            ))}

            {order.status==='Cancelado' && <div className="text-red-600">Pedido cancelado</div>}
          </div>

          <div className="mt-6">
            <h3 className="font-semibold">Itens</h3>
            <ul className="list-disc pl-5">
              {order.items.map((it:any)=> (
                <li key={it.dishId}>{it.name} x{it.quantity} — R$ {it.price.toFixed(2)}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
