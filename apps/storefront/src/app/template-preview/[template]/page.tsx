import { notFound } from "next/navigation";
import { isTemplateKey, productQueries, TEMPLATES, templateImage } from "@repo/core";
import Sections from "@/components/sections/Sections";
import StoreHeader from "@/components/StoreHeader";
import StoreFooter from "@/components/StoreFooter";
import TemplateDemo from "@/components/TemplateDemo";
import { themeStyle } from "@/lib/theme";
import type { Product, PublicStore } from "@/lib/types";

export const metadata = { title: "Storefront design preview", icons: { icon: "data:," }, robots: { index: false, follow: false } };

export default async function TemplatePreview({ params: pendingParams, searchParams: pendingSearchParams }: { params: Promise<{ template: string }>; searchParams: Promise<{ thumbnail?: string; page?: string }> }) {
  const params = await pendingParams;
  const searchParams = await pendingSearchParams;
  if (!isTemplateKey(params.template)) notFound();
  const template = TEMPLATES[params.template];
  const store: PublicStore = {
    id: "template-demo", slug: "template-demo", name: template.name, description: "A collection for your everyday.", logo: null,
    currency: "LKR", taxBps: 0, status: "draft", theme: template.theme,
    pages: template.pages.map(({ slug, title, showInNavigation, navigationPosition, category }) => ({ slug, title, showInNavigation, navigationPosition, category })), features: { shipping: false, discounts: false, analytics: false },
  };
  const sampleSets: Record<string, [string, string, number?][]> = {
    circuit: [["Everyday laptop", "laptop", 18500000], ["Smartphone collection", "phone", 8900000], ["Over-ear headphones", "tech", 1250000], ["Portable workspace", "laptop", 14800000]],
    forge: [["Workshop tool collection", "hand-tools", 750000], ["Workbench essentials", "workshop", 245000], ["Hand tool set", "hand-tools", 890000], ["Project supplies", "workshop", 125000]],
    reef: [["Planted aquarium setup", "aquarium", 1850000], ["Betta collection", "fish", 150000], ["Aquascaping collection", "aquarium", 650000], ["Freshwater fish", "fish", 180000]],
    habitat: [["Everyday lounge sofa", "sofa", 12500000], ["The accent chair", "chair", 3850000], ["Living room collection", "interior", 8750000], ["Compact lounge sofa", "sofa", 9800000]],
    paws: [["The dog collection", "pets", 245000], ["The cat collection", "cat", 180000], ["Playtime essentials", "pets", 125000], ["Daily companions", "cat", 195000]],
    folio: [["The fiction shelf", "books", 245000], ["Weekend reading", "reading", 195000], ["Stories to discover", "books", 285000], ["The reading edit", "reading", 175000]],
    motion: [["Training essentials", "activewear"], ["The everyday layer", "casualwear"], ["Everyday trainers", "sneakers"], ["Off-duty collection", "daywear"]],
    runway: [["The new-season edit", "womenswear"], ["Relaxed overshirt", "casualwear"], ["Weekend dress", "daywear"], ["Daily essentials", "fashion"]],
    avenue: [["Everyday dress", "daywear"], ["Classic menswear", "streetwear"], ["Daily trainers", "sneakers"], ["Home essentials", "interior"]],
    muse: [["The weekend edit", "daywear"], ["Everyday layers", "womenswear"], ["Finishing touches", "beauty"], ["The occasion edit", "daywear"]],
    boutique: [["The everyday collection", "fashion"], ["Finishing touches", "beauty"], ["The weekend edit", "fashion"]],
    noir: [["The statement edit", "fashion"], ["Daily essentials", "beauty"], ["The new collection", "fashion"]],
    market: [["Market selection", "produce"], ["The daily brew", "coffee"], ["Fresh favourites", "produce"]],
    flora: [["The indoor garden", "botanical"], ["A greener corner", "botanical"], ["The little things", "objects"]],
    ritual: [["The morning ritual", "beauty"], ["Everyday care", "beauty"], ["The evening collection", "botanical"]],
    bazaar: [["Everyday audio", "tech"], ["The home edit", "interior"], ["Daily essentials", "objects"]],
    pulse: [["Everyday audio", "tech"], ["The essentials", "tech"], ["Your next upgrade", "objects"]],
  };
  const samples = sampleSets[template.key] ?? [["The everyday object", "objects"], ["For your space", "interior"], ["A touch of green", "botanical"]];
  const products: Product[] = Array.from({ length: samples.length }, (_, i) => {
    const [name, image, price] = samples[i % samples.length];
    return { id: `sample-${i}`, slug: `sample-${i}`, name, description: null, priceCents: price ?? 250000 + i * 50000, compareAtPriceCents: null,
      quantity: 10, category: template.pages.filter(page => page.category)[i % (template.pages.filter(page => page.category).length || 1)]?.category || "Sample collection", images: [{ url: templateImage(image), alt: name }], options: [], variants: [] };
  });
  const page = searchParams.page ? template.pages.find(page => page.slug === searchParams.page) : template.pages[0];
  if (!page) notFound();
  const sections = page.sections;
  const lists = Object.fromEntries(productQueries(sections).map((query) => [query.key, (query.category ? products.filter(product => product.category === query.category) : products).slice(0, query.limit)]));
  return (
    <div style={themeStyle(template.theme)} data-buttons={template.theme.settings.buttons} className="min-h-[100dvh] bg-store-bg font-body text-store-fg">
      {!searchParams.thumbnail && <p className="border-b border-store-line px-4 py-3 text-center text-xs text-store-muted">{template.name} design preview. Products and prices are examples; shopping is disabled.</p>}
      <TemplateDemo templateKey={template.key} pages={store.pages}>
        <StoreHeader store={store} />
        <main><Sections sections={sections} ctx={{ store, products: lists, preview: false }} /></main>
        <StoreFooter store={store} />
      </TemplateDemo>
    </div>
  );
}
