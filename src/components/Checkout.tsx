'use client';
import Link from 'next/link';

// Compatibilidade legada: utiliza o checkout que registra pedido, estoque e taxas.
export default function Checkout() {
  return <Link href="/?checkout=1">Continuar para finalizar pedido</Link>;
}
