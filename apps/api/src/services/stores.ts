import { Prisma } from "@prisma/client";
import { TEMPLATES, type TemplateKey } from "@repo/core";

// Slugs become subdomains and URL paths, so reserve anything the platform may need.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "dashboard", "www", "mail", "help", "support", "billing",
  "login", "register", "signup", "me", "store", "stores", "static", "assets", "cdn",
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

  await tx.store.update({ where: { id: storeId }, data: { templateKey: key } });
  const { settings, ...tokens } = template.theme;
  const theme = { ...tokens, settings: settings as unknown as Prisma.InputJsonValue };
  await tx.storeTheme.upsert({
    where: { storeId },
    create: { storeId, ...theme },
    update: theme,
  });

  for (const page of template.pages) {
    const sections = page.sections as unknown as Prisma.InputJsonValue;
    const fresh = { title: page.title, draftSections: sections, publishedSections: sections, publishedAt: now };
    await tx.storePage.upsert({
      where: { storeId_slug: { storeId, slug: page.slug } },
      create: { storeId, slug: page.slug, ...fresh },
      update: replacePages ? fresh : {},
    });
  }
}
