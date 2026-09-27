import Link from "next/link";
import type { ReactNode } from "react";
import { productQueryFor, SECTIONS, storeHref, type Section } from "@repo/core";
import type { SectionContext } from "@/lib/types";
import ProductCard from "../ProductCard";
import NewsletterForm from "./NewsletterForm";

// Every section renders on the server for customers and in the browser for the
// editor preview, so nothing here may use hooks or server-only APIs.

type Props = Record<string, unknown>;

const text = (value: unknown, fallback = "") => (typeof value === "string" ? value : fallback);
const list = (value: unknown): Props[] => (Array.isArray(value) ? value.filter((v): v is Props => typeof v === "object" && v !== null) : []);

/** Placeholder shown only in the editor, where an empty section would otherwise vanish. */
function PreviewHint({ ctx, children }: { ctx: SectionContext; children: ReactNode }) {
  if (!ctx.preview) return null;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-8">
      <p className="rounded-lg border border-dashed border-store-line px-6 py-10 text-center text-sm text-store-muted">{children}</p>
    </div>
  );
}

function Heading({ children, align = "left" }: { children: ReactNode; align?: string }) {
  if (!children) return null;
  return (
    <h2 className={`mb-8 font-heading text-2xl font-semibold tracking-tight md:text-3xl ${align === "center" ? "text-center" : ""}`}>
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
        <Link href={storeHref(ctx.store.slug, link)} className="underline-offset-4 hover:underline">
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
  const centered = props.align === "center";
  const heading = text(props.heading);
  const subheading = text(props.subheading);
  const ctaLabel = text(props.ctaLabel);
  const height = HERO_HEIGHT[text(props.height, "medium")] ?? HERO_HEIGHT.medium;

  const copy = (
    <div className={`relative flex max-w-2xl flex-col gap-5 ${centered ? "mx-auto items-center text-center" : ""}`}>
      {heading && <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">{heading}</h1>}
      {subheading && <p className="max-w-[48ch] text-base leading-relaxed opacity-85 md:text-lg">{subheading}</p>}
      {ctaLabel && (
        <Link href={storeHref(ctx.store.slug, text(props.ctaLink, "/products"))} className="btn-primary mt-2">
          {ctaLabel}
        </Link>
      )}
    </div>
  );

  if (!image) {
    return (
      <section className={`flex items-center bg-store-surface ${height}`}>
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-8">{copy}</div>
      </section>
    );
  }

  return (
    <section className={`relative isolate flex items-end overflow-hidden text-[#fafafa] ${height}`}>
      <img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      {/* Scrim keeps light text readable on any photo. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/70 via-black/35 to-black/10" />
      <div className={`mx-auto w-full max-w-7xl px-4 py-14 sm:px-8 md:py-20 ${centered ? "self-center" : ""}`}>{copy}</div>
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
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <Heading>{heading}</Heading>
        <Link href={`/${ctx.store.slug}/products`} className="mb-8 shrink-0 text-sm text-store-muted underline-offset-4 hover:text-store-fg hover:underline">
          View all
        </Link>
      </div>
      <div className={`grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 ${COLUMNS[text(props.columns, "4")] ?? COLUMNS["4"]}`}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} storeSlug={ctx.store.slug} currency={ctx.store.currency} />
        ))}
      </div>
    </section>
  );
}

function CategoryGrid({ props, ctx }: { props: Props; ctx: SectionContext }) {
  const items = list(props.items).filter((i) => text(i.label) || text(i.category));
  if (!items.length) return <PreviewHint ctx={ctx}>Add tiles to link customers to your categories.</PreviewHint>;
  // One column per tile up to four, so the grid never has empty cells.
  const cols = ["", "md:grid-cols-1", "md:grid-cols-2", "md:grid-cols-3", "md:grid-cols-4"][Math.min(items.length, 4)];

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <Heading>{text(props.heading)}</Heading>
      <div className={`grid grid-cols-2 gap-4 md:gap-6 ${cols}`}>
        {items.map((item, i) => {
          const category = text(item.category) || text(item.label);
          const image = text(item.image);
          return (
            <Link key={i} href={`/${ctx.store.slug}/products?category=${encodeURIComponent(category)}`} className="group block">
              <div className="aspect-[4/5] overflow-hidden rounded-lg bg-store-surface">
                {image && <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />}
              </div>
              <p className="mt-3 font-medium">{text(item.label) || category}</p>
            </Link>
          );
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

  return (
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-8 md:grid-cols-2 md:gap-16">
      <div className={`aspect-square overflow-hidden rounded-lg bg-store-surface ${imageRight ? "md:order-2" : ""}`}>
        {image && <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
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
    <section className="bg-store-surface py-16">
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
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="grid gap-6 rounded-lg border border-store-line p-8 md:grid-cols-2 md:items-center md:p-12">
        <div>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">{text(props.heading, SECTIONS.newsletter.defaults.heading as string)}</h2>
          {text(props.body) && <p className="mt-2 text-store-muted">{text(props.body)}</p>}
        </div>
        <NewsletterForm storeSlug={ctx.store.slug} disabled={ctx.preview} />
      </div>
    </section>
  );
}

function SectionView({ section, ctx }: { section: Section; ctx: SectionContext }) {
  const props = section.props;
  switch (section.type) {
    case "announcement":
      return <Announcement props={props} ctx={ctx} />;
    case "hero":
      return <Hero props={props} ctx={ctx} />;
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
    default:
      return null;
  }
}

export default function Sections({ sections, ctx, selectedId }: { sections: Section[]; ctx: SectionContext; selectedId?: string | null }) {
  return (
    <>
      {sections.map((section) => (
        <div
          key={section.id}
          data-section-id={section.id}
          className={ctx.preview ? `relative scroll-mt-24 cursor-pointer outline-offset-[-2px] hover:outline-dashed hover:outline-2 hover:outline-store-accent ${selectedId === section.id ? "outline outline-2 !outline-store-accent" : ""}` : undefined}
        >
          <SectionView section={section} ctx={ctx} />
        </div>
      ))}
    </>
  );
}
