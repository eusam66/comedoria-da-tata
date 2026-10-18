// Regras monetárias compartilhadas; o banco continua sendo a autoridade na compra.
export type DishPricing = { price: number; promo_price?: number | null; promo_active?: boolean };
export const cents = (value: number) => Math.round(Number(value) * 100);
export const money = (value: number) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export function validMoney(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 99999999.99 &&
    Math.abs(value * 100 - Math.round(value * 100)) < 0.000001
  );
}
export function pricingError(dish: DishPricing): string | null {
  if (!validMoney(dish.price))
    return 'Informe um preço normal positivo com até duas casas decimais.';
  if (
    dish.promo_price != null &&
    (!validMoney(dish.promo_price) || cents(dish.promo_price) >= cents(dish.price))
  )
    return 'O preço promocional deve ser positivo e inferior ao preço normal, com até duas casas decimais.';
  if (dish.promo_active && dish.promo_price == null)
    return 'Informe um preço promocional válido antes de ativar a promoção.';
  return null;
}
export function hasPromotion(dish: DishPricing): boolean {
  return dish.promo_active === true && dish.promo_price != null && !pricingError(dish);
}
export function effectivePrice(dish: DishPricing): number {
  return hasPromotion(dish) ? Number(dish.promo_price) : Number(dish.price);
}
export function discountPercent(dish: DishPricing): number {
  return dish.promo_price != null && !pricingError({ ...dish, promo_active: false })
    ? Math.round(((cents(dish.price) - cents(dish.promo_price)) * 100) / cents(dish.price))
    : 0;
}
