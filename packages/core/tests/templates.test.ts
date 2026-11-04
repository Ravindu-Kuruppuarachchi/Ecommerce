import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { variantCombinations } from "../src";
import { pageNavigation, pagePresetSections, catalogCategory, resolvePageLink, sectionButtons, SECTIONS } from "../src";

test("every template header has real editable pages, including Products and Story", () => {
  for (const template of Object.values(TEMPLATES)) {
    assert(template.pages.some(page => page.slug === PRODUCTS_PAGE_SLUG));
    assert(template.pages.some(page => page.slug === "about"));
    for (const link of template.theme.settings.navigation || []) {
      const page = template.pages.find(page => pagePath(page.slug) === link.link);
      assert(page, `${template.key}: ${link.label} has no page`);
      assert(!link.link.includes("?"));
      if (page.category) {
        assert.equal(catalogCategory(page.sections), page.category);
        assert.equal(productQueries(page.sections)[0].category, page.category);
        assert.equal(resolvePageLink(`/products?category=${encodeURIComponent(page.category)}`, template.pages), link.link);
      }
    }
  }
});

test("page navigation follows visible pages and their order, and can include Home", () => {
  const pages = [
    { slug: "home", title: "Home", showInNavigation: false, navigationPosition: 0 },
    { slug: "hidden", title: "Hidden", showInNavigation: false, navigationPosition: 1 },
    { slug: "contact", title: "Contact", showInNavigation: true, navigationPosition: 3 },
    { slug: PRODUCTS_PAGE_SLUG, title: "Shop", showInNavigation: true, navigationPosition: 2 },
  ];
  assert.deepEqual(pageNavigation(pages).map(link => link.link), ["/products", "/pages/contact"]);
  assert.equal(pageNavigation([{ ...pages[0], showInNavigation: true }])[0].link, "/");
});

test("page starters validate and category pages request only their own products", () => {
  for (const preset of ["blank", "story", "contact", "category"] as const) {
    const sections = pagePresetSections(preset, { title: "Fish", category: "fish", email: "owner@example.test" });
    assert(validateSections(sections).ok);
    if (preset === "category") assert.deepEqual(productQueries(sections), [{ key: "catalog:category:fish", category: "fish", limit: 100 }]);
  }
});

test("hero buttons can be added or removed without adding controls to image-with-text", () => {
  const legacy = { ctaLabel: "Shop", ctaLink: "/products" };
  assert.equal(sectionButtons(legacy).length, 1);
  assert.deepEqual(sectionButtons({ ...legacy, buttons: [] }), []);
  const buttons = [{ label: "Story", link: "/pages/about", style: "secondary" }];
  assert.deepEqual(sectionButtons({ ...legacy, buttons }), buttons);
  assert(validateSections([{ id: "hero", type: "hero", props: { buttons } }]).ok);
  assert(!validateSections([{ id: "hero", type: "hero", props: { buttons: Array(5).fill(buttons[0]) } }]).ok);
  assert(!SECTIONS["image-with-text"].fields.some(field => field.name === "buttons"));
});

test("products without options have no variants, including after the last option is removed", () => {
  assert.deepEqual(variantCombinations([]), []);
  assert.deepEqual(variantCombinations([{ name: "Size", values: [] }]), []);
  assert.deepEqual(variantCombinations([{ name: "Size", values: ["Small", "Large"] }]), [
    { Size: "Small" }, { Size: "Large" },
  ]);
  assert.deepEqual(variantCombinations([
    { name: "Size", values: ["Small", "Large"] }, { name: "Colour", values: ["Red", "Blue"] },
  ]), [
    { Size: "Small", Colour: "Red" }, { Size: "Small", Colour: "Blue" },
    { Size: "Large", Colour: "Red" }, { Size: "Large", Colour: "Blue" },
  ]);
});
import { isModuleKey, MODULE_KEYS, createSection, defaultCatalogSections, pagePath, PRODUCTS_PAGE_SLUG, productQueries, contrastRatio, isTemplateKey, normalizeThemeSettings, TEMPLATE_KEYS, TEMPLATES, validateSections } from "../src";

test("every starter page survives the same validation used by saving and preview", () => {
  for (const key of TEMPLATE_KEYS) {
    const template = TEMPLATES[key];
    assert(contrastRatio(template.theme.primaryColor, template.theme.secondaryColor) >= 4.5, `${key}: text contrast`);
    assert.deepEqual(normalizeThemeSettings(template.theme.settings), template.theme.settings);
    for (const page of template.pages) {
      const result = validateSections(page.sections);
      assert(result.ok, `${key}/${page.slug}: ${JSON.stringify(result)}`);
      assert.deepEqual(result.sections, page.sections, `${key}/${page.slug}: editable fields were stripped`);
      const checkAssets = (value: unknown): void => {
        if (typeof value === "string" && value.startsWith("/template-assets/")) {
          assert(existsSync(resolve(__dirname, "../../../apps/storefront/public", value.slice(1))), `Missing asset: ${value}`);
        } else if (Array.isArray(value)) value.forEach(checkAssets);
        else if (value && typeof value === "object") Object.values(value).forEach(checkAssets);
      };
      checkAssets(page.sections);
    }
  }
});

test("template lookup excludes inherited object properties", () => {
  for (const key of TEMPLATE_KEYS) assert(isTemplateKey(key));
  for (const key of ["toString", "__proto__", "constructor", "unknown", null]) assert(!isTemplateKey(key));
});

test("existing heroes render without requiring new composition fields", () => {
  assert(validateSections([{ id: "legacy", type: "hero", props: { heading: "An existing store", image: "", height: "medium", align: "center" } }]).ok);
  assert(!validateSections([{ id: "bad", type: "hero", props: { layout: "unknown" } }]).ok);
});

test("curated navigation rejects executable and protocol-relative links and preserves legacy settings", () => {
  const base = { corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true };
  assert.deepEqual(normalizeThemeSettings(base), base);
  assert.deepEqual(normalizeThemeSettings({ ...base, navigation: [
    { label: "Women", link: "/products?category=Women" },
    { label: "External", link: "https://example.com/collection" },
    { label: "Unsafe", link: "javascript:alert(1)" },
    { label: "Unsafe", link: "//example.com" },
    { label: "", link: "/products" }, null,
  ] }).navigation, [
    { label: "Women", link: "/products?category=Women" },
    { label: "External", link: "https://example.com/collection" },
  ]);
  assert.equal(normalizeThemeSettings({ navigation: Array.from({length:12}, () => ({label:"Shop",link:"/products"})) }).navigation?.length, 8);
  assert.deepEqual(normalizeThemeSettings({ ...base, navigation: [] }), base);
});

test("campaign slides validate nested fields and reject unsafe images and oversized lists", () => {
  const slides = [{heading:"New arrivals", image:"/template-assets/womenswear.jpg", ctaLink:"/products"}];
  const make = (items: unknown[]) => [{id:"campaign",type:"campaign-slider",props:{slides:items}}];
  assert(validateSections(make(slides)).ok);
  assert(!validateSections(make([{...slides[0],image:"javascript:alert(1)"}])).ok);
  assert(!validateSections(make(Array.from({length:6}, () => slides[0]))).ok);
});


test("editable catalog preserves full inventory queries alongside limited featured collections", () => {
  const catalog = defaultCatalogSections();
  const validated = validateSections(catalog);
  assert(validated.ok);
  assert.deepEqual(validated.sections, catalog);
  const queries = productQueries([...catalog, ...defaultCatalogSections(), createSection("featured-products", { limit: 8 })]);
  assert.equal(queries.length, 2, "catalog queries should be shared without replacing featured queries");
  assert.deepEqual(queries.find(query => query.key === "catalog:all"), { key: "catalog:all", limit: 100 });
  assert.equal(queries.find(query => query.key === "newest:8")?.limit, 8);
  assert.equal(pagePath(PRODUCTS_PAGE_SLUG), "/products");
  assert.equal(pagePath("about"), "/pages/about");
  assert(!validateSections([createSection("product-catalog", { columns: "12" })]).ok);
});


test("feature module lookup rejects inherited object properties", () => {
  for (const key of MODULE_KEYS) assert(isModuleKey(key));
  for (const key of ["constructor", "toString", "__proto__", "unknown"]) assert(!isModuleKey(key));
});

test("section validation rejects inherited type names without throwing", () => {
  for (const type of ["constructor", "toString", "__proto__"]) {
    assert.equal(validateSections([{ id: "invalid-section", type, props: {} }]).ok, false);
  }
});


test("content URLs reject ambiguous browser destinations", async () => {
  const { isSafeContentUrl, storeHref } = await import("../src");
  for (const value of ["//evil.example", "/\\evil.example", "https://user:secret@example.com", "javascript:alert(1)", "/page\n"]) {
    assert.equal(isSafeContentUrl(value), false, value);
    assert.equal(storeHref("shop", value), "/shop");
  }
  assert(isSafeContentUrl("/products?category=Fish%20food"));
});

test("missing custom-page links fall back to the catalog", async () => {
  const { livePageLink } = await import("../src");
  assert.equal(livePageLink("/pages/deleted#contact", []), "/products");
  assert.equal(livePageLink("/pages/about", [{ slug: "about", title: "Story" }]), "/pages/about");
});

test("money parsing rejects overflow without losing valid cents", async () => {
  const { toMinor } = await import("../src");
  assert.equal(toMinor("21474836.47"), 2147483647);
  for (const value of ["21474836.48", "999999999999999999999999", "1.999", "-1", Infinity]) assert.equal(toMinor(value), null);
  assert.equal(toMinor("1,250.50"), 125050);
});


test("catalog filters and prices respect variants without mutating product order", async () => {
  const { filterCatalog, productSummary } = await import("../src");
  const base = { category: "Fish", description: "Freshwater", priceCents: 500, compareAtPriceCents: null, quantity: 1, variants: [] };
  const products = [
    { ...base, name: "Zebra", variants: [{ priceCents: 300, quantity: 0 }, { priceCents: 700, quantity: 2 }] },
    { ...base, name: "Betta", priceCents: 200, compareAtPriceCents: 400, quantity: 0 },
    { ...base, name: "Plant", category: "Plants", priceCents: 100 },
  ];
  assert.equal(productSummary(products[0]).available, true);
  assert.equal(productSummary({ ...products[0], variants: [{ priceCents: null, quantity: 0 }] }).available, false);
  assert.deepEqual(filterCatalog(products, { category: "fish", inStock: true }).map(p => p.name), ["Zebra"]);
  assert.deepEqual(filterCatalog(products, { query: "FRESH zebra" }).map(p => p.name), ["Zebra"]);
  assert.deepEqual(filterCatalog(products, { onSale: true }).map(p => p.name), ["Betta"]);
  assert.deepEqual(filterCatalog(products, { sort: "price-asc" }).map(p => p.name), ["Plant", "Betta", "Zebra"]);
  assert.deepEqual(filterCatalog(products, { sort: "price-desc" }).map(p => p.name), ["Zebra", "Betta", "Plant"]);
  assert.deepEqual(filterCatalog(products, { sort: "name" }).map(p => p.name), ["Betta", "Plant", "Zebra"]);
  assert.deepEqual(products.map(p => p.name), ["Zebra", "Betta", "Plant"]);
});
