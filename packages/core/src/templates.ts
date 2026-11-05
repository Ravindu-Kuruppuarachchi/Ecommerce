// A template copies editable theme tokens and validated sections into a store.
// Photography is served locally, so a new store does not depend on a stock-photo API.
import { createSection, type Section } from "./sections";
import type { FontName, HeaderStyle, ThemeSettings } from "./theme";
import { categoryPageSlug, pagePath, pagePresetSections, PRODUCTS_PAGE_SLUG, catalogCategory } from "./pages";

export type TemplateKey = "classic" | "boutique" | "bazaar" | "studio" | "market" | "noir" | "flora" | "atelier" | "pulse" | "ritual" | "motion" | "runway" | "avenue" | "muse" | "circuit" | "forge" | "reef" | "habitat" | "paws" | "folio";
export const SHOP_TYPES = ["General", "Fashion", "Electronics", "Hardware", "Aquariums", "Furniture & home", "Pets", "Books", "Food & grocery", "Garden & plants", "Beauty"] as const;
export type ShopType = (typeof SHOP_TYPES)[number];

export interface ThemeTokens {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: FontName;
  headerStyle: HeaderStyle;
  settings: ThemeSettings;
}
export interface TemplatePage { slug: string; title: string; sections: Section[]; showInNavigation?: boolean; navigationPosition?: number; category?: string | null }
export interface TemplateDefinition {
  key: TemplateKey;
  name: string;
  description: string;
  bestFor: string;
  industry: ShopType;
  style: "Minimal" | "Editorial" | "Bold" | "Natural" | "Sport" | "Retail";
  theme: ThemeTokens;
  pages: TemplatePage[];
}
export const HOME_PAGE_SLUG = "home";
export const templateImage = (name: string) => `/template-assets/${name}.jpg`;
const section = createSection;
const hero = (heading: string, image: string, layout: string, props: Record<string, unknown> = {}) =>
  section("hero", { heading, image: templateImage(image), layout, subheading: "Discover a considered collection of things you'll love to make part of your everyday.", ...props }, "hero");
const featured = (heading: string, columns = "4") => section("featured-products", { heading, columns, limit: columns === "3" ? 6 : 8 }, "featured");
const newsletter = (heading = "Good things, in your inbox") => section("newsletter", { heading }, "newsletter");
const collections = (items: [string, string][], layout = "grid", heading = "Find your favourites") => section("category-grid", {
  heading, layout,
  items: items.map(([label, image]) => ({ label, category: label, image: templateImage(image) })),
}, "collections");
const story = (heading: string, image: string) => section("image-with-text", {
  heading, image: templateImage(image), body: "A collection built around the details. Discover the materials, textures and everyday pieces that make this store our own.",
}, "story");
const pages = (sections: Section[], about?: Section): TemplatePage[] => [
  { slug: HOME_PAGE_SLUG, title: "Home", sections },
  ...(about ? [{ slug: "about", title: "Our story", sections: [about] }] : []),
];

export const TEMPLATES: Record<TemplateKey, TemplateDefinition> = {
  circuit: {
    key: "circuit", name: "Circuit", industry: "Electronics", style: "Retail",
    description: "A crisp technology storefront with a searchable department header, square product imagery and focused collections.",
    bestFor: "Electronics shops, computers, mobile phones and audio accessories",
    theme: { primaryColor: "#162135", secondaryColor: "#f7f9fc", accentColor: "#2457ce", fontFamily: "DM Sans", headerStyle: "department", settings: {
      corners: "soft", buttons: "solid", imageRatio: "square", quickAdd: true,
      navigation: [{ label: "All tech", link: "/products" }, { label: "Laptops", link: "/products?category=Laptops" }, { label: "Phones", link: "/products?category=Phones" }, { label: "Audio", link: "/products?category=Audio" }, { label: "Accessories", link: "/products?category=Accessories" }],
    } },
    pages: pages([
      hero("Good tech. Great everyday.", "laptop", "spotlight", { height: "compact", eyebrow: "Meet your next upgrade", subheading: "From your first call to your last playlist. Find the technology that fits your day.", ctaLabel: "Explore all tech", secondaryCtaLabel: "Shop audio", secondaryCtaLink: "/products?category=Audio", imageAlt: "An open laptop on a clean workspace" }),
      section("category-grid", { heading: "Find your next upgrade", layout: "compact", items: [
        { label: "Laptops", category: "Laptops", image: templateImage("laptop") }, { label: "Phones", category: "Phones", image: templateImage("phone") }, { label: "Audio", category: "Audio", image: templateImage("tech") },
      ] }, "departments"),
      section("featured-products", { heading: "Your next upgrade", limit: 8, columns: "4", cardStyle: "framed" }, "featured"),
      section("promo-tiles", { items: [
        { heading: "A better desk setup", image: templateImage("laptop"), link: "/products?category=Laptops", linkLabel: "Explore computing" },
        { heading: "Your daily soundtrack", image: templateImage("tech"), link: "/products?category=Audio", linkLabel: "Shop audio" },
      ] }, "promos"),
      newsletter("Keep up with what's next"),
    ]),
  },
  forge: {
    key: "forge", name: "Forge", industry: "Hardware", style: "Bold",
    description: "Workshop photography, graphite and safety yellow, clear tool departments and a practical product-first layout.",
    bestFor: "Hardware stores, tools, building supplies and DIY retailers",
    theme: { primaryColor: "#232629", secondaryColor: "#f6f7f7", accentColor: "#f0c548", fontFamily: "Outfit", headerStyle: "contrast", settings: {
      corners: "sharp", buttons: "solid", imageRatio: "square", quickAdd: true,
      navigation: [{ label: "Shop all", link: "/products" }, { label: "Power tools", link: "/products?category=Power%20tools" }, { label: "Hand tools", link: "/products?category=Hand%20tools" }, { label: "Fixings", link: "/products?category=Fixings" }, { label: "Safety", link: "/products?category=Safety" }],
    } },
    pages: pages([
      hero("Built for the job.", "workshop", "utility", { height: "medium", eyebrow: "From the workbench to the worksite", subheading: "Tools, supplies and everyday workshop essentials. Start with what you need for the job.", ctaLabel: "Shop all tools", imageAlt: "Tools and equipment in a workshop" }),
      section("link-strip", { heading: "Get to work", background: "accent", items: [{ label: "Power tools", link: "/products?category=Power%20tools" }, { label: "Hand tools", link: "/products?category=Hand%20tools" }, { label: "Fixings", link: "/products?category=Fixings" }, { label: "Safety", link: "/products?category=Safety" }] }, "shortcuts"),
      section("featured-products", { heading: "Ready for the work ahead", headingStyle: "uppercase", limit: 8, columns: "4", cardStyle: "framed" }, "featured"),
      collections([["Hand tools", "hand-tools"], ["Workshop", "workshop"]], "overlay", "From the workshop"),
      section("rich-text", { heading: "Start with the right fit.", body: "Check product dimensions, material compatibility and the manufacturer's instructions before choosing supplies for your project.", background: "subtle" }, "guide"),
    ]),
  },
  reef: {
    key: "reef", name: "Reef", industry: "Aquariums", style: "Natural",
    description: "Deep aquatic tones, a full-width aquarium banner and separate paths for livestock, aquascaping and equipment.",
    bestFor: "Aquarium shops, ornamental fish, aquascaping and aquatic supplies",
    theme: { primaryColor: "#e8f5f3", secondaryColor: "#102c30", accentColor: "#7ed6c1", fontFamily: "Manrope", headerStyle: "standard", settings: {
      corners: "soft", buttons: "solid", imageRatio: "landscape", quickAdd: false,
      navigation: [{ label: "Explore", link: "/products" }, { label: "Fish", link: "/products?category=Fish" }, { label: "Plants", link: "/products?category=Plants" }, { label: "Aquariums", link: "/products?category=Aquariums" }, { label: "Equipment", link: "/products?category=Equipment" }],
    } },
    pages: pages([
      hero("Life beneath the surface.", "aquarium", "banner", { height: "full", eyebrow: "Build your underwater world", subheading: "Explore aquariums, aquatic plants and equipment for your next setup.", ctaLabel: "Explore the collection", secondaryCtaLabel: "Explore the fish", secondaryCtaLink: "/products?category=Fish", imageAlt: "A planted freshwater aquarium with red and green aquatic plants" }),
      collections([["Fish", "fish"], ["Aquariums", "aquarium"], ["Plants", "aquarium"]], "compact", "Build your underwater world"),
      section("featured-products", { heading: "For your next aquascape", layout: "rail", limit: 8 }, "featured"),
      section("image-with-text", { heading: "Plan your setup, piece by piece.", image: templateImage("aquarium"), imagePosition: "right", body: "Browse tanks, aquascaping materials and equipment by category. Check each product's dimensions and specifications to find what fits your setup.", background: "subtle" }, "setup"),
      newsletter("A fresh perspective, occasionally"),
    ]),
  },
  habitat: {
    key: "habitat", name: "Habitat", industry: "Furniture & home", style: "Editorial",
    description: "A room-led furniture showroom with expansive photography, balanced typography and spacious landscape product cards.",
    bestFor: "Furniture stores, sofas, lighting, interiors and home decor",
    theme: { primaryColor: "#27333b", secondaryColor: "#f2f5f7", accentColor: "#3f6270", fontFamily: "Manrope", headerStyle: "premium", settings: {
      corners: "soft", buttons: "outline", imageRatio: "landscape", quickAdd: false,
      navigation: [{ label: "Living", link: "/products?category=Living" }, { label: "Seating", link: "/products?category=Seating" }, { label: "Home", link: "/products" }],
    } },
    pages: pages([
      hero("Good spaces. Better living.", "interior", "panorama", { height: "medium", eyebrow: "Furniture for the way you live", subheading: "Soft landings, favourite corners and space for your everyday. Find the pieces that bring it together.", ctaLabel: "Discover the collection", imageAlt: "A bright living room with sculptural furniture and natural light" }),
      section("category-grid", { heading: "Find your room", layout: "editorial", items: [{ label: "Living", category: "Living", image: templateImage("interior") }, { label: "Seating", category: "Seating", image: templateImage("chair") }] }, "rooms"),
      featured("Pieces to come home to", "3"),
      section("image-with-text", { heading: "Room for your own point of view.", image: templateImage("interior"), body: "Explore furniture, lighting and everyday objects. Begin with a room, a colour or a piece you love, and build from there.", imagePosition: "right" }, "story"),
      newsletter("A little inspiration for your space"),
    ]),
  },
  paws: {
    key: "paws", name: "Paws", industry: "Pets", style: "Natural",
    description: "Friendly rounded shapes, playful colour and easy-to-browse dog and cat collections with quick-add product cards.",
    bestFor: "Pet shops, dog and cat supplies, toys and pet accessories",
    theme: { primaryColor: "#293b31", secondaryColor: "#f5f8f3", accentColor: "#42674b", fontFamily: "DM Sans", headerStyle: "standard", settings: {
      corners: "round", buttons: "solid", imageRatio: "square", quickAdd: true,
      navigation: [{ label: "Shop all", link: "/products" }, { label: "Dogs", link: "/products?category=Dogs" }, { label: "Cats", link: "/products?category=Cats" }, { label: "Toys", link: "/products?category=Toys" }, { label: "Accessories", link: "/products?category=Accessories" }],
    } },
    pages: pages([
      hero("Their best life starts here.", "pets", "banner", { height: "medium", eyebrow: "Little things. Big tail wags.", subheading: "Find everyday accessories, toys and supplies for your favourite companions.", ctaLabel: "Shop for dogs", ctaLink: "/products?category=Dogs", secondaryCtaLabel: "Shop for cats", secondaryCtaLink: "/products?category=Cats", imageAlt: "Two dogs running together outdoors" }),
      collections([["Dogs", "pets"], ["Cats", "cat"]], "circles", "For your favourite companion"),
      featured("Everyday favourites"),
      section("promo-tiles", { items: [{ heading: "A little more playtime", image: templateImage("pets"), link: "/products?category=Toys", linkLabel: "Explore toys" }, { heading: "Their favourite corner", image: templateImage("cat"), link: "/products?category=Cats", linkLabel: "Shop for cats" }] }, "promos"),
      newsletter("Good things for your good company"),
    ]),
  },
  folio: {
    key: "folio", name: "Folio", industry: "Books", style: "Editorial",
    description: "A quiet bookstore with editorial typography, genre shortcuts and portrait book collections that invite browsing.",
    bestFor: "Bookshops, independent publishers, stationery and reading gifts",
    theme: { primaryColor: "#263447", secondaryColor: "#fafafa", accentColor: "#44628b", fontFamily: "Playfair Display", headerStyle: "minimal", settings: {
      corners: "sharp", buttons: "solid", imageRatio: "portrait", quickAdd: true,
      navigation: [{ label: "Browse books", link: "/products" }, { label: "Fiction", link: "/products?category=Fiction" }, { label: "Non-fiction", link: "/products?category=Non-fiction" }, { label: "Stationery", link: "/products?category=Stationery" }],
    } },
    pages: pages([
      hero("One more chapter.", "books", "mosaic", { height: "medium", eyebrow: "A place for curious minds", subheading: "Familiar favourites, unexpected discoveries and a little time to turn the page.", ctaLabel: "Browse the shelves", imageAlt: "Shelves filled with books in a library" }),
      section("link-strip", { heading: "Find a shelf", items: [{ label: "Fiction", link: "/products?category=Fiction" }, { label: "Non-fiction", link: "/products?category=Non-fiction" }, { label: "Children's books", link: "/products?category=Children" }, { label: "Stationery", link: "/products?category=Stationery" }] }, "genres"),
      section("featured-products", { heading: "Fresh on the shelves", layout: "rail", limit: 8 }, "featured"),
      section("image-with-text", { heading: "A small pause. A whole new world.", image: templateImage("reading"), body: "Make room for a new story. Explore the collection, take your time and find something that stays with you.", imagePosition: "left", background: "subtle" }, "story"),
      newsletter("A little reading inspiration"),
    ]),
  },

  motion: {
    key: "motion", industry: "Fashion", name: "Motion", style: "Sport",
    description: "A bold dual-image campaign, a black masthead and swipeable product collections. Built for brands on the move.",
    bestFor: "Activewear, streetwear, footwear and gym brands",
    theme: { primaryColor: "#141414", secondaryColor: "#ffffff", accentColor: "#141414", fontFamily: "Outfit", headerStyle: "contrast", settings: {
      corners: "sharp", buttons: "solid", imageRatio: "portrait", quickAdd: false,
      navigation: [{ label: "Women", link: "/products?category=Women" }, { label: "Men", link: "/products?category=Men" }, { label: "Training", link: "/products?category=Training" }, { label: "Accessories", link: "/products?category=Accessories" }],
    } },
    pages: pages([
      hero("Made for your next move.", "training", "banner", { height: "full", eyebrow: "Training. Rest days. Every day.", subheading: "Find your pace in activewear and everyday essentials.", imageAlt: "Training equipment inside a gym", ctaLabel: "Shop women", ctaLink: "/products?category=Women", secondaryCtaLabel: "Shop men", secondaryCtaLink: "/products?category=Men" }),
      section("featured-products", { heading: "The latest lineup", layout: "rail", headingStyle: "uppercase", limit: 8 }, "featured"),
      collections([["Training", "training"], ["Rest day", "casualwear"], ["Footwear", "sneakers"]], "overlay"),
      section("link-strip", { heading: "Find your focus", items: [{ label: "Training", link: "/products?category=Training" }, { label: "Running", link: "/products?category=Running" }, { label: "Everyday", link: "/products?category=Everyday" }] }, "activities"),
      newsletter("Stay in motion"),
    ]),
  },
  runway: {
    key: "runway", industry: "Fashion", name: "Runway", style: "Retail",
    description: "Full-width fashion campaigns, a clean masthead, collection tiles and a fast route to new arrivals.",
    bestFor: "Fashion chains, clothing boutiques and seasonal collections",
    theme: { primaryColor: "#181818", secondaryColor: "#ffffff", accentColor: "#181818", fontFamily: "Manrope", headerStyle: "standard", settings: {
      corners: "sharp", buttons: "solid", imageRatio: "portrait", quickAdd: true,
      navigation: [{ label: "New in", link: "/products" }, { label: "Women", link: "/products?category=Women" }, { label: "Men", link: "/products?category=Men" }, { label: "Accessories", link: "/products?category=Accessories" }],
    } },
    pages: pages([
      section("campaign-slider", { label: "Discover the latest edits", layout: "banner", height: "full", slides: [
        { heading: "Wear it your way.", eyebrow: "The new season", body: "Fresh silhouettes and easy layers to make your own.", image: templateImage("womenswear"), imageAlt: "Women's fashion styled in the city", imageFocus: "top", ctaLabel: "Discover new arrivals", ctaLink: "/products" },
        { heading: "Off duty. On your terms.", eyebrow: "The men's edit", body: "Everyday pieces for wherever the day takes you.", image: templateImage("casualwear"), imageAlt: "Men's casual fashion outdoors", imageFocus: "top", ctaLabel: "Explore menswear", ctaLink: "/products?category=Men" },
        { heading: "A little colour goes a long way.", eyebrow: "Express yourself", body: "A fresh perspective on getting dressed.", image: templateImage("daywear"), imageAlt: "Colourful daywear styled outdoors", imageFocus: "top", ctaLabel: "Find your favourites", ctaLink: "/products?category=Women" },
      ] }, "campaigns"),
      section("link-strip", { heading: "Explore", items: [{ label: "New arrivals", link: "/products" }, { label: "Women", link: "/products?category=Women" }, { label: "Men", link: "/products?category=Men" }, { label: "Accessories", link: "/products?category=Accessories" }] }, "shortcuts"),
      featured("New on the rails"),
      collections([["The women's edit", "womenswear"], ["The men's edit", "streetwear"]], "overlay"),
      newsletter("The next collection starts here"),
    ]),
  },
  avenue: {
    key: "avenue", industry: "General", name: "Avenue", style: "Retail",
    description: "A two-level department header, a prominent search entry, circular categories and a colourful campaign spotlight.",
    bestFor: "Department stores, family fashion and multi-category retailers",
    theme: { primaryColor: "#222222", secondaryColor: "#ffffff", accentColor: "#b91c35", fontFamily: "DM Sans", headerStyle: "department", settings: {
      corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true,
      navigation: [{ label: "New in", link: "/products" }, { label: "Women", link: "/products?category=Women" }, { label: "Men", link: "/products?category=Men" }, { label: "Kids", link: "/products?category=Kids" }, { label: "Accessories", link: "/products?category=Accessories" }, { label: "Home", link: "/products?category=Home" }],
    } },
    pages: pages([
      section("announcement", { text: "A little something for every part of your day", link: "/products" }, "announcement"),
      hero("Find your everyday favourites.", "shopping", "banner", { secondaryCtaLabel: "Explore footwear", secondaryCtaLink: "/products?category=Shoes", height: "compact", eyebrow: "Discover your next favourite", subheading: "Explore fashion, home and everyday finds, all in one place.", ctaLabel: "Shop the collection", imageAlt: "A woman carrying shopping bags" }),
      collections([["Women", "womenswear"], ["Men", "streetwear"], ["Shoes", "sneakers"], ["Home", "interior"]], "circles"),
      featured("Your everyday edit"),
      section("promo-tiles", { items: [
        { heading: "For every occasion", image: templateImage("daywear"), link: "/products?category=Women", linkLabel: "Shop womenswear" },
        { heading: "Step into something new", image: templateImage("sneakers"), link: "/products?category=Shoes", linkLabel: "Explore footwear" },
        { heading: "A fresh space", image: templateImage("interior"), link: "/products?category=Home", linkLabel: "Shop home" },
      ] }, "promos"),
      newsletter("More to discover"),
    ]),
  },
  muse: {
    key: "muse", industry: "Fashion", name: "Muse", style: "Editorial",
    description: "A centred brand name, image-led women's collections, occasion shortcuts and a swipeable fashion edit.",
    bestFor: "Womenswear, workwear, occasionwear and independent fashion labels",
    theme: { primaryColor: "#242125", secondaryColor: "#ffffff", accentColor: "#85425c", fontFamily: "DM Sans", headerStyle: "premium", settings: {
      corners: "sharp", buttons: "outline", imageRatio: "portrait", quickAdd: false,
      navigation: [{ label: "New in", link: "/products" }, { label: "Dresses", link: "/products?category=Dresses" }, { label: "Tops", link: "/products?category=Tops" }],
    } },
    pages: pages([
      hero("The art of everyday.", "womenswear", "banner", { height: "full", align: "center", eyebrow: "The everyday edit", subheading: "From the first coffee to the last plan. Discover pieces that go with you.", ctaLabel: "Explore the edit", imageAlt: "Womenswear styled in an urban setting", imageFocus: "top" }),
      section("link-strip", { heading: "Find your moment", items: [{ label: "Workwear", link: "/products?category=Workwear" }, { label: "Weekend", link: "/products?category=Weekend" }, { label: "Occasionwear", link: "/products?category=Occasionwear" }, { label: "Everyday", link: "/products?category=Everyday" }] }, "occasions"),
      collections([["Dresses", "daywear"], ["Tops & layers", "womenswear"], ["Finishing touches", "beauty"]], "grid", "The collections"),
      section("featured-products", { heading: "The latest edit", layout: "rail", columns: "4", limit: 8 }, "featured"),
      newsletter("Something lovely is coming"),
    ]),
  },

  classic: {
    key: "classic", industry: "General", name: "Classic", style: "Minimal",
    description: "A fresh split-screen introduction, clean product grids and an inviting brand story.",
    bestFor: "General stores and lifestyle essentials",
    theme: { primaryColor: "#182624", secondaryColor: "#fafcfb", accentColor: "#0f766e", fontFamily: "Manrope", headerStyle: "standard", settings: { corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true } },
    pages: pages([
      hero("Everyday, a little better.", "interior", "banner", { eyebrow: "Discover something good", subheading: "Furniture, objects and daily essentials for the spaces you make your own.", ctaLabel: "Explore the collection", imageAlt: "Bright living space with thoughtfully chosen furniture" }),
      featured("Your next favourites"), story("Thoughtfully chosen. Made for living.", "objects"), newsletter(),
    ], story("Our point of view", "interior")),
  },
  boutique: {
    key: "boutique", industry: "Fashion", name: "Boutique", style: "Editorial",
    description: "An oversized editorial headline, portrait photography and an unhurried collection layout.",
    bestFor: "Fashion, jewellery and independent labels",
    theme: { primaryColor: "#252c35", secondaryColor: "#f3f5f8", accentColor: "#394b6a", fontFamily: "Playfair Display", headerStyle: "premium", settings: { corners: "sharp", buttons: "outline", imageRatio: "portrait", quickAdd: false } },
    pages: pages([
      hero("A wardrobe of possibilities.", "fashion", "editorial", { eyebrow: "The new collection", subheading: "Find your next favourite in an edit of everyday pieces and finishing touches.", ctaLabel: "Discover the edit", imageAlt: "Clothing collection in a sunlit boutique" }),
      collections([["The wardrobe", "fashion"], ["Finishing touches", "beauty"]], "editorial"),
      featured("The considered edit", "3"), newsletter("A little inspiration, occasionally"),
    ], story("Beyond the collection", "fashion")),
  },
  bazaar: {
    key: "bazaar", industry: "Electronics", name: "Bazaar", style: "Bold",
    description: "A compact product spotlight and clear department links, designed for bigger catalogs.",
    bestFor: "Electronics, accessories and large catalogs",
    theme: { primaryColor: "#12213b", secondaryColor: "#f6f8fc", accentColor: "#224ec9", fontFamily: "DM Sans", headerStyle: "standard", settings: { corners: "soft", buttons: "solid", imageRatio: "square", quickAdd: true } },
    pages: pages([
      hero("Find your everyday upgrade.", "tech", "split", { height: "compact", eyebrow: "Explore the essentials", subheading: "From your desk to your downtime. Explore technology, home and lifestyle in one place.", ctaLabel: "Shop all products", imageAlt: "Yellow headphones on a yellow background" }),
      collections([["Technology", "tech"], ["Home", "interior"], ["Lifestyle", "objects"]], "compact"),
      featured("Discover the range"), section("selling-points", {}, "points"),
    ]),
  },
  studio: {
    key: "studio", industry: "Furniture & home", name: "Studio", style: "Minimal",
    description: "Gallery-like proportions, bold typography and a restrained monochrome palette.",
    bestFor: "Design objects, ceramics and art prints",
    theme: { primaryColor: "#151515", secondaryColor: "#fafafa", accentColor: "#151515", fontFamily: "Outfit", headerStyle: "minimal", settings: { corners: "sharp", buttons: "solid", imageRatio: "square", quickAdd: false } },
    pages: pages([
      hero("Good objects. Great company.", "objects", "editorial", { eyebrow: "Form meets everyday", subheading: "Explore the shapes, textures and small details that bring a space together.", ctaLabel: "View the collection", imageAlt: "A minimal still life with blossom branches" }),
      featured("Objects of interest", "3"), story("A different way of seeing.", "interior"), newsletter("Keep in touch with the studio"),
    ]),
  },
  market: {
    key: "market", industry: "Food & grocery", name: "Market", style: "Natural",
    description: "Fresh colour, soft shapes and browsable departments for the everyday shop.",
    bestFor: "Groceries, tea, spices and home essentials",
    theme: { primaryColor: "#163c2d", secondaryColor: "#f5faf5", accentColor: "#226544", fontFamily: "Manrope", headerStyle: "standard", settings: { corners: "round", buttons: "solid", imageRatio: "square", quickAdd: true } },
    pages: pages([
      hero("Fresh finds for your everyday.", "produce", "split", { height: "compact", eyebrow: "From our shelves to yours", subheading: "Fill the kitchen, put the kettle on and find something good for the week ahead.", ctaLabel: "Fill your basket", imageAlt: "Fresh produce at a market" }),
      collections([["Fresh produce", "produce"], ["Coffee & tea", "coffee"], ["For the home", "objects"]], "compact"),
      featured("Stock up on favourites"), section("selling-points", { background: "subtle" }, "points"), section("faq", {}, "faq"),
    ]),
  },
  noir: {
    key: "noir", industry: "Fashion", name: "Noir", style: "Bold",
    description: "A dramatic full-image poster, oversized type and a striking after-dark palette.",
    bestFor: "Streetwear, beauty and statement brands",
    theme: { primaryColor: "#f4f4f5", secondaryColor: "#111113", accentColor: "#fb7185", fontFamily: "Outfit", headerStyle: "premium", settings: { corners: "sharp", buttons: "solid", imageRatio: "portrait", quickAdd: false } },
    pages: pages([
      hero("Make an entrance.", "fashion", "poster", { height: "full", eyebrow: "The latest collection", subheading: "New silhouettes. Standout details. Discover your next signature piece.", ctaLabel: "Explore the drop", imageAlt: "Fashion collection on display" }),
      featured("Just landed"), story("Details that make the difference.", "beauty"), newsletter("Be first to know"),
    ]),
  },
  flora: {
    key: "flora", industry: "Garden & plants", name: "Flora", style: "Natural",
    description: "Botanical photography, rounded details and a calm, spacious split composition.",
    bestFor: "Plants, garden shops and natural living",
    theme: { primaryColor: "#243c30", secondaryColor: "#f0f5ef", accentColor: "#416248", fontFamily: "DM Sans", headerStyle: "minimal", settings: { corners: "round", buttons: "solid", imageRatio: "portrait", quickAdd: true } },
    pages: pages([
      hero("A little more room for green.", "botanical", "banner", { eyebrow: "Grow your own space", subheading: "From a sunny windowsill to your favourite corner. Find a plant to make it yours.", ctaLabel: "Find your green", imageAlt: "Green plants in a garden workspace" }),
      featured("Bring the outside in", "3"), story("Room to grow.", "interior"), newsletter("Something good is growing"),
    ]),
  },
  atelier: {
    key: "atelier", industry: "Furniture & home", name: "Atelier", style: "Editorial",
    description: "Architectural whitespace, elegant serif headings and richly framed interior photography.",
    bestFor: "Furniture, interiors and homeware",
    theme: { primaryColor: "#303338", secondaryColor: "#f1f2f4", accentColor: "#545e75", fontFamily: "Cormorant Garamond", headerStyle: "premium", settings: { corners: "sharp", buttons: "outline", imageRatio: "landscape", quickAdd: false } },
    pages: pages([
      hero("Spaces to call your own.", "interior", "banner", { eyebrow: "Living, considered", subheading: "Furniture and everyday objects that give your home its own point of view.", ctaLabel: "Explore the collection", imageAlt: "Contemporary living room with warm natural light" }),
      collections([["Living spaces", "interior"], ["Everyday objects", "objects"]], "editorial"),
      featured("In good company", "3"), newsletter(),
    ], story("Our approach to living", "interior")),
  },
  pulse: {
    key: "pulse", industry: "Electronics", name: "Pulse", style: "Bold",
    description: "Electric yellow, strong typography and an immersive product-first image banner.",
    bestFor: "Audio, tech, sports and active brands",
    theme: { primaryColor: "#fafafa", secondaryColor: "#151617", accentColor: "#e5f263", fontFamily: "Outfit", headerStyle: "minimal", settings: { corners: "soft", buttons: "solid", imageRatio: "square", quickAdd: true } },
    pages: pages([
      hero("Find your frequency.", "tech", "overlay", { height: "full", eyebrow: "Turn up the everyday", subheading: "For your first track, your next move and everything in between. Find your everyday gear.", ctaLabel: "Explore the range", imageAlt: "Bold yellow over-ear headphones" }),
      featured("Gear up"), collections([["Audio", "tech"], ["Essentials", "objects"]], "compact"), newsletter("Stay in the loop"),
    ]),
  },
  ritual: {
    key: "ritual", industry: "Beauty", name: "Ritual", style: "Minimal",
    description: "Soft lavender, generous photography and a quiet focus on daily rituals.",
    bestFor: "Skincare, beauty and personal care",
    theme: { primaryColor: "#302c40", secondaryColor: "#f6f3fa", accentColor: "#6b537e", fontFamily: "Manrope", headerStyle: "standard", settings: { corners: "soft", buttons: "solid", imageRatio: "portrait", quickAdd: true } },
    pages: pages([
      hero("Make time for yourself.", "beauty", "banner", { eyebrow: "Your everyday ritual", subheading: "A fresh start in the morning. A moment to unwind at night. Build a routine that feels like you.", ctaLabel: "Discover your routine", imageAlt: "Skincare products arranged for a daily routine" }),
      featured("A moment for you", "3"), story("The beauty of everyday.", "botanical"), newsletter("A little time for you"),
    ]),
  },
};
// Build real editable pages for every department in the template's header.
// Templates supply design/content; shared page and navigation behavior stays here.
for (const template of Object.values(TEMPLATES)) {
  const originals = template.pages;
  const home = originals.find(page => page.slug === HOME_PAGE_SLUG)!;
  const catalogLabel = template.theme.settings.navigation?.find(link => link.link === "/products")?.label || "Products";
  const catalog: TemplatePage = { slug: PRODUCTS_PAGE_SLUG, title: catalogLabel, sections: [createSection("product-catalog", {}, "catalog")] };
  const departments = (template.theme.settings.navigation || []).flatMap(link => {
    if (!link.link.startsWith("/products?")) return [];
    const category = new URLSearchParams(link.link.split("?")[1]).get("category");
    return category ? [{ slug: categoryPageSlug(category), title: link.label, category, sections: pagePresetSections("category", { title: link.label, category }) }] : [];
  });
  const about = originals.find(page => page.slug === "about") || { slug: "about", title: "Our story", sections: [home.sections.find(section => section.type === "image-with-text") || createSection("rich-text", { heading: "Our story", body: "Discover the people and ideas behind our store." }, "story")] };
  const all = [home, catalog, ...departments, about, ...originals.filter(page => !["home", "about", PRODUCTS_PAGE_SLUG].includes(page.slug))];
  template.pages = all.filter((page, index) => all.findIndex(other => other.slug === page.slug) === index).map((page, index) => ({ ...page, category: catalogCategory(page.sections), showInNavigation: page.slug !== HOME_PAGE_SLUG, navigationPosition: index }));
  template.theme.settings.navigation = template.pages.filter(page => page.showInNavigation).map(page => ({ label: page.title, link: pagePath(page.slug) }));
}
export const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];
export function isTemplateKey(value: unknown): value is TemplateKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(TEMPLATES, value);
}
