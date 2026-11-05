import { STOREFRONT_URL } from "@/lib/urls";
import type { TemplateKey } from "@repo/core";

/** A real render of the storefront, scaled down without duplicating its layout. */
export default function TemplateThumbnail({ templateKey }: { templateKey: TemplateKey }) {
  return (
    <div className="relative h-48 overflow-hidden bg-gray-100" aria-hidden="true">
      <iframe
        src={`${STOREFRONT_URL}/template-preview/${templateKey}?thumbnail=1`}
        title={`${templateKey} storefront thumbnail`}
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none absolute left-0 top-0 h-[400%] w-[400%] origin-top-left scale-[0.25] border-0"
      />
    </div>
  );
}
