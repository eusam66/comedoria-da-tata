// A chave primária já existente serializa tentativas concorrentes. Se a segunda
// RPC falhar, toda a transação (inclusive estoque) é revertida pelo Postgres.
export class IdempotencyConflict extends Error {}

export async function createOrderOnce<T extends { metadata?: { checkout_fingerprint?: string } | null }>(
  fingerprint: string,
  find: () => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  const verify = (order: T) => {
    if (order.metadata?.checkout_fingerprint !== fingerprint)
      throw new IdempotencyConflict('Esta tentativa pertence a outro pedido.');
    return order;
  };
  const existing = await find();
  if (existing) return verify(existing);
  try {
    return await create();
  } catch (error) {
    // Outra instância pode ter concluído enquanto esta aguardava o lock.
    const saved = await find();
    if (saved) return verify(saved);
    throw error;
  }
}
