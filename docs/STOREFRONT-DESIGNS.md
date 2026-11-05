# Storefront design collection

The platform includes 20 editable starter designs, including six specialist
retail designs and four layouts inspired by Sri Lankan retailers. Designs use
original template names and bundled stock photography.

| Design | Reference | Design direction |
| --- | --- | --- |
| Motion | [Carnage](https://incarnage.com/) | Contrast masthead, strong campaign typography, men/women calls to action and horizontal product collections. |
| Runway | [Kandy Selection](https://www.kandyselection.lk/) | Full-width fashion campaigns, a clean header, collection shortcuts and image-led department tiles. |
| Avenue | [Cool Planet](https://coolplanet.lk/) | A two-level department header, prominent search entry, browsable categories and several product departments. |
| Muse | [Zigzag](https://zigzag.lk/) | Women's fashion campaigns, a centred brand, occasion-based browsing and restrained product presentation. |

These are design references, not copied brand assets. Templates use editable
section data and the same renderer as published stores.

## Specialist shops

| Design | Shop type | Design direction |
| --- | --- | --- |
| Circuit | Electronics | Searchable department header, blue highlights, square product cards and computing/audio collections. |
| Forge | Hardware | Graphite masthead, safety-yellow accents, tool departments and a dense workshop catalog. |
| Reef | Aquariums | Deep aquatic palette, tank photography and separate fish, plant and equipment collections. |
| Habitat | Furniture | A spacious furniture showroom, room-based browsing and landscape product cards. |
| Paws | Pets | Rounded shapes, dog/cat entry points and quick-add collections. |
| Folio | Books | Editorial type, genre shortcuts, portrait product cards and a scrolling reading edit. |

The gallery can filter designs by shop type as well as visual style. Shop-type
metadata is also returned by the public template catalog. Demo products, photos
and prices are illustrative. Templates do not add inventory or enable shipping
rules for particular industries.

## New controls

- Campaign slideshow: up to five campaigns, with manual next/previous and keyboard
  controls. Campaigns never advance automatically.
- Hero compositions: full-width banner, overlay, split, editorial, poster, dual campaign, product
  spotlight, asymmetric mosaic, panorama and industrial utility.
- Spotlight and mosaic heroes support an optional linked second image, disabled
  by default. Enable “Show optional small side image” and upload a second image
  to opt in. No starter template includes a secondary hero image.
- Campaign image layout: full-width banner or split. Hero image layout, height
  and focal point are editable in the section settings.
- Product cards: minimal or framed, with cover/contain image fit; sale and sold-out
  labels reflect actual product data.
- Featured products: grid or horizontally scrolling collection. Mobile rails show
  a partial next card and support keyboard and touch scrolling.
- Category tiles: grid, editorial, compact, overlay or circular presentation.
- Collection shortcuts: editable labelled links.
- Header: compact, standard, centred, contrast or department layout.
- Theme navigation: up to eight labelled collection links, with store-relative
  destinations such as `/products?category=Women`.
- Hero and campaign image focal points: top, centre or bottom.

Merchants should set links to categories they actually use. Templates don't
create products or categories. Standalone design demos use sample products and
keep shopping and newsletter submissions disabled; campaign and menu controls
remain interactive.

Existing page content is preserved when switching a theme unless the merchant
explicitly chooses to replace pages. No database migration is required.

Run `npm run test:templates` for template validation, bundled asset checks,
legacy compatibility, navigation sanitisation and nested campaign validation.

## Layout refresh

Most starters now use one edge-to-edge banner image, including Reef, Runway,
Muse, Motion, Paws, Avenue, Classic, Flora, Atelier and Ritual. Habitat places
its introduction above a full-width panorama. Circuit retains a two-column
product spotlight; Folio retains a two-column editorial composition. Forge
uses a solid yellow utility panel beside workshop photography. Shared headers,
collection tiles, product cards and footers have tighter typography and spacing.

These layouts appear immediately in template previews. Existing saved pages keep
their section data: select a new hero composition in the page editor, or explicitly
replace pages when applying a starter design. Shared component styling updates
existing storefronts without rewriting merchant content.

## Multi-page editing

The page editor has an Editing page selector and a Pages & links panel. Merchants
can create named pages with optional custom addresses, switch between them, and
edit each page's sections. Switching pages saves pending changes as drafts; a
failed save keeps the editor on its current page. Publishing remains explicit.
Each page switch resets section selection and reloads the correct preview.

URL fields include a destination picker for Home, the catalog, and all merchant
pages. Connect this page adds an editable collection-shortcuts section. The link
map shows draft connections across pages, nested button links, category/catalog
links, and the store menu. It flags missing and unpublished page destinations.
External addresses and product availability are not checked by this map.

Published custom pages appear in the shared storefront menu and footer across
all templates. Custom navigation entries are deduplicated against these page
links. Header/footer page links in the editor preview open the corresponding page
in the editor; links inside sections select their section for editing. Product-detail pages continue to be driven by the merchant's product data.
The Products page is editable through its Product catalog section, which still
uses the merchant's live inventory.


## Products and Story pages

Opening the editor prepares built-in Products and missing Story pages for existing
stores. Products starts with the same published catalog that customers already
see. Story content is taken from the store's selected template, or the store
description, and starts as a draft when no saved Story page exists. Existing
pages, drafts, and published versions are preserved. This preparation is scoped
to the signed-in merchant, works with every template, and does not require a
schema migration. Story defaults are seeded once, so deleting a Story page does
not recreate it on each editor visit.

Choose Products in the page selector to edit its heading, introduction, number
of columns, category filters, count, card style, and image fit. Merchants can add
banners and other sections above or below the catalog. Save keeps those edits in
a draft; Publish applies them to the existing `/products` address. Category links
and catalog items continue to use real product records, stock, and prices. The
catalog retains the existing 100-product retrieval limit.

The internal Products page key is `__products`, which cannot collide with custom
page addresses. Link pickers and the link map use `/products`, and the built-in
page cannot be deleted. It is excluded from automatically appended custom page
navigation to avoid a duplicate Shop link. Clicking Shop in the editor preview
opens this Products editor. Story pages use the regular section editor and can
be saved, linked, and published just like other custom pages.
