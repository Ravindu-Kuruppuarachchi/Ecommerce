// Self-hosted variable fonts (Fontsource). Each import only declares
// @font-face rules; browsers download a face when a page actually uses it.
import "@fontsource-variable/manrope";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/outfit";
import "@fontsource-variable/inter";
import "@fontsource-variable/playfair-display";
import "@fontsource-variable/cormorant-garamond";
import type { FontName } from "@repo/core";

export const FONT_STACK: Record<FontName, string> = {
  Manrope: "'Manrope Variable'",
  "DM Sans": "'DM Sans Variable'",
  Outfit: "'Outfit Variable'",
  Inter: "'Inter Variable'",
  "Playfair Display": "'Playfair Display Variable', Georgia, serif",
  "Cormorant Garamond": "'Cormorant Garamond Variable', Georgia, serif",
};
