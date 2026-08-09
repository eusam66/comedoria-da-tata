'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError(''); setMessage('');
    const response = await fetch('/api/auth/request-password-reset', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email })
    });
    const result = await response.json();
    if (response.ok) setMessage(result.message);
    else setError(result.error || 'Não foi possível enviar o e-mail.');
    setLoading(false);
  }

  return <main className="min-h-screen grid place-items-center bg-brand-beige p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded bg-white p-6 shadow-md">
      <h1 className="mb-2 text-xl font-display">Recuperar senha</h1>
      <p className="mb-4 text-sm text-gray-600">Enviaremos um link seguro para criar uma nova senha.</p>
      {message && <div className="mb-3 text-sm text-green-700">{message}</div>}
      {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
      <label className="mb-2 block text-sm">E-mail</label>
      <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4 w-full rounded border px-3 py-2" />
      <button disabled={loading} className="w-full rounded bg-brand-dark py-2 text-white">{loading ? 'Enviando...' : 'Enviar link de recuperação'}</button>
      <Link href="/admin/login" className="mt-4 block text-center text-sm underline">Voltar ao login</Link>
    </form>
  </main>;
}
