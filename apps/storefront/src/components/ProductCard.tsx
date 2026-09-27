"use client";

import Link from "next/link";
import { formatMoney } from "@repo/core";

interface Product {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  quantity: number;
  images: Array<{ url: string; alt?: string }>;
  description?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  storeSlug?: string;
}

export default function ProductCard({ product, onAddToCart, storeSlug }: ProductCardProps) {
  const isOutOfStock = product.quantity === 0;
  const image = product.images[0]?.url;

  const cardContent = (
    <div className="product-card group">
      {/* Image */}
      <div className="relative bg-gray-100 aspect-square overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-900 px-4 py-1.5 rounded-full text-sm font-semibold">Sold Out</span>
          </div>
        )}

        {/* Quick View overlay on hover */}
        {storeSlug && !isOutOfStock && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <span className="bg-white/90 backdrop-blur-sm text-gray-900 px-4 py-2 rounded-lg text-sm font-medium shadow-lg">
              View Details →
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 text-base mb-1 line-clamp-1">{product.name}</h3>

        {product.description && (
          <p className="text-gray-500 text-sm mb-4 line-clamp-2 leading-relaxed">{product.description}</p>
        )}

        {/* Price & Stock */}
        <div className="flex items-end justify-between mb-4">
          <span className="text-2xl font-bold text-gray-900">{formatMoney(product.priceCents)}</span>
          {!isOutOfStock && <span className="text-xs text-gray-400">{product.quantity} in stock</span>}
        </div>

        {/* Add to Cart */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddToCart(product); }}
          disabled={isOutOfStock}
          className="btn-cart"
        >
          {isOutOfStock ? "Sold Out" : "Add to Cart"}
        </button>
      </div>
    </div>
  );

  if (storeSlug) {
    return (
      <Link href={`/${storeSlug}/product/${product.slug}`} className="block">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
}
