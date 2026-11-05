import type { Metadata } from "next";
import { TEMPLATE_KEYS, TEMPLATES } from "@repo/core";
import { Site, CTA, Heading, galleryPhotos } from "@/components/marketing/Site";
import DesignGallery from "@/components/marketing/DesignGallery";
export const metadata: Metadata = { title: "Store designs | Shophub by Voxel Labs", description: "Explore 20 editable storefront designs for fashion, home, beauty, food, electronics and more. Find your style and preview every design." };
export default function Designs() { return <Site active="Designs"><Heading eyebrow="The design collection" title="Find your kind of extraordinary.">Twenty distinct starting points. One unmistakable brand: yours. Explore a design, imagine the possibilities, then make it your own.</Heading><DesignGallery designs={TEMPLATE_KEYS.map(key=>({key,name:TEMPLATES[key].name,description:TEMPLATES[key].description,industry:TEMPLATES[key].industry,style:TEMPLATES[key].style,photo:galleryPhotos[key],preview:["runway","habitat","reef","circuit"].includes(key)}))}/><CTA/></Site>; }
