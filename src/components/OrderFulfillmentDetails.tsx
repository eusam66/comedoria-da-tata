import { formatMoney, readFulfillment } from '@/lib/deliveryZones';

export default function OrderFulfillmentDetails({ metadata, address }: { metadata: unknown; address?: string | null }) {
  const snapshot = readFulfillment(metadata);
  const legacy = metadata && typeof metadata === 'object' ? (metadata as { delivery?: string }).delivery : undefined;
  if ((snapshot?.type || legacy) === 'pickup') return <p>Forma de recebimento: Retirada</p>;
  return <div className="space-y-1">
    <p>Forma de recebimento: Entrega</p>
    {snapshot && <>
      <p>Localização: {snapshot.delivery_zone_name}</p>
      <p>Taxa: {formatMoney(snapshot.delivery_fee)}</p>
      <p>Produtos: {formatMoney(snapshot.subtotal)}</p>
    </>}
    <p>Endereço: {address || '—'}</p>
  </div>;
}
