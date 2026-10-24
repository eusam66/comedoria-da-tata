'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { adminFetch } from '@/lib/adminFetch';
import {
  EMPTY_COMMERCIAL,
  PUBLIC_SITE_URL,
  type Commercial,
  type FAQ,
  type Testimonial,
} from '@/lib/commercial';
import { useAdminEditor } from '@/lib/useAdminEditor';
import { toastError, toastSuccess } from '@/lib/toast';
type Row = Omit<Partial<FAQ & Testimonial>, 'id' | 'position'> & {
  id: string;
  position: number | '';
};
export default function CommercialSettingsEditor() {
  const [value, setValue] = useState<Commercial>(EMPTY_COMMERCIAL);
  const [revision, setRevision] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [info, setInfo] = useState({
    about: '',
    deliveryInfo: '',
    pickupInfo: '',
    paymentNotice: '',
    defaultFaq: true,
  });
  const [editing, setEditing] = useState<{
    kind: 'faq' | 'testimonials';
    id: string;
    isNew: boolean;
  } | null>(null);
  const [draft, setDraft] = useState<Row | null>(null);
  const editor = useAdminEditor(editing?.id || null, JSON.stringify(draft));
  useEffect(() => {
    adminFetch<{ value: Commercial; revision: string }>('/api/admin/commercial')
      .then((data) => {
        setValue(data.value);
        setRevision(data.revision);
        setInfo(data.value);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function persist(next: Commercial, message: string) {
    const data = await adminFetch<{ value: Commercial; revision: string }>(
      '/api/admin/commercial',
      { method: 'PUT', body: JSON.stringify({ value: next, revision }) }
    );
    setValue(data.value);
    setRevision(data.revision);
    setError('');
    toastSuccess(message);
    return data.value;
  }
  const run = (task: () => Promise<void>) =>
    editor.run(async () => {
      try {
        await task();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Não foi possível salvar.';
        setError(message);
        toastError(message);
      }
    });
  function edit(kind: 'faq' | 'testimonials', row?: FAQ | Testimonial) {
    const id = row?.id || crypto.randomUUID();
    if (!editor.begin(row ? `${kind}-${id}` : 'commercial-list')) return;
    setEditing({ kind, id, isNew: !row });
    setDraft(
      row
        ? { ...row }
        : {
            id,
            position: 0,
            published: false,
            question: '',
            answer: '',
            displayName: '',
            text: '',
            consent: false,
            consentNote: '',
          }
    );
    setError('');
  }
  async function saveEntry() {
    if (!editing || !draft) return;
    const normalized = { ...draft, position: draft.position === '' ? 0 : Number(draft.position) };
    const rows = editing.isNew
      ? [...value[editing.kind], normalized]
      : value[editing.kind].map((r) => (r.id === draft.id ? normalized : r));
    await persist(
      { ...value, [editing.kind]: rows } as Commercial,
      editing.kind === 'faq' ? 'Pergunta salva' : 'Depoimento salvo'
    );
    const key = `${editing.kind}-${draft.id}`;
    setEditing(null);
    setDraft(null);
    editor.finish(key);
  }
  async function remove(kind: 'faq' | 'testimonials', id: string) {
    if (!confirm(kind === 'faq' ? 'Excluir esta pergunta?' : 'Excluir este depoimento?')) return;
    await run(async () => {
      await persist(
        { ...value, [kind]: value[kind].filter((r) => r.id !== id) },
        'Registro excluído'
      );
      if (editing?.id === id) {
        setEditing(null);
        setDraft(null);
      }
      editor.removed(`${kind}-${id}`);
    });
  }
  async function move(kind: 'faq' | 'testimonials', from: number, to: number) {
    await run(async () => {
      const rows = [...value[kind]].sort((a, b) => a.position - b.position);
      rows.splice(to, 0, rows.splice(from, 1)[0]);
      await persist(
        { ...value, [kind]: rows.map((r, i) => ({ ...r, position: i })) },
        'Ordem atualizada'
      );
    });
  }
  async function toggle(kind: 'faq' | 'testimonials', row: FAQ | Testimonial) {
    await run(async () => {
      await persist(
        {
          ...value,
          [kind]: value[kind].map((r) => (r.id === row.id ? { ...r, published: !r.published } : r)),
        },
        row.published ? 'Publicação ocultada' : 'Publicação confirmada'
      );
    });
  }
  function field(key: keyof Row, text: string) {
    if (!draft) return;
    setDraft({
      ...draft,
      [key]: text,
      ...(['text', 'displayName'].includes(key) ? { consent: false, published: false } : {}),
    });
  }
  return (
    <section className="commercial-admin mt-6" aria-labelledby="commercial-admin-title">
      <h2 id="commercial-admin-title" className="mb-3 text-xl font-display">
        Conteúdo comercial
      </h2>
      <fieldset disabled={loading || editor.busy} className="min-w-0 space-y-4">
        {loading && <p role="status">Carregando conteúdo comercial…</p>}
        <details className="rounded-2xl bg-white p-4 shadow">
          <summary>Informações comerciais e institucionais</summary>
          <p>
            Campos opcionais. Publique somente informações confirmadas. Formas de pagamento seguem
            as opções existentes no checkout: Pix, dinheiro e cartão.
          </p>
          {(['about', 'deliveryInfo', 'pickupInfo', 'paymentNotice'] as const).map((key, i) => (
            <label className="mt-3 block" key={key}>
              {
                [
                  'Sobre a Comedoria',
                  'Informações gerais de entrega',
                  'Orientações de retirada',
                  'Informações de pagamento',
                ][i]
              }
              <textarea
                className="mt-1 w-full rounded border p-3"
                value={info[key]}
                maxLength={key === 'about' ? 2000 : key === 'paymentNotice' ? 800 : 1200}
                onChange={(e) => setInfo({ ...info, [key]: e.target.value })}
              />
            </label>
          ))}
          <label className="flex min-h-11 items-center gap-2">
            <input
              type="checkbox"
              checked={info.defaultFaq}
              onChange={(e) => setInfo({ ...info, defaultFaq: e.target.checked })}
            />
            Exibir ajuda sobre o funcionamento quando não houver perguntas publicadas
          </label>
          <button
            type="button"
            className="rounded bg-brand-dark p-3 text-white"
            onClick={() =>
              run(async () => {
                await persist({ ...value, ...info }, 'Informações comerciais salvas');
              })
            }
          >
            Salvar informações comerciais
          </button>
        </details>
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3
            ref={editor.headingRef}
            tabIndex={-1}
            className="admin-editor-heading text-lg font-semibold"
          >
            {editing
              ? `EDITANDO: ${
                  draft?.question ||
                  draft?.displayName ||
                  (editing.kind === 'faq' ? 'nova pergunta' : 'novo depoimento')
                }`
              : 'Perguntas e depoimentos'}
          </h3>
          <p>
            Depoimentos exigem autorização e publicação manual. Comprovantes e observações da
            autorização não aparecem publicamente.
          </p>
          <div className="my-3 flex flex-wrap gap-2">
            <button type="button" className="rounded border p-3" onClick={() => edit('faq')}>
              Nova pergunta
            </button>
            <button
              type="button"
              className="rounded border p-3"
              onClick={() => edit('testimonials')}
            >
              Novo depoimento
            </button>
          </div>
          {editing && draft && (
            <div className="space-y-3 rounded border p-3">
              {editing.kind === 'faq' ? (
                <>
                  <label className="block">
                    Pergunta
                    <input
                      className="block w-full rounded border p-3"
                      value={draft.question || ''}
                      maxLength={180}
                      onChange={(e) => field('question', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    Resposta
                    <textarea
                      className="block w-full rounded border p-3"
                      value={draft.answer || ''}
                      maxLength={1600}
                      onChange={(e) => field('answer', e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    Nome de exibição
                    <input
                      className="block w-full rounded border p-3"
                      value={draft.displayName || ''}
                      maxLength={80}
                      placeholder="Use identificação parcial se necessário"
                      onChange={(e) => field('displayName', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    Texto autorizado do depoimento
                    <textarea
                      className="block w-full rounded border p-3"
                      value={draft.text || ''}
                      maxLength={1200}
                      onChange={(e) => field('text', e.target.value)}
                    />
                  </label>
                  <p className="text-sm">
                    Ao alterar nome ou texto, confirme novamente a autorização para esse conteúdo.
                  </p>
                  <label className="block">
                    Registro da autorização (privado)
                    <textarea
                      className="block w-full rounded border p-3"
                      value={draft.consentNote || ''}
                      maxLength={300}
                      onChange={(e) => field('consentNote', e.target.value)}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!draft.consent}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          consent: e.target.checked,
                          ...(!e.target.checked ? { published: false } : {}),
                        })
                      }
                    />
                    Tenho autorização para publicar este nome e este texto
                  </label>
                </>
              )}
              <label className="block">
                Ordem
                <input
                  className="block w-full rounded border p-3"
                  type="number"
                  min={0}
                  max={999}
                  step={1}
                  value={draft.position}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      position: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="flex min-h-11 items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!draft.published}
                  disabled={editing.kind === 'testimonials' && !draft.consent}
                  onChange={(e) => setDraft({ ...draft, published: e.target.checked })}
                />
                Publicar no site
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-brand-dark p-3 text-white"
                  onClick={() => run(saveEntry)}
                >
                  {editor.busy ? 'Salvando…' : 'Salvar registro'}
                </button>
                <button
                  type="button"
                  className="rounded border p-3"
                  onClick={() =>
                    editor.cancel(() => {
                      setEditing(null);
                      setDraft(null);
                    })
                  }
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        {error && (
          <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
            {error}
          </p>
        )}
        <div
          data-admin-list
          data-admin-item="commercial-list"
          tabIndex={-1}
          aria-label="Conteúdo comercial cadastrado"
          className="space-y-4"
        >
          {(['faq', 'testimonials'] as const).map((kind) => {
            const rows = [...value[kind]].sort((a, b) => a.position - b.position);
            return (
              <section key={kind} className="rounded-2xl bg-white p-4 shadow">
                <h3 className="text-lg font-semibold">
                  {kind === 'faq' ? 'Dúvidas frequentes' : 'Depoimentos'}
                </h3>
                {!rows.length && (
                  <p>Nenhum registro cadastrado. Não são publicados exemplos fictícios.</p>
                )}
                {rows.map((row, i) => (
                  <article
                    key={row.id}
                    data-admin-item={`${kind}-${row.id}`}
                    data-updated={editor.highlighted === `${kind}-${row.id}`}
                    tabIndex={-1}
                    className="mt-3 rounded border p-3"
                  >
                    <b>{'question' in row ? row.question : row.displayName}</b>
                    <p className="whitespace-pre-wrap">{'answer' in row ? row.answer : row.text}</p>
                    <p>
                      {row.published ? 'Publicado' : 'Oculto'}
                      {'consent' in row
                        ? ` · ${row.consent ? 'Autorização registrada' : 'Sem autorização'}`
                        : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border p-2"
                        onClick={() => edit(kind, row)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="rounded border p-2"
                        disabled={'consent' in row && !row.consent}
                        onClick={() => toggle(kind, row)}
                      >
                        {row.published ? 'Ocultar' : 'Publicar'}
                      </button>
                      <button
                        type="button"
                        className="rounded border p-2"
                        aria-label={`Subir ${kind === 'faq' ? 'pergunta' : 'depoimento'} ${i + 1}`}
                        disabled={i === 0}
                        onClick={() => move(kind, i, i - 1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="rounded border p-2"
                        aria-label={`Descer ${kind === 'faq' ? 'pergunta' : 'depoimento'} ${i + 1}`}
                        disabled={i === rows.length - 1}
                        onClick={() => move(kind, i, i + 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="rounded border border-red-300 p-2 text-red-800"
                        onClick={() => remove(kind, row.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      </fieldset>
      <QrDownloads />
    </section>
  );
}
function QrDownloads() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function download(format: 'png' | 'svg') {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/menu-qr?format=' + format, { cache: 'no-store' });
      if (!response.ok)
        throw new Error('Não foi possível baixar o QR Code. Confira sua sessão e tente novamente.');
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `cardapio-comedoria-da-tata.${format}`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess('QR Code preparado para download');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha no download.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 rounded-2xl bg-white p-4 shadow" aria-labelledby="qr-title">
      <h3 id="qr-title" className="text-lg font-semibold">
        QR Code do cardápio
      </h3>
      <p className="break-all">Destino: {PUBLIC_SITE_URL}/</p>
      <Image
        src="/api/admin/menu-qr?format=png"
        width={256}
        height={256}
        unoptimized
        alt="QR Code do cardápio da Comedoria da Tata"
        className="max-w-full"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          className="rounded bg-brand-dark p-3 text-white"
          onClick={() => download('png')}
        >
          BAIXAR QR CODE PNG
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded border p-3"
          onClick={() => download('svg')}
        >
          Baixar SVG
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
