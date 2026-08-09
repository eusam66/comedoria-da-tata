'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type RecoveryTokens = { accessToken: string; refreshToken: string };

export default function ResetPasswordPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<RecoveryTokens | null>(null);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    let accessToken = params.get('access_token') || '';
    let refreshToken = params.get('refresh_token') || '';
    const stored = sessionStorage.getItem('comedoria-recovery');
    if ((!accessToken || !refreshToken) && stored) {
      try {
        const parsed = JSON.parse(stored) as RecoveryTokens;
        accessToken = parsed.accessToken;
        refreshToken = parsed.refreshToken;
      } catch { /* invalid recovery data is handled below */ }
    }
    const recovery = params.get('type') === 'recovery' || Boolean(stored);
    window.history.replaceState(null, '', '/admin/reset-password');
    sessionStorage.removeItem('comedoria-recovery');
    if (recovery && accessToken && refreshToken) setTokens({ accessToken, refreshToken });
    else setInvalid(true);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!tokens) return setError('Link de recuperação inválido ou expirado.');
    if (password !== confirmation) return setError('As senhas não coincidem.');
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      return setError('Use pelo menos 8 caracteres, com maiúscula, minúscula e número.');
    }
    setLoading(true);
    const response = await fetch('/api/auth/update-password', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...tokens, password })
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) return setError(result.error || 'Não foi possível atualizar a senha.');
    sessionStorage.removeItem('comedoria-recovery');
    setTokens(null); setPassword(''); setConfirmation(''); setSuccess(true);
    window.setTimeout(() => router.replace('/admin/login'), 1800);
  }

  return <main className="min-h-screen grid place-items-center bg-brand-beige p-4">
    <form onSubmit={submit} className="w-full max-w-sm rounded bg-white p-6 shadow-md">
      <h1 className="mb-2 text-xl font-display">Criar nova senha</h1>
      {invalid && <div className="mb-4 text-sm text-red-600">Link inválido ou expirado. Solicite uma nova recuperação.</div>}
      {success && <div className="mb-4 text-sm text-green-700">Senha atualizada. Redirecionando para o login...</div>}
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      {!invalid && !success && <>
        <label className="mb-2 block text-sm">Nova senha</label>
        <input required type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-3 w-full rounded border px-3 py-2" />
        <label className="mb-2 block text-sm">Confirmar nova senha</label>
        <input required type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className="mb-4 w-full rounded border px-3 py-2" />
        <p className="mb-4 text-xs text-gray-600">Mínimo de 8 caracteres, com maiúscula, minúscula e número.</p>
        <button disabled={loading || !tokens} className="w-full rounded bg-brand-dark py-2 text-white">{loading ? 'Atualizando...' : 'Salvar nova senha'}</button>
      </>}
    </form>
  </main>;
}
