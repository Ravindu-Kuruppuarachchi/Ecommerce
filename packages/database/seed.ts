import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeOrderTotals, TEMPLATES } from "@repo/core";

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
  { name: "Chocolate Croissant", category: "Pastry", price: 750_00, quantity: 30, image: "photo-1555507036-ab1f4038024a",
    description: "Flaky butter croissant filled with dark chocolate, baked every morning." },
  { name: "Mocha", category: "Coffee", price: 1_150_00, quantity: 35, image: "photo-1578314675249-a6910f80cc4e",
    description: "Espresso, chocolate and steamed milk, topped with cream." },
];

async function main() {
  console.log("Seeding database...");

  // Children first; ledger rows restrict deletes on orders and stores.
  await prisma.ledgerEntry.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
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
          const sections = page.sections as unknown as Prisma.InputJsonValue;
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
