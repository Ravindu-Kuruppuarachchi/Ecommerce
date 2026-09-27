/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // Every storefront colour comes from the store's theme (see lib/theme.ts).
      colors: {
        store: {
          bg: "var(--s-bg)",
          fg: "var(--s-fg)",
          muted: "var(--s-muted)",
          line: "var(--s-line)",
          surface: "var(--s-surface)",
          accent: "var(--s-accent)",
          "on-accent": "var(--s-on-accent)",
        },
      },
      fontFamily: {
        heading: "var(--s-font-heading)",
        body: "var(--s-font-body)",
      },
      // Shape rule: controls (buttons, inputs) use rounded-control, images and panels use
      // rounded-media. Both follow the store's corner style setting.
      borderRadius: {
        control: "var(--s-radius-control)",
        media: "var(--s-radius-media)",
      },
      aspectRatio: {
        product: "var(--s-image-ratio)",
      },
    },
  },
  plugins: [],
};
