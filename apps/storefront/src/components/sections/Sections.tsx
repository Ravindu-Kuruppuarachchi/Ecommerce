import { schemeStyle, themeSettings } from "@/lib/theme";
import Link from "next/link";
import type { ReactNode } from "react";
import { productQueryFor, SECTION_BACKGROUNDS, SECTIONS, storeHref, livePageLink, sectionButtons, type Section, type SectionBackground } from "@repo/core";
import type { SectionContext } from "@/lib/types";
import ProductCard from "../ProductCard";
import NewsletterForm from "./NewsletterForm";
import ProductCatalog from "./ProductCatalog";
import CampaignSlider from "./CampaignSlider";

// Every section renders on the server for customers and in the browser for the
// editor preview, so nothing here may use hooks or server-only APIs.

type Props = Record<string, unknown>;
const pageHref = (ctx: SectionContext, link: string) => storeHref(ctx.store.slug, livePageLink(link, ctx.store.pages));
const IMAGE_FOCUS: Record<string, string> = { top: "center top", center: "center", bottom: "center bottom" };

/** The section's colour scheme, falling back to its type's default (testimonials default to "subtle"). */
function sectionScheme(section: Section): SectionBackground {
  const value = section.props.background ?? SECTIONS[section.type].defaults.background;
  return (SECTION_BACKGROUNDS as readonly unknown[]).includes(value) ? (value as SectionBackground) : "default";
}

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const list = (value: unknown): Props[] => (Array.isArray(value) ? value.filter((v): v is Props => typeof v === "object" && v !== null) : []);

/** Placeholder shown only in the editor, where an empty section would otherwise vanish. */
function PreviewHint({ ctx, children }: { ctx: SectionContext; children: ReactNode }) {
  if (!ctx.preview) return null;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-8">
      <p className="rounded-media border border-dashed border-store-line px-6 py-10 text-center text-sm text-store-muted">{children}</p>
    </div>
  );
}

function Heading({ children, align = "left" }: { children: ReactNode; align?: string }) {
  if (!children) return null;
  return (
    <h2 className={`mb-8 font-heading text-3xl font-medium tracking-[-0.035em] md:text-4xl ${align === "center" ? "text-center" : ""}`}>
      {children}
    </h2>
  );
}

function Announcement({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const message = text(props.text);
  if (!message) return <PreviewHint ctx={ctx}>Add a message for the announcement bar.</PreviewHint>;
  const link = text(props.link);
  const content = <span className="text-sm">{message}</span>;
  return (
    <div className="bg-store-accent px-4 py-2.5 text-center text-store-on-accent">
      {link ? (
        <Link href={pageHref(ctx, link)} className="underline-offset-4 hover:underline">
          {content}
        </Link>
      ) : (
        content
      )}
    </div>
  );
}

const HERO_HEIGHT: Record<string, string> = {
  compact: "min-h-[320px] md:min-h-[40dvh]",
  medium: "min-h-[440px] md:min-h-[62dvh]",
  full: "min-h-[520px] md:min-h-[86dvh]",
};

function Hero({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const image = text(props.image);
  const layout = text(props.layout, "overlay");
  const composed = layout === "split" || layout === "editorial";
  const centered = props.align === "center";
  const height = HERO_HEIGHT[text(props.height, "medium")] ?? HERO_HEIGHT.medium;
  const copy = (
    <div className={`hero-copy relative flex flex-col gap-6 ${centered ? "items-center text-center" : "items-start"}`}>
      {text(props.eyebrow) && <p className="text-xs font-semibold uppercase tracking-[0.18em]">{text(props.eyebrow)}</p>}
      {text(props.heading) && <h1 className="hero-title max-w-[14ch] text-balance font-heading font-medium tracking-[-0.045em]">{text(props.heading)}</h1>}
      {text(props.subheading) && <p className="max-w-[42ch] text-base leading-relaxed opacity-85 md:text-lg">{text(props.subheading)}</p>}
      <div className="flex flex-wrap gap-3">
        {sectionButtons(props).filter(button => button.label && button.link).map((button, index) => <Link key={index} href={pageHref(ctx, button.link)} className={`${button.style === "secondary" ? "btn-secondary" : "btn-primary"} mt-2`}>{button.label}{button.style !== "secondary" && <span aria-hidden="true">↗</span>}</Link>)}
      </div>
    </div>
  );

  if (["spotlight", "mosaic", "panorama", "utility"].includes(layout)) {
    const secondary = props.showSecondaryImage === true && ["spotlight", "mosaic"].includes(layout) ? text(props.secondaryImage) : "";
    return <section className={`designed-hero designed-${layout} designed-height-${text(props.height, "medium")} ${secondary ? "designed-with-detail" : "designed-single-image"} ${image ? "" : "designed-no-image"}`}>
      <div className="designed-hero-inner">
        {copy}
        {image && <div className="designed-visual">
          <img src={image} alt={text(props.imageAlt)} style={{ objectPosition: IMAGE_FOCUS[text(props.imageFocus)] ?? "center" }} fetchPriority="high" className="designed-main-image" />
        </div>}
        {secondary && <Link href={pageHref(ctx, text(props.secondaryCtaLink, "/products"))} className="designed-detail group">
          <img src={secondary} alt={text(props.secondaryImageAlt)} style={{ objectPosition: IMAGE_FOCUS[text(props.imageFocus)] ?? "center" }} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          {text(props.secondaryCtaLabel) && <span className="designed-detail-label">{text(props.secondaryCtaLabel)} <span aria-hidden="true">↗</span></span>}
        </Link>}
      </div>
    </section>;
  }

  if (layout === "duo") {
    return <section className={`hero-duo hero-photo relative isolate flex items-end overflow-hidden text-[#fafafa] ${height}`}>
      <div className="absolute inset-0 -z-20 grid grid-cols-2 gap-0.5 bg-store-surface">
        {[image, text(props.secondaryImage) || image].map((src, i) => src ? <img key={i} src={src} alt={text(i === 0 ? props.imageAlt : props.secondaryImageAlt)} style={{ objectPosition: IMAGE_FOCUS[text(props.imageFocus)] ?? "center" }} fetchPriority="high" className="h-full min-h-0 w-full object-cover" /> : <div key={i} />)}
      </div>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 md:py-20">{copy}</div>
    </section>;
  }

  if (composed) {
    return (
      <section className={`hero-composed hero-${layout} ${height}`}>
        <div className={`hero-composed-inner mx-auto grid w-full max-w-7xl items-center gap-8 px-4 py-10 sm:px-8 ${image ? "md:grid-cols-2" : "hero-no-image"} md:gap-14 md:py-16`}>
          {copy}
          {image && <div className="hero-image overflow-hidden rounded-media bg-store-surface"><img src={image} alt={text(props.imageAlt)} style={{ objectPosition: IMAGE_FOCUS[text(props.imageFocus)] ?? "center" }} fetchPriority="high" className="h-full w-full object-cover" /></div>}
        </div>
      </section>
    );
  }

  return (
    <section className={`hero-${layout === "poster" ? "poster" : "overlay"} relative isolate flex overflow-hidden ${image ? "hero-photo items-end text-[#fafafa]" : "items-center bg-store-surface"} ${height}`}>
      {image && <>
        <img src={image} alt={text(props.imageAlt)} style={{ objectPosition: IMAGE_FOCUS[text(props.imageFocus)] ?? "center" }} fetchPriority="high" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 via-black/45 to-black/10" />
      </>}
      <div className={`mx-auto w-full max-w-7xl px-4 py-14 sm:px-8 md:py-20 ${centered ? "flex justify-center self-center" : ""}`}>{copy}</div>
    </section>
  );
}

const COLUMNS: Record<string, string> = {
  "2": "md:grid-cols-2",
  "3": "md:grid-cols-3",
  "4": "md:grid-cols-3 lg:grid-cols-4",
};

function FeaturedProducts({ section, ctx }: { section: Section; ctx: SectionContext }) {
  const props = section.props;
  const query = productQueryFor(section);
  const products = query ? ctx.products[query.key] : undefined;
  const heading = text(props.heading);

  if (!products?.length) {
    return (
      <PreviewHint ctx={ctx}>
        {products ? "No products match yet. Add products or change the category." : "Loading products…"}
      </PreviewHint>
    );
  }

  return (
    <section className="store-section mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className={`flex flex-wrap items-baseline justify-between gap-4 ${props.headingStyle === "uppercase" ? "retail-heading" : ""}`}>
        <Heading>{heading}</Heading>
        <div className="mb-8 flex max-w-full flex-wrap gap-3">{sectionButtons({ ...SECTIONS["featured-products"].defaults, ...props }).filter(button => button.label && button.link).map((button, index) => <Link key={index} href={pageHref(ctx, button.link)} className={button.style === "secondary" ? "btn-secondary" : "btn-primary"}>{button.label}</Link>)}</div>
      </div>
      <div tabIndex={props.layout === "rail" ? 0 : undefined} role={props.layout === "rail" ? "region" : undefined} aria-label={props.layout === "rail" ? heading || "Product collection" : undefined} className={props.layout === "rail" ? "product-rail" : `grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 ${COLUMNS[text(props.columns, "4")] ?? COLUMNS["4"]}`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} storeSlug={ctx.store.slug} currency={ctx.store.currency} quickAdd={themeSettings(ctx.store.theme).quickAdd} cardStyle={text(props.cardStyle)} imageFit={text(props.imageFit)} />
        ))}
      </div>
    </section>
  );
}

function CategoryGrid({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.label) || text(i.category));
  if (!items.length) return <PreviewHint ctx={ctx}>Add tiles to link customers to your categories.</PreviewHint>;
  // One column per tile up to four, so the grid never has empty cells.
  const overlay = props.layout === "overlay";
  const circles = props.layout === "circles";
  const compact = props.layout === "compact";
  const editorial = props.layout === "editorial" && items.length > 1;
  const cols = editorial && items.length === 2 ? "md:grid-cols-[1.3fr_1fr]" : ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"][Math.min(items.length, 4)];

  return (
    <section className="store-section mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <Heading>{text(props.heading)}</Heading>
      <div className={`grid grid-cols-2 gap-4 md:gap-6 ${cols}`}>
        {items.map((item, i) => {
          const category = text(item.category) || text(item.label);
          const image = text(item.image);
          const link = typeof item.link === "string" ? item.link : `/products?category=${encodeURIComponent(category)}`;
          const className = `collection-tile collection-${text(props.layout, "grid")} group relative block ${editorial && i % 2 === 1 ? "md:pt-16" : ""} ${circles ? "text-center" : ""}`;
          const content = <>
              <div className={`${circles ? "aspect-square !rounded-full" : compact ? "aspect-[4/3]" : "aspect-[4/5]"} overflow-hidden rounded-media bg-store-surface`}>
                {image && <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
              </div>
              {overlay ? <div className="absolute inset-0 flex items-end rounded-media bg-gradient-to-t from-black/75 via-transparent to-transparent p-5 text-white"><p className="font-heading text-xl font-semibold uppercase tracking-wide md:text-3xl">{text(item.label) || category}<span aria-hidden="true" className="ml-3">↗</span></p></div> : <p className={`mt-4 flex items-center gap-2 font-heading text-base font-medium ${circles ? "justify-center" : "justify-between"}`}>{text(item.label) || category}{!circles && <span aria-hidden="true" className="text-store-muted transition-transform group-hover:translate-x-1">↗</span>}</p>}
          </>;
          return link ? <Link key={i} href={pageHref(ctx, link)} className={className}>{content}</Link> : <div key={i} className={className}>{content}</div>;
        })}
      </div>
    </section>
  );
}

function Paragraphs({ body, className = "" }: { body: string; className?: string }) {
  // Plain text only: blank lines become paragraphs, nothing is parsed as HTML.
  return (
    <div className={`space-y-4 leading-relaxed text-store-muted ${className}`}>
      {body.split(/\n\s*\n/).map((p, i) => (
        <p key={i} className="whitespace-pre-line">{p}</p>
      ))}
    </div>
  );
}

function ImageWithText({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const image = text(props.image);
  const heading = text(props.heading);
  const body = text(props.body);
  if (!image && !heading && !body) return <PreviewHint ctx={ctx}>Add an image and some text.</PreviewHint>;
  const imageRight = props.imagePosition === "right";
  // Without an image, customers get the text alone; the empty frame only shows in the editor.
  const showFrame = Boolean(image) || ctx.preview;

  return (
    <section className={`mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-8 md:gap-16 ${showFrame ? "md:grid-cols-2" : ""}`}>
      {showFrame && (
        <div className={`aspect-square overflow-hidden rounded-media bg-store-surface ${imageRight ? "md:order-2" : ""}`}>
          {image ? (
            <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <p className="flex h-full items-center justify-center p-6 text-center text-sm text-store-muted">Add an image in the editor</p>
          )}
        </div>
      )}
      <div className="max-w-[52ch]">
        {heading && <h2 className="mb-5 font-heading text-3xl font-semibold tracking-tight md:text-4xl">{heading}</h2>}
        {body && <Paragraphs body={body} />}
      </div>
    </section>
  );
}

function RichText({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const heading = text(props.heading);
  const body = text(props.body);
  if (!heading && !body) return <PreviewHint ctx={ctx}>Write something for this text block.</PreviewHint>;
  const centered = props.align === "center";

  return (
    <section className={`mx-auto max-w-3xl px-4 py-16 sm:px-8 ${centered ? "text-center" : ""}`}>
      {heading && <h2 className="mb-5 font-heading text-3xl font-semibold tracking-tight">{heading}</h2>}
      {body && <Paragraphs body={body} className={centered ? "mx-auto max-w-[65ch]" : "max-w-[65ch]"} />}
    </section>
  );
}

function Testimonials({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.quote));
  if (!items.length) return <PreviewHint ctx={ctx}>Add quotes from your customers.</PreviewHint>;

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <Heading>{text(props.heading)}</Heading>
        <div className={`grid gap-10 ${items.length > 1 ? "md:grid-cols-2" : ""} ${items.length > 2 ? "lg:grid-cols-3" : ""}`}>
          {items.map((item, i) => (
            <figure key={i} className="flex flex-col gap-4">
              <blockquote className="line-clamp-4 font-heading text-lg leading-snug">&ldquo;{text(item.quote)}&rdquo;</blockquote>
              {text(item.author) && <figcaption className="text-sm text-store-muted">{text(item.author)}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Newsletter({ props, ctx }: { props: Props; ctx: SectionContext }) {
  return (
    <section className="store-section mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="grid gap-6 rounded-media border border-store-line p-8 md:grid-cols-2 md:items-center md:p-12">
        <div>
          <h2 className="font-heading text-3xl font-medium tracking-tight md:text-4xl">{text(props.heading, SECTIONS.newsletter.defaults.heading as string)}</h2>
          {text(props.body) && <p className="mt-2 text-store-muted">{text(props.body)}</p>}
        </div>
        <NewsletterForm storeSlug={ctx.store.slug} disabled={ctx.preview} />
      </div>
    </section>
  );
}

function Faq({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.question));
  if (!items.length) return <PreviewHint ctx={ctx}>Add questions and answers.</PreviewHint>;
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <Heading>{text(props.heading)}</Heading>
      <div className="divide-y divide-store-line border-y border-store-line">
        {items.map((item, i) => (
          <details key={i} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {text(item.question)}
              <span aria-hidden="true" className="text-xl leading-none text-store-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            {text(item.answer) && <Paragraphs body={text(item.answer)} className="mt-3" />}
          </details>
        ))}
      </div>
    </section>
  );
}

function SellingPoints({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.title));
  if (!items.length) return <PreviewHint ctx={ctx}>Add a few reasons to buy from you.</PreviewHint>;
  const cols = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"][items.length];
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-8">
      <Heading>{text(props.heading)}</Heading>
      <div className={`grid gap-8 ${cols}`}>
        {items.map((item, i) => (
          <div key={i} className="border-t-2 border-store-fg pt-4">
            <p className="font-heading text-lg font-semibold">{text(item.title)}</p>
            {text(item.body) && <p className="mt-1.5 text-sm leading-relaxed text-store-muted">{text(item.body)}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}

function PromoTiles({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.heading) || text(i.image));
  if (!items.length) return <PreviewHint ctx={ctx}>Add promo tiles that link to categories or pages.</PreviewHint>;
  // The first tile is larger when there are three, so the row doesn't read as three equal cards.
  const layout = items.length === 3 ? "md:grid-cols-[1.4fr_1fr_1fr]" : items.length === 2 ? "md:grid-cols-2" : "";
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-8">
      <div className={`grid gap-4 ${layout}`}>
        {items.map((item, i) => {
          const image = text(item.image);
          const inner = (
            <div className="relative isolate flex min-h-[220px] flex-col justify-end overflow-hidden rounded-media bg-store-surface p-6 md:min-h-[300px]">
              {image && (
                <>
                  <img src={image} alt="" loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/65 to-black/0" />
                </>
              )}
              <p className={`font-heading text-2xl font-semibold ${image ? "text-[#fafafa]" : ""}`}>{text(item.heading)}</p>
              {text(item.linkLabel) && <span className={`mt-2 text-sm underline underline-offset-4 ${image ? "text-[#fafafa]" : ""}`}>{text(item.linkLabel)}</span>}
            </div>
          );
          return text(item.link) ? (
            <Link key={i} href={pageHref(ctx, text(item.link))} className="group block">{inner}</Link>
          ) : (
            <div key={i}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}

function LinkStrip({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((item) => text(item.label));
  if (!items.length) return <PreviewHint ctx={ctx}>Add collection shortcuts.</PreviewHint>;
  return <nav aria-label={text(props.heading, "Collection shortcuts")} className="border-y border-store-line px-4 py-5 sm:px-8">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4">
      {text(props.heading) && <p className="text-xs font-semibold uppercase tracking-widest text-store-muted">{text(props.heading)}</p>}
      {items.map((item, i) => <Link key={i} href={pageHref(ctx, text(item.link))} className="border-b border-transparent py-1 text-sm font-semibold uppercase tracking-wide hover:border-store-fg">{text(item.label)}</Link>)}
    </div>
  </nav>;
}

function SectionView({ section, ctx }: { section: Section; ctx: SectionContext }) {
  const props = section.props;
  switch (section.type) {
    case "campaign-slider": {
      const slides = list(props.slides).filter((item) => text(item.heading) || text(item.image)).map((item) => ({
        heading: text(item.heading), eyebrow: text(item.eyebrow), body: text(item.body), image: text(item.image), imageAlt: text(item.imageAlt), imageFocus: text(item.imageFocus), ctaLabel: text(item.ctaLabel), ctaLink: livePageLink(text(item.ctaLink, "/products"), ctx.store.pages), buttons: sectionButtons(item).map(button => ({ ...button, link: livePageLink(button.link, ctx.store.pages) })),
      }));
      return slides.length ? <CampaignSlider slides={slides} storeSlug={ctx.store.slug} label={text(props.label, "Latest collections")} full={props.height === "full"} layout={text(props.layout, "split")} /> : <PreviewHint ctx={ctx}>Add your first campaign.</PreviewHint>;
    }
    case "link-strip": return <LinkStrip props={props} ctx={ctx} />;
    case "announcement":
      return <Announcement props={props} ctx={ctx} />;
    case "hero":
      return <Hero props={props} ctx={ctx} />;
    case "product-catalog":
      return <ProductCatalog products={ctx.products[productQueryFor(section)!.key] ?? []} storeSlug={ctx.store.slug} currency={ctx.store.currency} quickAdd={themeSettings(ctx.store.theme).quickAdd} props={props} preview={ctx.preview} category={ctx.category} />;
    case "featured-products":
      return <FeaturedProducts section={section} ctx={ctx} />;
    case "category-grid":
      return <CategoryGrid props={props} ctx={ctx} />;
    case "image-with-text":
      return <ImageWithText props={props} ctx={ctx} />;
    case "rich-text":
      return <RichText props={props} ctx={ctx} />;
    case "testimonials":
      return <Testimonials props={props} ctx={ctx} />;
    case "newsletter":
      return <Newsletter props={props} ctx={ctx} />;
    case "faq":
      return <Faq props={props} ctx={ctx} />;
    case "selling-points":
      return <SellingPoints props={props} ctx={ctx} />;
    case "promo-tiles":
      return <PromoTiles props={props} ctx={ctx} />;
    default:
      return null;
  }
}

export default function Sections({ sections, ctx, selectedId }: { sections: Section[]; ctx: SectionContext; selectedId?: string | null }) {
  return (
    <>
      {sections.map((section) => {
        const scheme = sectionScheme(section);
        const preview = ctx.preview
          ? `relative scroll-mt-24 cursor-pointer outline-offset-[-2px] hover:outline-dashed hover:outline-2 hover:outline-store-accent ${selectedId === section.id ? "outline outline-2 !outline-store-accent" : ""}`
          : "";
        return (
          <div
            key={section.id}
            data-section-id={section.id}
            style={schemeStyle(ctx.store.theme, scheme)}
            className={`${scheme === "default" ? "" : "bg-store-bg text-store-fg"} ${preview}`}
          >
            <SectionView section={section} ctx={ctx} />
          </div>
        );
      })}
    </>
  );
}
