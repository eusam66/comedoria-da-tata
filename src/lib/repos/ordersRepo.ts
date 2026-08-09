import supabase from '../supabase';
import { OrderRow } from '../types';
import { generateOrderCode } from '../orders';

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
  async create(payload: { items: any; customer?: any }) {
    const id = crypto.randomUUID();
    const code = generateOrderCode();
    const total = (payload.items || []).reduce((s:any, it:any) => s + (it.price || 0) * (it.quantity || 1), 0);
    const row = { id, code, items: payload.items, total, status: 'Novo', customer: payload.customer || null };
    const { data, error } = await supabase.from('orders').insert([row]).select().single();
    if (error) throw error;
    return data as OrderRow;
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
