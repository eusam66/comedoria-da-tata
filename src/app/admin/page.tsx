import React, { useEffect, useState } from 'react';
import AdminLayout from './layout';
import { adminListOrders, type Order } from '../../lib/adminApi';

export default async function AdminDashboard() {
  // server component allowed to call async data sources; here adminListOrders is sync mock but fine
  let orders: Order[] = [];
  try {
    orders = (await adminListOrders()) as Order[];
  } catch (err) {
    console.error('adminListOrders unavailable during build', err);
    orders = [];
  }
  const recent = orders.slice(0, 5);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">Pedidos totais: {orders.length}</div>
        <div className="bg-white p-4 rounded shadow">Pratos: —</div>
        <div className="bg-white p-4 rounded shadow">Categorias: —</div>
      </div>

      <section className="mt-6">
        <h2 className="font-semibold mb-3">Pedidos recentes</h2>
        <div className="space-y-2">
          {recent.map((o) => (
            <div key={o.code} className="bg-white p-3 rounded shadow flex justify-between">
              <div>
                <div className="font-medium">{o.code}</div>
                <div className="text-sm text-gray-600">Status: {o.status}</div>
              </div>
              <div className="text-right">R$ {o.total.toFixed(2)}</div>
            </div>
          ))}
          {recent.length === 0 && <div className="text-sm text-gray-600">Nenhum pedido</div>}
        </div>
      </section>
    </AdminLayout>
  );
}
