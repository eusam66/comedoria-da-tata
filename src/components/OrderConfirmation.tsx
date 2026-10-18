'use client';
import { useState } from 'react';
import { buildOrderMessage, whatsappUrl, type SavedOrder } from '@/lib/whatsapp';

export default function OrderConfirmation({ order }: { order: SavedOrder }) {
  const [copyStatus, setCopyStatus] = useState('');
  const message = buildOrderMessage(order);
  const href = whatsappUrl(message);
  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopyStatus('Mensagem copiada. Cole na conversa e confirme o envio.');
    } catch {
      setCopyStatus('Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.');
    }
  }
  return <section className="order-confirmation" aria-label="Pedido registrado">
    <h2>Pedido registrado</h2>
    <p><strong>Código: {order.code}</strong></p>
    <div className="receipt-summary" aria-label="Resumo do pedido registrado">
      <ul>{order.items.map((item, index) => <li key={index}>{item.quantity}x {item.name}</li>)}</ul>
      <p>Atendimento: {order.fulfillment?.type === 'pickup' ? 'Retirada' : 'Entrega'}</p>
      {order.fulfillment?.type === 'delivery' && <p>
        {order.fulfillment.delivery_zone_name} — Taxa: {order.fulfillment.delivery_fee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </p>}
      <p><strong>Total: {(order.totalCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></p>
    </div>
    <p>Seu pedido foi salvo. Toque para enviar o pedido pelo WhatsApp e confirme o envio dentro do aplicativo.</p>
    <p>Abrir a conversa não envia a mensagem automaticamente.</p>
    <div className="order-confirmation-actions">
      {href ? (
        <a className="order-confirmation-action order-confirmation-whatsapp" href={href} target="_blank" rel="noopener noreferrer">ABRIR WHATSAPP</a>
      ) : (
        <button className="order-confirmation-action order-confirmation-whatsapp" type="button" disabled aria-describedby="order-whatsapp-unavailable">ABRIR WHATSAPP</button>
      )}
      <button className="order-confirmation-action order-confirmation-copy" type="button" onClick={copy}>COPIAR MENSAGEM</button>
    </div>
    {!href && <p id="order-whatsapp-unavailable" role="status">WhatsApp indisponível neste ambiente. A mensagem continua disponível para cópia.</p>}
    <p role="status">{copyStatus}</p>
    <label>Resumo e mensagem do pedido
      <textarea aria-label="Mensagem do pedido" readOnly value={message} rows={12} />
    </label>
  </section>;
}
