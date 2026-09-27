import type { CSSProperties } from "react";
import { FONT_OPTIONS, isFontName, normalizeThemeSettings, readableTextOn, TEMPLATES, type SectionBackground, type ThemeSettings } from "@repo/core";
import { FONT_STACK } from "./fonts";
import type { StoreTheme } from "./types";

const FALLBACK = TEMPLATES.classic.theme;

const RADIUS: Record<ThemeSettings["corners"], { control: string; media: string }> = {
  sharp: { control: "0px", media: "0px" },
  soft: { control: "6px", media: "10px" },
  round: { control: "9999px", media: "20px" },
};

const RATIO: Record<ThemeSettings["imageRatio"], string> = { portrait: "4 / 5", square: "1 / 1", landscape: "4 / 3" };

export function themeSettings(theme: StoreTheme | null): ThemeSettings {
  return normalizeThemeSettings(theme?.settings);
}

/** Colour variables for one palette. Shared by the page and by section colour schemes. */
function palette(bg: string, fg: string, accent: string, onAccent = readableTextOn(accent)) {
  return {
    "--s-bg": bg,
    "--s-fg": fg,
    "--s-accent": accent,
    "--s-on-accent": onAccent,
    "--s-muted": `color-mix(in srgb, ${fg} 62%, ${bg})`,
    "--s-line": `color-mix(in srgb, ${fg} 14%, ${bg})`,
    "--s-surface": `color-mix(in srgb, ${fg} 5%, ${bg})`,
  };
}

/**
 * CSS variables for a store's theme. Tailwind's `store-*` colours, `font-heading`,
 * `rounded-control`/`rounded-media` and `aspect-product` all read these.
 */
export function themeStyle(theme: StoreTheme | null): CSSProperties {
  const t = theme ?? FALLBACK;
  const settings = themeSettings(theme);
  const font = isFontName(t.fontFamily) ? t.fontFamily : FALLBACK.fontFamily;
  const serif = FONT_OPTIONS.find((f) => f.name === font)?.kind === "serif";
  return {
    ...palette(t.secondaryColor, t.primaryColor, t.accentColor),
    "--s-font-heading": `${FONT_STACK[font]}, system-ui, sans-serif`,
    // Serif display faces read poorly at body sizes, so body text falls back to Manrope.
    "--s-font-body": `${serif ? FONT_STACK.Manrope : FONT_STACK[font]}, system-ui, sans-serif`,
    "--s-radius-control": RADIUS[settings.corners].control,
    "--s-radius-media": RADIUS[settings.corners].media,
    "--s-image-ratio": RATIO[settings.imageRatio],
  } as CSSProperties;
}

/**
 * Re-maps the store palette inside one section. Everything in the section
 * keeps using the same `store-*` tokens, so text, buttons and borders stay
 * readable in every scheme without per-section styling.
 */
export function schemeStyle(theme: StoreTheme | null, scheme: SectionBackground): CSSProperties | undefined {
  const t = theme ?? FALLBACK;
  switch (scheme) {
    case "subtle":
      return { ...palette(`color-mix(in srgb, ${t.primaryColor} 5%, ${t.secondaryColor})`, t.primaryColor, t.accentColor, readableTextOn(t.accentColor)) } as CSSProperties;
    case "accent": {
      const text = readableTextOn(t.accentColor);
      // Buttons flip to the text colour so they still stand out on the accent.
      return palette(t.accentColor, text, text, t.accentColor) as CSSProperties;
    }
    case "inverse":
      return palette(t.primaryColor, t.secondaryColor, t.accentColor) as CSSProperties;
    default:
      return undefined;
  }
}
