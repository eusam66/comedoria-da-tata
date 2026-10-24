import { defaultQuestions, PAYMENT_LABELS, type PublicCommerce } from '@/lib/commercial';
import { money } from '@/lib/pricing';
const days: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};
export default function CommerceSections({
  data,
  status,
}: {
  data: PublicCommerce;
  status?: string;
}) {
  const faq = data.faq.length ? data.faq : data.defaultFaq ? defaultQuestions(data, status) : [];
  return (
    <div className="commerce-sections">
      {(data.deliveryEnabled || data.pickupEnabled) && (
        <section className="commerce-section" aria-labelledby="delivery-title">
          <p className="eyebrow">ANTES DE PEDIR</p>
          <h2 id="delivery-title">Entrega e retirada</h2>
          <div className="commerce-columns">
            {data.deliveryEnabled && (
              <div>
                <h3>Entrega</h3>
                {data.deliveryInfo && <p>{data.deliveryInfo}</p>}
                {data.deliveryTime && (
                  <p>Estimativa informada: {data.deliveryTime}. O tempo pode variar.</p>
                )}
                {data.zones.length > 0 && (
                  <>
                    <p>Localizações atendidas e taxas cadastradas:</p>
                    <ul className="delivery-rates">
                      {data.zones.map((z) => (
                        <li key={z.id}>
                          <span>{z.name}</span>
                          <b>{money(z.fee)}</b>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {data.pickupEnabled && (
              <div>
                <h3>Retirada</h3>
                {data.pickupInfo && <p>{data.pickupInfo}</p>}
                {data.address && (
                  <p>
                    {data.address}
                    {data.neighborhood ? ` · ${data.neighborhood}` : ''} · Chã Grande, PE
                  </p>
                )}
              </div>
            )}
          </div>
          {data.orderNotice && <p className="commercial-notice">{data.orderNotice}</p>}
        </section>
      )}
      <section className="commerce-section" aria-labelledby="payment-title">
        <h2 id="payment-title">Formas de pagamento</h2>
        <p>{Object.values(PAYMENT_LABELS).join(' · ')} — opções disponíveis no checkout.</p>
        {data.paymentNotice && <p>{data.paymentNotice}</p>}
      </section>
      {data.testimonials.length > 0 && (
        <section className="commerce-section" aria-labelledby="testimonials-title">
          <p className="eyebrow">DEPOIMENTOS PUBLICADOS PELA COMEDORIA</p>
          <h2 id="testimonials-title">O que nossos clientes dizem</h2>
          <div className="testimonial-grid">
            {data.testimonials.map((t) => (
              <blockquote key={t.id}>
                <p>{t.text}</p>
                <cite>{t.displayName}</cite>
              </blockquote>
            ))}
          </div>
        </section>
      )}
      {faq.length > 0 && (
        <section className="commerce-section" aria-labelledby="faq-title">
          <h2 id="faq-title">Dúvidas frequentes</h2>
          <div className="faq-list">
            {faq.map((q) => (
              <details key={q.id}>
                <summary>{q.question}</summary>
                <p>{q.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
      {(data.about || data.address || data.openingHours.length > 0) && (
        <section className="commerce-section" aria-labelledby="about-title">
          <p className="eyebrow">CHÃ GRANDE · PERNAMBUCO</p>
          <h2 id="about-title">Conheça a Comedoria</h2>
          {data.about && <p>{data.about}</p>}
          <div className="commerce-columns">
            {data.address && (
              <div>
                <h3>Onde estamos</h3>
                <p>
                  {data.address}
                  {data.neighborhood ? ` · ${data.neighborhood}` : ''} · Chã Grande, Pernambuco
                </p>
              </div>
            )}
            {data.openingHours.length > 0 && (
              <div>
                <h3>Horário padrão · America/Recife</h3>
                <ul>
                  {data.openingHours.map((d) => (
                    <li key={d.day}>
                      {days[d.day]}: {d.open} às {d.close}
                    </li>
                  ))}
                </ul>
                <p>
                  Consulte o status no topo do cardápio para saber se estamos recebendo pedidos
                  agora.
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
