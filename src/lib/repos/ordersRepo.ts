import supabase from '../supabase';
import { OrderRow } from '../types';

export const ordersRepo = {
  async list(): Promise<OrderRow[]> {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data as OrderRow[];
  },
  async getByCode(code: string): Promise<OrderRow | null> {
    const { data, error } = await supabase.from('orders').select('*').eq('code', code).maybeSingle();
    if (error) throw error;
    return (data as OrderRow) ?? null;
  },
  async create(payload: { items: any; customer?: OrderRow['metadata']; expected_total_cents: number; idempotencyKey: string }) {
    const response = await fetch('/api/orders/v2', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': payload.idempotencyKey },
      body: JSON.stringify({ customer: payload.customer, items: payload.items, expected_total_cents: payload.expected_total_cents }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Não foi possível registrar o pedido.');
    return result;
  },
  async updateStatus(code: string, newStatus: string) {
    // insert into order_history could be handled on server or via trigger; here we just update
    const order = await this.getByCode(code);
    if (!order) throw new Error('Order not found');
    const previous = order.status;
    const { data, error } = await supabase.from('orders').update({ status: newStatus }).eq('code', code).select().single();
    if (error) throw error;
    // record history
    await supabase.from('order_history').insert([{ order_id: order.id, previous_status: previous, new_status: newStatus }]);
    return data as OrderRow;
  }
};
