import type { CSSProperties } from "react";
import { FONT_OPTIONS, isFontName, readableTextOn, TEMPLATES } from "@repo/core";
import { FONT_STACK } from "./fonts";
import type { StoreTheme } from "./types";

const FALLBACK = TEMPLATES.classic.theme;

/**
 * CSS variables for a store's theme. Tailwind's `store-*` colours and
 * `font-heading`/`font-body` read these, so every component follows the theme.
 */
export function themeStyle(theme: StoreTheme | null): CSSProperties {
  const t = theme ?? FALLBACK;
  const font = isFontName(t.fontFamily) ? t.fontFamily : FALLBACK.fontFamily;
  const serif = FONT_OPTIONS.find((f) => f.name === font)?.kind === "serif";
  return {
    "--s-bg": t.secondaryColor,
    "--s-fg": t.primaryColor,
    "--s-accent": t.accentColor,
    "--s-on-accent": readableTextOn(t.accentColor),
    "--s-muted": `color-mix(in srgb, ${t.primaryColor} 62%, ${t.secondaryColor})`,
    "--s-line": `color-mix(in srgb, ${t.primaryColor} 14%, ${t.secondaryColor})`,
    "--s-surface": `color-mix(in srgb, ${t.primaryColor} 5%, ${t.secondaryColor})`,
    "--s-font-heading": `${FONT_STACK[font]}, system-ui, sans-serif`,
    // Serif display faces read poorly at body sizes, so body text falls back to Manrope.
    "--s-font-body": `${serif ? FONT_STACK.Manrope : FONT_STACK[font]}, system-ui, sans-serif`,
  } as CSSProperties;
}
