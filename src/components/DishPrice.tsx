import {
  discountPercent,
  effectivePrice,
  hasPromotion,
  money,
  type DishPricing,
} from '@/lib/pricing';
export default function DishPrice({ dish }: { dish: DishPricing }) {
  return (
    <span className="dish-price">
      {hasPromotion(dish) && (
        <>
          <span className="offer-label">OFERTA · {discountPercent(dish)}% OFF</span>
          <del aria-label="Preço normal">{money(dish.price)}</del>
        </>
      )}
      <strong aria-label={hasPromotion(dish) ? 'Preço promocional' : 'Preço'}>
        {money(effectivePrice(dish))}
      </strong>
    </span>
  );
}
