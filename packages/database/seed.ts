import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeOrderTotals, TEMPLATES, type Section } from "@repo/core";

const prisma = new PrismaClient();

const products = [
  { name: "Espresso", category: "Coffee", price: 650_00, quantity: 50, image: "photo-1510707577719-ae7c14805e3a",
    description: "Rich single shot pulled from beans roasted in Kandy." },
  { name: "Cappuccino", category: "Coffee", price: 950_00, quantity: 45, image: "photo-1572442388796-11668a67e53d",
    description: "Espresso with silky microfoam and a dusting of cocoa." },
  { name: "Latte", category: "Coffee", price: 1_050_00, quantity: 40, image: "photo-1461023058943-07fcbe16d735",
    description: "Smooth espresso with steamed milk and a thin layer of foam." },
  { name: "Iced Coffee", category: "Iced", price: 900_00, quantity: 60, image: "photo-1517701550927-30cf4ba1dba5",
    description: "Cold-brewed for 20 hours and served over ice." },
  { name: "Chocolate Croissant", category: "Pastry", price: 750_00, quantity: 30, image: "photo-1530610476181-d83430b64dcd",
    description: "Flaky butter croissant filled with dark chocolate, baked every morning." },
  { name: "Mocha", category: "Coffee", price: 1_150_00, quantity: 35, image: "photo-1578314675249-a6910f80cc4e",
    description: "Espresso, chocolate and steamed milk, topped with cream." },
];

const photo = (id: string, w = 1600, h = 1000) => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop`;

/** Gives the demo store's template pages real copy and photography. */
function customize(pageSlug: string, sections: Section[]): Section[] {
  const overrides: Record<string, Record<string, unknown>> = {
    hero: {
      heading: "Coffee from the hills, roasted this week",
      subheading: "Single-origin beans from Kandy and Nuwara Eliya, roasted in small batches in Colombo.",
      image: photo("photo-1447933601403-0c6688de566e"),
      ctaLabel: "Shop coffee",
    },
    collections: {
      heading: "Shop by category",
      items: [
        { label: "Coffee", category: "Coffee", image: photo("photo-1495474472287-4d71bcdd2085", 800, 1000) },
        { label: "Iced", category: "Iced", image: photo("photo-1517701550927-30cf4ba1dba5", 800, 1000) },
        { label: "Pastry", category: "Pastry", image: photo("photo-1530610476181-d83430b64dcd", 800, 1000) },
      ],
    },
    featured: { heading: "This week's roasts" },
    testimonials: {
      items: [
        { quote: "The Kandy roast is the best cup I've had outside the estate itself.", author: "Dilini Jayawardena, Colombo 7" },
        { quote: "Ordered on Monday, delivered to Galle on Wednesday. Beautifully packed.", author: "Ruwan Senanayake, Galle" },
      ],
    },
    story: {
      heading: "Grown at 1,800 metres",
      body: "We buy directly from three smallholder estates and roast within days of each harvest reaching Colombo.",
      image: photo("photo-1442512595331-e89e73853f31", 1200, 1200),
    },
  };
  if (pageSlug !== "home" && pageSlug !== "about") return sections;
  return sections.map((s) => (overrides[s.id] ? { ...s, props: { ...s.props, ...overrides[s.id] } } : s));
}

async function main() {
  console.log("Seeding database...");

  // Children first; ledger rows restrict deletes on orders and stores.
  await prisma.ledgerEntry.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.store.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "merchant@example.com",
      password: await bcrypt.hash("password123", 12),
      firstName: "Nimal",
      lastName: "Perera",
    },
  });

  const template = TEMPLATES.boutique;
  const store = await prisma.store.create({
    data: {
      name: "Hill Country Coffee",
      slug: "hill-country-coffee",
      ownerId: user.id,
      description: "Single-origin Sri Lankan coffee, roasted in small batches.",
      status: "live",
      taxBps: 0,
      templateKey: template.key,
      theme: { create: template.theme },
      pages: {
        create: template.pages.map((page) => {
          const sections = customize(page.slug, page.sections) as unknown as Prisma.InputJsonValue;
          return { slug: page.slug, title: page.title, draftSections: sections, publishedSections: sections, publishedAt: new Date() };
        }),
      },
      modules: { create: [{ key: "customers" }] },
    },
  });

  const created = [];
  for (const p of products) {
    created.push(
      await prisma.product.create({
        data: {
          storeId: store.id,
          name: p.name,
          slug: p.name.toLowerCase().replace(/\s+/g, "-"),
          description: p.description,
          category: p.category,
          priceCents: p.price,
          quantity: p.quantity,
          images: { create: { url: `https://images.unsplash.com/${p.image}?w=600&h=600&fit=crop`, alt: p.name } },
        },
      }),
    );
  }

  // One cash-on-delivery order awaiting payment, so the order and payout screens have data.
  const lines = [
    { product: created[1], quantity: 2 },
    { product: created[4], quantity: 1 },
  ];
  const totals = computeOrderTotals({
    lines: lines.map((l) => ({ unitPrice: l.product.priceCents, quantity: l.quantity })),
    taxBps: store.taxBps,
    shipping: 0,
    platformFeeBps: store.platformFeeBps,
  });
  const customer = await prisma.customer.create({
    data: { storeId: store.id, email: "customer@example.com", firstName: "Kavya", lastName: "Silva", phone: "0771234567" },
  });
  const { orderCounter } = await prisma.store.update({ where: { id: store.id }, data: { orderCounter: { increment: 1 } } });
  await prisma.order.create({
    data: {
      storeId: store.id,
      orderNumber: orderCounter,
      customerId: customer.id,
      paymentMethod: "cod",
      currency: store.currency,
      subtotalCents: totals.subtotal,
      taxCents: totals.tax,
      shippingCents: totals.shipping,
      totalCents: totals.total,
      platformFeeBps: store.platformFeeBps,
      platformFeeCents: totals.platformFee,
      merchantNetCents: totals.merchantNet,
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          productName: l.product.name,
          unitPriceCents: l.product.priceCents,
          quantity: l.quantity,
        })),
      },
      shippingAddress: {
        create: { name: "Kavya Silva", email: customer.email, phone: "0771234567", line1: "42 Temple Road", city: "Kandy", district: "Kandy" },
      },
      payments: { create: { storeId: store.id, provider: "cod", amountCents: totals.total, currency: store.currency } },
    },
  });

  console.log(`
Done.
  Merchant login: merchant@example.com / password123
  Store:          ${store.slug}
  Dashboard:      http://localhost:3000
  Storefront:     http://localhost:3001?store=${store.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
