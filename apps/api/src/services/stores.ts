import { Prisma } from "@prisma/client";
import { TEMPLATES, isTemplateKey, type TemplateKey } from "@repo/core";

// Slugs become subdomains and URL paths, so reserve anything the platform may need.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "dashboard", "www", "mail", "help", "support", "billing",
  "template-preview", "template-assets", "login", "register", "signup", "me", "store", "stores", "static", "assets", "cdn",
]);

export const STORE_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function storeSlugProblem(slug: string): string | null {
  if (!STORE_SLUG_PATTERN.test(slug)) return "Use 3-40 lowercase letters, numbers or hyphens";
  if (RESERVED_SLUGS.has(slug)) return "That name is reserved";
  return null;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}

/**
 * Copies a template's theme and pages into a store. Pages with the same slug
 * are overwritten (draft and published) when replacePages is set; otherwise
 * only missing pages are added.
 */
export async function applyTemplate(
  tx: Prisma.TransactionClient,
  storeId: string,
  key: TemplateKey,
  { replacePages }: { replacePages: boolean },
): Promise<void> {
  const template = TEMPLATES[key];
  const now = new Date();

  await tx.store.update({ where: { id: storeId }, data: { templateKey: key, pageSetupVersion: 1 } });
  const { settings, ...tokens } = template.theme;
  const theme = { ...tokens, settings: settings as unknown as Prisma.InputJsonValue };
  await tx.storeTheme.upsert({
    where: { storeId },
    create: { storeId, ...theme },
    update: theme,
  });

  for (const page of template.pages) {
    const sections = page.sections as unknown as Prisma.InputJsonValue;
    const fresh = { title: page.title, draftSections: sections, publishedSections: sections, publishedAt: now,
      showInNavigation: page.showInNavigation ?? page.slug !== "home", navigationPosition: page.navigationPosition ?? 0 };
    await tx.storePage.upsert({
      where: { storeId_slug: { storeId, slug: page.slug } },
      create: { storeId, slug: page.slug, ...fresh },
      update: replacePages ? fresh : {},
    });
  }
}

/** One-time, additive upgrade. Never replace existing content or resurrect later deletions. */
export async function prepareStorePages(tx: Prisma.TransactionClient, storeId: string) {
  const store = await tx.store.findUniqueOrThrow({ where: { id: storeId } });
  if (store.pageSetupVersion >= 1) return;
  const template = TEMPLATES[isTemplateKey(store.templateKey) ? store.templateKey : "classic"];
  for (const page of template.pages) {
    const sections = page.sections as unknown as Prisma.InputJsonValue;
    const navigation = { showInNavigation: page.showInNavigation ?? page.slug !== "home", navigationPosition: page.navigationPosition ?? 0 };
    await tx.storePage.upsert({
      where: { storeId_slug: { storeId, slug: page.slug } },
      create: { storeId, slug: page.slug, title: page.title, ...navigation, draftSections: sections, publishedSections: sections, publishedAt: new Date() },
      update: navigation,
    });
  }
  await tx.store.update({ where: { id: storeId }, data: { pageSetupVersion: 1 } });
}
