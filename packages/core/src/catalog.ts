/** Shared catalog rules used by cards, collection filters and sorting. */
export interface CatalogProduct {
  name: string; category: string | null; description?: string | null;
  priceCents: number; compareAtPriceCents: number | null; quantity: number;
  variants: Array<{ priceCents: number | null; quantity: number }>;
}
export function productSummary(product: CatalogProduct) {
  const prices = product.variants.length ? product.variants.map(v => v.priceCents ?? product.priceCents) : [product.priceCents];
  const price = Math.min(...prices);
  return { price, varies: new Set(prices).size > 1,
    available: product.variants.length ? product.variants.some(v => v.quantity > 0) : product.quantity > 0,
    onSale: product.compareAtPriceCents !== null && product.compareAtPriceCents > price };
}
export type CatalogSort = 'featured' | 'price-asc' | 'price-desc' | 'name';
export function filterCatalog<T extends CatalogProduct>(products: readonly T[], { query = '', category, inStock = false, onSale = false, sort = 'featured' }: { query?: string; category?: string; inStock?: boolean; onSale?: boolean; sort?: CatalogSort }) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const result = products.filter(product => {
    const summary = productSummary(product);
    const haystack = `${product.name} ${product.category ?? ''} ${product.description ?? ''}`.toLocaleLowerCase();
    return (!category || product.category?.toLocaleLowerCase() === category.toLocaleLowerCase()) && terms.every(term => haystack.includes(term)) && (!inStock || summary.available) && (!onSale || summary.onSale);
  });
  if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'price-asc' || sort === 'price-desc') result.sort((a, b) => (productSummary(a).price - productSummary(b).price) * (sort === 'price-asc' ? 1 : -1));
  return result;
}
