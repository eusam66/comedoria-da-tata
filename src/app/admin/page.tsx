'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from './layout';

type DashboardState = {
  dishes: any[];
  categories: any[];
  banners: any[];
  orders: any[];
};

export default function AdminDashboard() {
  const [state, setState] = useState<DashboardState>({ dishes: [], categories: [], banners: [], orders: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/dishes').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json()),
      fetch('/api/admin/banners').then((r) => r.json()),
      fetch('/api/admin/orders').then((r) => r.json())
    ])
      .then(([dishes, categories, banners, orders]) => {
        setState({
          dishes: Array.isArray(dishes) ? dishes : [],
          categories: Array.isArray(categories) ? categories : [],
          banners: Array.isArray(banners) ? banners : [],
          orders: Array.isArray(orders) ? orders : []
        });
      })
      .catch((e) => setError(e.message || 'Erro ao carregar o dashboard'));
  }, []);

  const recent = state.orders.slice(0, 5);
  const activeDishes = state.dishes.filter((dish) => dish.is_available !== false).length;
  const activeCategories = state.categories.filter((category) => category.is_active !== false).length;
  const activeBanners = state.banners.filter((banner) => banner.active !== false).length;

  return (
    <AdminLayout>
      <h1 className="mb-4 text-2xl font-display">Dashboard da loja</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">Pedidos totais: {state.orders.length}</div>
        <div className="rounded-2xl bg-white p-4 shadow">Pratos ativos: {activeDishes}</div>
        <div className="rounded-2xl bg-white p-4 shadow">Categorias ativas: {activeCategories}</div>
        <div className="rounded-2xl bg-white p-4 shadow">Promoções ativas: {activeBanners}</div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 font-semibold">Pedidos recentes</h2>
        <div className="space-y-2">
          {recent.map((order) => (
            <div key={order.code} className="flex justify-between rounded-2xl bg-white p-3 shadow">
              <div>
                <div className="font-medium">{order.code}</div>
                <div className="text-sm text-gray-600">Status: {order.status}</div>
              </div>
              <div className="text-right">R$ {Number(order.total || 0).toFixed(2)}</div>
            </div>
          ))}
          {recent.length === 0 && <div className="text-sm text-gray-600">Nenhum pedido recente.</div>}
        </div>
      </section>
      {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
    </AdminLayout>
  );
}
