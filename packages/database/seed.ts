import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { computeOrderTotals, SRI_LANKA_DISTRICTS, TEMPLATES, variantCombinations, variantTitle, type Section } from "@repo/core";

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


// ---- Dev-only sample activity ----------------------------------------------
// Orders and visits so the dashboards have something to show. Deterministic
// pseudo-random numbers keep the seed reproducible.

type SeedStore = { id: string; slug: string; currency: string; taxBps: number; platformFeeBps: number };
type SeedProduct = { id: string; name: string; priceCents: number };

const PEOPLE = [
  { first: "Kavya", last: "Silva", city: "Kandy", district: "Kandy" },
  { first: "Nuwan", last: "Perera", city: "Dehiwala", district: "Colombo" },
  { first: "Tharushi", last: "Fernando", city: "Negombo", district: "Gampaha" },
  { first: "Ishara", last: "Bandara", city: "Galle", district: "Galle" },
  { first: "Ashan", last: "Wickramasinghe", city: "Kurunegala", district: "Kurunegala" },
  { first: "Malsha", last: "Rathnayake", city: "Matara", district: "Matara" },
];
const LOCAL = ["Colombo", "Gampaha", "Kalutara"];

async function seedActivity(
  store: SeedStore,
  products: SeedProduct[],
  opts: { visitors: [number, number]; ordersPerDay: number; seed: number; days?: number; quietDays?: number; paidOnlyOlderThan?: number },
) {
  let seed = opts.seed;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const days = opts.days ?? 30;
  const customers = [];
  for (const [i, p] of PEOPLE.entries()) {
    customers.push(
      await prisma.customer.create({
        data: { storeId: store.id, email: `${p.first.toLowerCase()}.${p.last.toLowerCase()}@example.com`, firstName: p.first, lastName: p.last, phone: `07712345${10 + i}` },
      }),
    );
  }

  for (let daysAgo = days - 1; daysAgo >= 0; daysAgo--) {
    const day = new Date(Date.now() - daysAgo * 86_400_000);
    // Never in the future: today's activity is capped at the current time.
    const at = (hour: number) => new Date(Math.min(Date.now(), new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.floor(rand() * 60)).getTime()));
    const quiet = opts.quietDays !== undefined && daysAgo < opts.quietDays;
    const visitors = Math.floor((opts.visitors[0] + rand() * (opts.visitors[1] - opts.visitors[0])) * (quiet ? 0.3 : 1));
    const events: Prisma.AnalyticsEventCreateManyInput[] = [];
    for (let v = 0; v < visitors; v++) {
      const sessionId = `seed-${store.slug}-${daysAgo}-${v}-${Math.floor(rand() * 1e6)}`;
      const hour = 8 + Math.floor(rand() * 14);
      events.push({ storeId: store.id, type: "page_view", sessionId, path: `/${store.slug}`, createdAt: at(hour) });
      if (rand() < 0.55) events.push({ storeId: store.id, type: "product_view", sessionId, createdAt: at(hour) });
      if (rand() < 0.22) events.push({ storeId: store.id, type: "add_to_cart", sessionId, createdAt: at(hour) });
      if (rand() < 0.12) events.push({ storeId: store.id, type: "checkout_start", sessionId, createdAt: at(hour) });
    }
    await prisma.analyticsEvent.createMany({ data: events });
    if (quiet) continue;

    const orders = Math.floor(rand() * opts.ordersPerDay) + (daysAgo % 6 === 0 ? 1 : 0);
    for (let o = 0; o < orders; o++) {
      const person = Math.floor(rand() * PEOPLE.length);
      const picks = [products[Math.floor(rand() * products.length)], products[Math.floor(rand() * products.length)]];
      const lines = [...new Map(picks.map((p) => [p.id, p])).values()].map((product) => ({ product, quantity: 1 + Math.floor(rand() * 2) }));
      const subtotal = lines.reduce((n, l) => n + l.product.priceCents * l.quantity, 0);
      const local = LOCAL.includes(PEOPLE[person].district);
      const totals = computeOrderTotals({
        lines: lines.map((l) => ({ unitPrice: l.product.priceCents, quantity: l.quantity })),
        taxBps: store.taxBps,
        shipping: subtotal >= (local ? 5_000_00 : 10_000_00) ? 0 : local ? 350_00 : 550_00,
        platformFeeBps: store.platformFeeBps,
      });
      const { orderCounter } = await prisma.store.update({ where: { id: store.id }, data: { orderCounter: { increment: 1 } } });
      const delivered = daysAgo > (opts.paidOnlyOlderThan ?? 3);
      const createdAt = at(9 + Math.floor(rand() * 12));
      const order = await prisma.order.create({
        data: {
          storeId: store.id,
          orderNumber: orderCounter,
          customerId: customers[person].id,
          paymentMethod: "cod",
          status: delivered ? "completed" : "pending",
          fulfillmentStatus: delivered ? "delivered" : "unfulfilled",
          currency: store.currency,
          subtotalCents: totals.subtotal,
          taxCents: totals.tax,
          shippingCents: totals.shipping,
          totalCents: totals.total,
          platformFeeBps: store.platformFeeBps,
          platformFeeCents: totals.platformFee,
          merchantNetCents: totals.merchantNet,
          shippingZoneName: local ? "Colombo and suburbs" : "Rest of the island",
          createdAt,
          items: {
            create: lines.map((l) => ({ productId: l.product.id, productName: l.product.name, unitPriceCents: l.product.priceCents, quantity: l.quantity })),
          },
          shippingAddress: {
            create: {
              name: `${PEOPLE[person].first} ${PEOPLE[person].last}`,
              email: customers[person].email,
              phone: customers[person].phone ?? "",
              line1: `${10 + o} Temple Road`,
              city: PEOPLE[person].city,
              district: PEOPLE[person].district,
            },
          },
          payments: { create: { storeId: store.id, provider: "cod", amountCents: totals.total, currency: store.currency, status: delivered ? "succeeded" : "pending" } },
        },
      });
      if (delivered) {
        // Cash collected: the platform fee is owed (see recordOrderPaid in the API).
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "paid" } });
        await prisma.ledgerEntry.create({
          data: {
            storeId: store.id,
            orderId: order.id,
            type: "platform_fee",
            amountCents: -totals.platformFee,
            currency: store.currency,
            key: `order:${order.id}:platform_fee`,
            memo: `10% commission on order #${orderCounter}`,
            createdAt,
          },
        });
      }
    }
  }
}

/** More merchant stores in different states, so the platform admin has a realistic client list. */
async function seedOtherStores() {
  const stores = [
    { name: "Galle Batik House", slug: "galle-batik-house", template: "boutique" as const, status: "live", ageDays: 60, category: "Batik",
      items: [["Batik sarong", 4_500_00], ["Hand-dyed scarf", 3_200_00], ["Batik wall hanging", 8_900_00]],
      activity: { visitors: [25, 55] as [number, number], ordersPerDay: 4, seed: 11 }, feePaid: true },
    { name: "Kandy Spice Co", slug: "kandy-spice-co", template: "market" as const, status: "live", ageDays: 45, category: "Spices",
      items: [["Cinnamon quills 100 g", 1_200_00], ["Curry powder 250 g", 950_00], ["Cardamom 50 g", 1_650_00]],
      activity: { visitors: [10, 30] as [number, number], ordersPerDay: 3, seed: 23 } },
    { name: "Colombo Tech Hub", slug: "colombo-tech-hub", template: "bazaar" as const, status: "live", ageDays: 90, category: "Accessories",
      items: [["USB-C cable 2 m", 1_500_00], ["Phone stand", 2_400_00], ["Wireless mouse", 4_800_00]],
      activity: { visitors: [8, 20] as [number, number], ordersPerDay: 2, seed: 31, quietDays: 18 } },
    { name: "Jaffna Palmyrah Crafts", slug: "jaffna-palmyrah-crafts", template: "studio" as const, status: "draft", ageDays: 12, category: "Crafts", items: [] },
    { name: "Negombo Surf Supply", slug: "negombo-surf-supply", template: "noir" as const, status: "suspended", ageDays: 120, category: "Surf",
      items: [["Surf wax", 1_100_00], ["Rash guard", 6_500_00]],
      activity: { visitors: [3, 8] as [number, number], ordersPerDay: 2, seed: 41, days: 30, quietDays: 25 } },
  ];

  for (const [i, def] of stores.entries()) {
    const createdAt = new Date(Date.now() - def.ageDays * 86_400_000);
    const template = TEMPLATES[def.template];
    const owner = await prisma.user.create({
      data: { email: `owner${i + 2}@example.com`, password: await bcrypt.hash("password123", 12), firstName: def.name.split(" ")[0], createdAt },
    });
    const store = await prisma.store.create({
      data: {
        name: def.name,
        slug: def.slug,
        ownerId: owner.id,
        status: def.status,
        templateKey: template.key,
        pageSetupVersion: 1,
        createdAt,
        theme: { create: { ...template.theme, settings: template.theme.settings as unknown as Prisma.InputJsonValue } },
        pages: {
          create: template.pages.map((page) => {
            const sections = page.sections as unknown as Prisma.InputJsonValue;
            return { slug: page.slug, title: page.title, showInNavigation: page.showInNavigation, navigationPosition: page.navigationPosition, draftSections: sections, publishedSections: sections, publishedAt: createdAt, createdAt };
          }),
        },
      },
    });
    const products = [];
    for (const [name, price] of def.items as Array<[string, number]>) {
      products.push(
        await prisma.product.create({
          data: { storeId: store.id, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), category: def.category, priceCents: price, quantity: 25 },
        }),
      );
    }
    if (def.activity && products.length) await seedActivity(store, products, def.activity);
    if (def.feePaid) {
      // This merchant settled most of their COD fees by bank transfer.
      const owed = (await prisma.ledgerEntry.aggregate({ where: { storeId: store.id }, _sum: { amountCents: true } }))._sum.amountCents ?? 0;
      if (owed < 0) {
        await prisma.ledgerEntry.create({
          data: { storeId: store.id, type: "fee_payment", amountCents: Math.round(-owed * 0.8), currency: store.currency, key: `seed-fee-payment-${store.id}`, memo: "Fee payment received (BOC transfer 55120)" },
        });
      }
    }
  }
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DESTRUCTIVE_SEED !== "true") {
    throw new Error("Demo seed deletes existing data. Only on a disposable development database, run ALLOW_DESTRUCTIVE_SEED=true pnpm db:seed. Never run in production.");
  }
  console.log("Seeding database...");

  // Children first; ledger rows restrict deletes on orders and stores.
  await prisma.ledgerEntry.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.inventoryAdjustment.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.store.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: "merchant@example.com",
      password: await bcrypt.hash("password123", 12),
      firstName: "Nimal",
      lastName: "Perera",
    },
  });

  // Platform staff account for the Platform area of the dashboard.
  await prisma.user.create({
    data: { email: "admin@example.com", password: await bcrypt.hash("password123", 12), firstName: "Platform", lastName: "Admin", role: "platform_admin" },
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
      pageSetupVersion: 1,
      theme: { create: { ...template.theme, settings: template.theme.settings as unknown as Prisma.InputJsonValue } },
      pages: {
        create: template.pages.map((page) => {
          const sections = customize(page.slug, page.sections) as unknown as Prisma.InputJsonValue;
          return { slug: page.slug, title: page.title, showInNavigation: page.showInNavigation, navigationPosition: page.navigationPosition, draftSections: sections, publishedSections: sections, publishedAt: new Date() };
        }),
      },
      modules: { create: ["customers", "shipping", "discounts", "inventory", "analytics"].map((key) => ({ key })) },
      shippingZones: {
        create: [
          { name: "Colombo and suburbs", districts: ["Colombo", "Gampaha", "Kalutara"], rateCents: 350_00, freeOverCents: 5_000_00, estimatedDays: "1-2 working days", position: 0 },
          {
            name: "Rest of the island",
            districts: SRI_LANKA_DISTRICTS.filter((d) => !["Colombo", "Gampaha", "Kalutara"].includes(d)),
            rateCents: 550_00,
            freeOverCents: 10_000_00,
            estimatedDays: "3-5 working days",
            position: 1,
          },
        ],
      },
      discounts: {
        create: [{ title: "Welcome offer", code: "WELCOME10", type: "percent", value: 1000, minSubtotalCents: 2_000_00, usageLimit: 100 }],
      },
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

  // A product sold in variants (needs the Inventory module, which is on above).
  const options = [
    { name: "Grind", values: ["Whole bean", "Filter", "Espresso"] },
    { name: "Size", values: ["250 g", "500 g"] },
  ];
  await prisma.product.create({
    data: {
      storeId: store.id,
      name: "House Blend Beans",
      slug: "house-blend-beans",
      description: "Our everyday blend of Kandy and Nuwara Eliya beans. Choose your grind and bag size.",
      category: "Coffee",
      priceCents: 1_800_00,
      options,
      images: { create: { url: photo("photo-1447933601403-0c6688de566e", 600, 600), alt: "Coffee beans" } },
      variants: {
        create: variantCombinations(options).map((values, position) => ({
          title: variantTitle(options, values),
          optionValues: values,
          priceCents: values.Size === "500 g" ? 3_300_00 : null,
          quantity: values.Grind === "Espresso" && values.Size === "500 g" ? 2 : 12 + position,
          position,
        })),
      },
    },
  });

  await seedActivity(store, created, { visitors: [18, 43], ordersPerDay: 3, seed: 7 });
  await seedOtherStores();

  console.log(`
Done.
  Merchant login: merchant@example.com / password123
  Platform admin: admin@example.com / password123
  Store:          ${store.slug}
  Dashboard:      http://localhost:3002
  Storefront:     http://localhost:3001?store=${store.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
