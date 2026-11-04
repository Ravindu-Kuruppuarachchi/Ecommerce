"use client";

import { useRouter } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import { productApi } from "@/lib/api-client";

export default function NewProductPage() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Add product</h1>
      <ProductForm
        submitLabel="Save product"
        onSubmit={async (body) => {
          await productApi.create(body);
          router.push("/products");
        }}
      />
    </div>
  );
}
