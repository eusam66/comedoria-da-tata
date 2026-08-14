'use client';

export class AdminRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminRequestError';
    this.status = status;
  }
}

export async function adminFetch<T>(input: string | URL, init?: Parameters<typeof fetch>[1]): Promise<T> {
  const response = await fetch(input, init);
  const contentType = response.headers.get('content-type') || '';
  let payload: unknown = null;

  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      throw new AdminRequestError('O servidor retornou um JSON inválido.', response.status || 500);
    }
  } else {
    const text = await response.text();
    if (text.trim()) {
      throw new AdminRequestError('O servidor retornou uma resposta inválida.', response.status || 500);
    }
  }

  if (!response.ok) {
    const serverMessage = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as { error?: unknown }).error || '')
      : '';
    const fallback = response.status === 401
      ? 'Sua sessão expirou. Entre novamente.'
      : response.status === 403
        ? 'Você não tem permissão para esta ação.'
        : 'Não foi possível concluir a operação.';
    throw new AdminRequestError(serverMessage || fallback, response.status);
  }

  return payload as T;
}
