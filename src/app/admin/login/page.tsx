'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: user, password: pass });
      if (error) throw error;
      const session = (data as any)?.session;
      if (!session) throw new Error('No session returned');
      // Send tokens to server to set httpOnly cookies for middleware
      await fetch('/api/auth/set_session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token })
      });
      router.push('/admin');
    } catch (err:any) {
      console.error('login error', err);
      setError(err?.message || 'Erro ao autenticar');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-beige">
      <form onSubmit={onSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-xl font-display mb-4">Entrar — Painel</h2>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <label className="block mb-2 text-sm">Usuário (email)</label>
        <input aria-label="Email do administrador" value={user} onChange={(e) => setUser(e.target.value)} className="w-full border px-3 py-2 rounded mb-3" />
        <label className="block mb-2 text-sm">Senha</label>
                <input aria-label="Senha do administrador" type="password" value={pass} onChange={(e) => setPass(e.target.value)} className="w-full border px-3 py-2 rounded mb-4" />
        <button type="submit" disabled={loading} className="w-full bg-brand-dark text-white py-2 rounded">{loading ? 'Entrando...' : 'Entrar'}</button>
      </form>
    </div>
  );
}
