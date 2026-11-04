// Feature modules a store can switch on. The merchant admin builds its
// navigation from the enabled modules, and the API refuses module routes for
// stores that haven't enabled them.

export type ModuleKey =
  | "catalog"
  | "orders"
  | "customers"
  | "storefront"
  | "payments"
  | "shipping"
  | "discounts"
  | "inventory"
  | "reviews"
  | "analytics"
  | "blog";

export interface ModuleDefinition {
  key: ModuleKey;
  label: string;
  description: string;
  /** Core modules are always on and can't be disabled. */
  core: boolean;
  requires: ModuleKey[];
  /** Admin navigation entries this module contributes. */
  nav: Array<{ label: string; href: string }>;
  /** Phase of the roadmap that delivers it; modules not yet built are hidden from the picker. */
  available: boolean;
}

export const MODULES: Record<ModuleKey, ModuleDefinition> = {
  catalog: {
    key: "catalog",
    label: "Products",
    description: "Products, images, categories and pricing.",
    core: true,
    requires: [],
    nav: [{ label: "Products", href: "/products" }],
    available: true,
  },
  orders: {
    key: "orders",
    label: "Orders",
    description: "Order inbox, status updates and invoices.",
    core: true,
    requires: ["catalog"],
    nav: [{ label: "Orders", href: "/orders" }],
    available: true,
  },
  storefront: {
    key: "storefront",
    label: "Online store",
    description: "Templates, page builder and custom domains.",
    core: true,
    requires: [],
    nav: [{ label: "Online store", href: "/store" }],
    available: true,
  },
  payments: {
    key: "payments",
    label: "Payments & payouts",
    description: "Card payments, cash on delivery, balances and payouts.",
    core: true,
    requires: ["orders"],
    nav: [{ label: "Payouts", href: "/payouts" }],
    available: true,
  },
  customers: {
    key: "customers",
    label: "Customers",
    description: "Customer list, order history and contact details.",
    core: false,
    requires: ["orders"],
    nav: [{ label: "Customers", href: "/customers" }],
    available: true,
  },
  shipping: {
    key: "shipping",
    label: "Shipping & delivery",
    description: "Delivery zones and rates by district, delivery estimates and tracking numbers.",
    core: false,
    requires: ["orders"],
    nav: [{ label: "Shipping", href: "/shipping" }],
    available: true,
  },
  discounts: {
    key: "discounts",
    label: "Discounts",
    description: "Coupon codes and automatic promotions.",
    core: false,
    requires: ["catalog"],
    nav: [{ label: "Discounts", href: "/discounts" }],
    available: true,
  },
  inventory: {
    key: "inventory",
    label: "Inventory",
    description: "Product variants like size and colour, stock tracking and low-stock alerts.",
    core: false,
    requires: ["catalog"],
    nav: [{ label: "Inventory", href: "/inventory" }],
    available: true,
  },
  reviews: {
    key: "reviews",
    label: "Product reviews",
    description: "Collect and moderate customer reviews.",
    core: false,
    requires: ["catalog", "orders"],
    nav: [{ label: "Reviews", href: "/reviews" }],
    available: false,
  },
  analytics: {
    key: "analytics",
    label: "Analytics",
    description: "Sales, store visits and conversion reports.",
    core: false,
    requires: ["orders"],
    nav: [{ label: "Analytics", href: "/analytics" }],
    available: true,
  },
  blog: {
    key: "blog",
    label: "Blog",
    description: "Articles for your store.",
    core: false,
    requires: ["storefront"],
    nav: [{ label: "Blog", href: "/blog" }],
    available: false,
  },
};

export const MODULE_KEYS = Object.keys(MODULES) as ModuleKey[];

export function isModuleKey(value: string): value is ModuleKey {
  return Object.prototype.hasOwnProperty.call(MODULES, value);
}

/** Core modules plus the store's enabled optional modules. */
export function effectiveModules(enabled: Iterable<string>): ModuleKey[] {
  const on = new Set<string>(enabled);
  return MODULE_KEYS.filter((k) => MODULES[k].core || on.has(k));
}

/** Modules that must already be on before `key` can be enabled. */
export function missingRequirements(key: ModuleKey, enabled: Iterable<string>): ModuleKey[] {
  const active = new Set(effectiveModules(enabled));
  return MODULES[key].requires.filter((r) => !active.has(r));
}

/** Enabled modules that depend on `key`, which would break if it were disabled. */
export function dependents(key: ModuleKey, enabled: Iterable<string>): ModuleKey[] {
  return effectiveModules(enabled).filter((k) => MODULES[k].requires.includes(key));
}

export function adminNav(enabled: Iterable<string>): Array<{ label: string; href: string; module: ModuleKey }> {
  return effectiveModules(enabled).flatMap((k) => MODULES[k].nav.map((n) => ({ ...n, module: k })));
}
