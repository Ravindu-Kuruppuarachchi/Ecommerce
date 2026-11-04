"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProductForm, { type ProductRecord } from "@/components/ProductForm";
import { errorMessage, productApi } from "@/lib/api-client";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    productApi.get(id).then((res) => setProduct(res.data)).catch((err) => setError(errorMessage(err, "Product not found")));
  }, [id]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-900">Products</Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold text-gray-900">{product?.name ?? "Edit product"}</h1>
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : !product ? (
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      ) : (
        <ProductForm
          initial={product}
          submitLabel="Save changes"
          onSubmit={async (body) => {
            await productApi.update(id, body);
            router.push("/products");
          }}
        />
      )}
    </div>
  );
}
