'use client';
import React, { useEffect, useState } from 'react';
import AdminLayout from '../layout';
import Skeleton from '../../../components/Skeleton';
import { toastSuccess, toastError } from '../../../lib/toast';

const STATUSES = ['Novo','Confirmado','Em preparo','Saiu para entrega','Entregue','Cancelado'] as const;

export default function AdminOrdersPage(){
  const [orders,setOrders]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);

  useEffect(()=>{ fetch('/api/admin/orders').then(r=>r.json()).then((d)=>setOrders(d)).catch(e=>setError(e.message)).finally(()=>setLoading(false)); },[]);

  async function changeStatus(code:string, status:string){
    try{
      await fetch(`/api/admin/orders/${code}`, { method: 'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) });
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      setOrders(data);
    } catch(e:any){ setError(e.message); }
  }

  async function createSample(){
    try{
      const res = await fetch('/api/admin/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: [{ dishId: 'd1', name: 'Pizza Margherita', price: 42.5, quantity: 1 }] }) });
      const json = await res.json();
      setOrders((s)=>[json,...s]);
    } catch(e:any){ setError(e.message); }
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-display">Gerenciamento de Pedidos</h1>
        <div className="flex gap-2">
          <button type="button" onClick={createSample} className="bg-brand-dark text-white px-3 py-2 rounded">Criar pedido</button>
        </div>
      </div>

      {error && <div className="text-red-600 mb-2">{error}</div>}

      {loading ? (
        <Skeleton lines={6} />
      ) : (
        <div className="space-y-4 md:grid md:grid-cols-6 gap-3">
          {STATUSES.map((s, i) => (
            <div key={s} className="bg-white p-3 rounded shadow">
              <div className="font-semibold mb-2">{s}</div>
              <div className="space-y-3">
                {orders.filter(o=>o.status===s).map(o=> (
                  <div key={o.code} className="border p-4 rounded touch-manipulation">
                    <div className="font-medium text-lg">{o.code}</div>
                    <div className="text-base text-gray-600">R$ {Number(o.total || 0).toFixed(2)}</div>
                    <div className="mt-3 flex flex-col gap-2">
                      {STATUSES.map((t)=> t!==s && (
                        <button key={t} type="button" onClick={async ()=>{ try{ await changeStatus(o.code,t); toastSuccess('Status atualizado'); }catch(e:any){ toastError(e?.message || 'Erro'); } }} className="w-full bg-brand-beige hover:bg-brand-orange text-brand-dark py-3 rounded text-sm">Mover p/ {t}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
