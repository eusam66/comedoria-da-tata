'use client';

import { useAdminEditor } from '@/lib/useAdminEditor';
import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { adminFetch } from '@/lib/adminFetch';
import { formatMoney, validateZonePayload } from '@/lib/deliveryZones';
import type { AdminDeliveryZone } from '@/lib/deliveryZones';
import { toastSuccess } from '@/lib/toast';
import AdminField from './AdminField';

const emptyForm = { name: '', fee: '', is_active: true, position: '0' };
const buttonClass = 'min-h-[44px] rounded border px-3 py-2 text-sm disabled:opacity-50';

export default function DeliveryZonesSettings() {
  const [zones, setZones] = useState<AdminDeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null | undefined>(undefined);
  const [form, setForm] = useState(emptyForm);

  const editor = useAdminEditor(editing ?? null, JSON.stringify(form));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setZones(await adminFetch<AdminDeliveryZone[]>('/api/admin/delivery-zones')); }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível carregar as taxas.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function applySaved(zone: AdminDeliveryZone) {
    setZones((current) => [...current.filter((item) => item.id !== zone.id), zone]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name) || a.id.localeCompare(b.id)));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = validateZonePayload({ ...form, position: /^\d+$/.test(form.position) ? Number(form.position) : NaN });
      const zone = await adminFetch<AdminDeliveryZone>(
        editing ? `/api/admin/delivery-zones/${editing}` : '/api/admin/delivery-zones',
        { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
      );
      applySaved(zone);
      setEditing(undefined);
      editor.finish(zone.id);
      toastSuccess('Localização salva');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar a localização.'); }
    finally { setSaving(false); }
  }

  async function toggle(zone: AdminDeliveryZone) {
    setSaving(true);
    setError('');
    try {
      applySaved(await adminFetch<AdminDeliveryZone>(`/api/admin/delivery-zones/${zone.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !zone.is_active }),
      }));
      toastSuccess(zone.is_active ? 'Localização desativada' : 'Localização ativada');
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível alterar o status.'); }
    finally { setSaving(false); }
  }

  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow" aria-labelledby="delivery-zones-title">
      <h2 id="delivery-zones-title" className="text-xl font-display">Taxas de entrega</h2>
      <p className="mt-1 text-sm text-gray-600">Cadastre os locais atendidos e suas taxas. A ordem define a exibição no checkout.</p>
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {loading ? <p className="mt-3 text-sm">Carregando localizações...</p> : (
        <>
          <div className="mt-3 space-y-3">
            {zones.map((zone) => (
              <article key={zone.id} data-admin-item={zone.id} tabIndex={-1} data-updated={editor.highlighted === zone.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 break-words font-semibold">{zone.name}</h3>
                  <b>{formatMoney(zone.fee)}</b>
                </div>
                <p className="mt-1 text-sm text-gray-600"><span className={zone.is_active ? 'text-green-700' : 'text-gray-600'}>{zone.is_active ? 'Ativo' : 'Inativo'}</span> · Ordem {zone.position}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" className={buttonClass} disabled={saving || editing !== undefined} onClick={() => {
                    if (!editor.begin(zone.id)) return;
                    setEditing(zone.id);
                    setError('');
                    setForm({ name: zone.name, fee: zone.fee.toFixed(2).replace('.', ','), is_active: zone.is_active, position: String(zone.position) });
                  }}>Editar</button>
                  <button type="button" className={buttonClass} disabled={saving || editing !== undefined} onClick={() => toggle(zone)}>{zone.is_active ? 'Desativar' : 'Ativar'}</button>
                </div>
              </article>
            ))}
            {!zones.length && <p className="text-sm text-gray-600">Nenhuma localização cadastrada.</p>}
          </div>
          {editing === undefined ? <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={saving} className={buttonClass} onClick={() => { editor.begin('new-zone'); setForm(emptyForm); setEditing(null); setError(''); }}>+ Adicionar localização</button>
            <button type="button" disabled={saving} className={buttonClass} onClick={() => load()}>Atualizar lista</button>
          </div> : (
            <form onSubmit={save} className="mt-4 space-y-3 rounded-xl border p-3">
              <h3 ref={editor.headingRef} tabIndex={-1} className="admin-editor-heading font-semibold">{editing ? `EDITANDO: ${form.name}` : 'Adicionar localização'}</h3>
              <AdminField label="Nome da localização" help="Nome mostrado ao cliente na escolha da entrega.">
                <input required maxLength={100} className="w-full rounded border p-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </AdminField>
              <AdminField label="Taxa de entrega (R$)" help="Use vírgula ou ponto e até duas casas decimais, sem separador de milhares.">
                <input required inputMode="decimal" className="w-full rounded border p-3" value={form.fee} onChange={(event) => setForm({ ...form, fee: event.target.value })} />
              </AdminField>
              <AdminField label="Status" help="Somente localizações ativas aparecem no checkout.">
                <select className="w-full rounded border bg-white p-3" value={String(form.is_active)} onChange={(event) => setForm({ ...form, is_active: event.target.value === 'true' })}><option value="true">Ativo</option><option value="false">Inativo</option></select>
              </AdminField>
              <AdminField label="Ordem" help="Números menores aparecem primeiro. Edite este campo para reordenar.">
                <input required inputMode="numeric" className="w-full rounded border p-3" value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} />
              </AdminField>
              <div className="flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className={`${buttonClass} bg-brand-dark text-white`}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button type="button" disabled={saving} className={buttonClass} onClick={() => editor.cancel(() => { setEditing(undefined); setError(''); })}>Cancelar</button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
