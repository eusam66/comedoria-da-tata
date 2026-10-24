export const PUBLIC_SITE_URL = 'https://comedoria-da-tata.vercel.app';
export const PAYMENT_LABELS = { pix: 'Pix', cash: 'Dinheiro', card: 'Cartão' } as const;
export type FAQ = {
  id: string;
  question: string;
  answer: string;
  published: boolean;
  position: number;
};
export type Testimonial = {
  id: string;
  displayName: string;
  text: string;
  consent: boolean;
  consentNote: string;
  consentRecordedAt?: string;
  published: boolean;
  position: number;
};
export type Commercial = {
  about: string;
  deliveryInfo: string;
  pickupInfo: string;
  paymentNotice: string;
  defaultFaq: boolean;
  faq: FAQ[];
  testimonials: Testimonial[];
};
export const EMPTY_COMMERCIAL: Commercial = {
  about: '',
  deliveryInfo: '',
  pickupInfo: '',
  paymentNotice: '',
  defaultFaq: true,
  faq: [],
  testimonials: [],
};
function text(value: unknown, max: number) {
  if (typeof value !== 'string' || value.length > max)
    throw new Error(`Texto comercial inválido (máximo ${max} caracteres).`);
  return value.trim();
}
function flag(value: unknown) {
  if (typeof value !== 'boolean') throw new Error('Estado de publicação inválido.');
  return value;
}
function entry(row: any) {
  if (
    !row ||
    typeof row.id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,80}$/.test(row.id) ||
    !Number.isInteger(row.position) ||
    row.position < 0 ||
    row.position > 999
  )
    throw new Error('Registro comercial inválido.');
  return { id: row.id, position: row.position, published: flag(row.published) };
}
export function validateCommercial(
  input: any,
  previous: Commercial = EMPTY_COMMERCIAL
): Commercial {
  if (
    !input ||
    typeof input !== 'object' ||
    !Array.isArray(input.faq) ||
    input.faq.length > 20 ||
    !Array.isArray(input.testimonials) ||
    input.testimonials.length > 30
  )
    throw new Error('Conteúdo comercial inválido.');
  const faq = input.faq.map((r: any) => {
    const row = { ...entry(r), question: text(r.question, 180), answer: text(r.answer, 1600) };
    if (!row.question || !row.answer) throw new Error('Preencha pergunta e resposta.');
    return row;
  });
  const testimonials = input.testimonials.map((r: any) => {
    const row = {
      ...entry(r),
      displayName: text(r.displayName, 80),
      text: text(r.text, 1200),
      consent: flag(r.consent),
      consentNote: text(r.consentNote ?? '', 300),
    };
    if (!row.displayName || !row.text) throw new Error('Preencha nome de exibição e depoimento.');
    if (row.published && !row.consent)
      throw new Error('Registre a autorização antes de publicar o depoimento.');
    const old = previous.testimonials.find((t) => t.id === row.id);
    const consentRecordedAt = row.consent
      ? old?.consent && old.text === row.text && old.displayName === row.displayName
        ? old.consentRecordedAt || new Date().toISOString()
        : new Date().toISOString()
      : undefined;
    return { ...row, ...(consentRecordedAt ? { consentRecordedAt } : {}) };
  });
  for (const rows of [faq, testimonials])
    if (new Set(rows.map((r: any) => r.id)).size !== rows.length)
      throw new Error('Registros comerciais duplicados.');
  return {
    about: text(input.about, 2000),
    deliveryInfo: text(input.deliveryInfo, 1200),
    pickupInfo: text(input.pickupInfo, 1200),
    paymentNotice: text(input.paymentNotice, 800),
    defaultFaq: flag(input.defaultFaq),
    faq,
    testimonials,
  };
}
export function publicCommercial(value: Commercial) {
  const sort = <T extends { position: number }>(rows: T[]) =>
    [...rows].sort((a, b) => a.position - b.position);
  return {
    about: value.about,
    deliveryInfo: value.deliveryInfo,
    pickupInfo: value.pickupInfo,
    paymentNotice: value.paymentNotice,
    defaultFaq: value.defaultFaq,
    faq: sort(value.faq.filter((r) => r.published && r.question && r.answer)).map(
      ({ id, question, answer }) => ({ id, question, answer })
    ),
    testimonials: sort(
      value.testimonials.filter(
        (r) => r.published && r.consent && r.consentRecordedAt && r.text && r.displayName
      )
    ).map(({ id, displayName, text }) => ({ id, displayName, text })),
  };
}
export type PublicCommercialContent = ReturnType<typeof publicCommercial>;
export type PublicCommerce = PublicCommercialContent & {
  name: string;
  phone: string;
  address: string;
  neighborhood: string;
  deliveryTime: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  orderNotice: string;
  zones: { id: string; name: string; fee: number }[];
  openingHours: { day: string; open: string; close: string }[];
};
export function defaultQuestions(data: PublicCommerce, status?: string) {
  const questions = [
    {
      id: 'order',
      question: 'Como fazer um pedido?',
      answer:
        'Escolha os produtos, confira a sacola e preencha os dados no checkout. Depois do registro, abra o WhatsApp para enviar a mensagem manualmente.',
    },
    {
      id: 'whatsapp',
      question: 'Abrir o WhatsApp já envia meu pedido?',
      answer:
        'Não. O pedido é registrado no site e a mensagem fica pronta no WhatsApp. Confira e toque em enviar dentro do aplicativo.',
    },
  ];
  if (data.deliveryEnabled && data.zones.length)
    questions.push({
      id: 'fee',
      question: 'Como funciona a taxa de entrega?',
      answer:
        'A taxa depende da localização selecionada e aparece no resumo antes da confirmação. Consulte as zonas e valores em Entrega e retirada.',
    });
  if (status)
    questions.push({
      id: 'hours',
      question: 'A loja está recebendo pedidos agora?',
      answer: status,
    });
  return questions;
}
