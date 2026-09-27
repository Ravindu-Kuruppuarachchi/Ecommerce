// Carts live in localStorage per store. The key is versioned so carts saved
// before prices moved to integer cents are ignored rather than misread.
export const cartKey = (storeSlug: string) => `cart-v2-${storeSlug}`;

export interface CartItem {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  image?: string;
}
