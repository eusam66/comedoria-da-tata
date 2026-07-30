import React from 'react';
import AdminLayout from '../layout';

export default function AdminSettings(){
  return (
    <AdminLayout>
      <h1 className="text-2xl font-display mb-4">Configurações do restaurante</h1>
      <div className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Nome</label>
            <input aria-label="Nome do restaurante" className="w-full border p-2 rounded" defaultValue="Comedoria da Tata" />
          </div>
          <div>
            <label className="block text-sm mb-1">Telefone</label>
            <input aria-label="Telefone do restaurante" className="w-full border p-2 rounded" defaultValue="(11) 99999-9999" />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-1">Endereço</label>
          <input aria-label="Endereço do restaurante" className="w-full border p-2 rounded" defaultValue="Endereço fictício" />
        </div>
      </div>
    </AdminLayout>
  );
}
