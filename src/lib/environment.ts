const PRODUCTION_REF = 'kjxivrltvdiswpaxjowa';

// Não permitir mistura de projetos quando a execução é declarada homologação.
export function validateHomologationEnvironment(env: Record<string, string | undefined>) {
  if (env.NEXT_PUBLIC_APP_ENV !== 'homologacao') return;
  const expected = env.SUPABASE_EXPECTED_PROJECT_REF;
  if (!expected || expected === PRODUCTION_REF) throw new Error('Configure o project ref exclusivo de homologação.');
  const target = `https://${expected}.supabase.co`;
  for (const key of ['SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']) {
    if (env[key]?.replace(/\/$/, '') !== target) throw new Error(`${key} deve apontar exclusivamente para homologação.`);
  }
  if (env.NEXT_PUBLIC_SITE_URL?.includes('comedoria-da-tata.vercel.app'))
    throw new Error('A URL pública de homologação não pode apontar para produção.');
}
