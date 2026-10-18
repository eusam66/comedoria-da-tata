import { handleOrder } from '@/lib/orderRoute';

// Preserva o cliente legado; expectativas presentes selecionam o contrato V2.
export async function POST(req: Request) {
  return handleOrder(req);
}
