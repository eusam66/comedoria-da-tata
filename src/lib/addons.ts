export type DishAddon = {
  id: string;
  name: string;
  price: number;
  maxQty: number;
  required: boolean;
};

export type SelectedAddon = {
  addonId: string;
  name: string;
  price: number;
  qty: number;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function normalizeDishAddons(input: unknown): DishAddon[] {
  if (!input) return [];

  const rawList = Array.isArray(input)
    ? input
    : typeof input === 'object' && input !== null && Array.isArray((input as any).addons)
      ? (input as any).addons
      : [];

  return rawList
    .map((item: any, idx: number) => {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      if (!name) return null;
      const maxQty = Math.max(1, Math.floor(toNumber(item?.maxQty, 1)));
      return {
        id: typeof item?.id === 'string' && item.id.trim() ? item.id : `addon-${idx + 1}`,
        name,
        price: Math.max(0, toNumber(item?.price, 0)),
        maxQty,
        required: Boolean(item?.required)
      } as DishAddon;
    })
    .filter(Boolean) as DishAddon[];
}

export function serializeDishAddons(addons: DishAddon[]): { addons: DishAddon[] } {
  return {
    addons: addons.map((addon) => ({
      id: addon.id,
      name: addon.name.trim(),
      price: Math.max(0, addon.price),
      maxQty: Math.max(1, Math.floor(addon.maxQty)),
      required: Boolean(addon.required)
    }))
  };
}

export function selectedAddonsTotal(selectedAddons: SelectedAddon[]): number {
  return selectedAddons.reduce((sum, addon) => sum + addon.price * addon.qty, 0);
}

export function selectedAddonsKey(selectedAddons: SelectedAddon[]): string {
  return selectedAddons
    .filter((addon) => addon.qty > 0)
    .sort((a, b) => a.addonId.localeCompare(b.addonId))
    .map((addon) => `${addon.addonId}:${addon.qty}`)
    .join('|');
}
