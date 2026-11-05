"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { MAX_OPTIONS, toMajorString, variantCombinations, variantTitle, type ProductOption } from "@repo/core";
import { errorMessage, storeApi, uploadImage } from "@/lib/api-client";

export interface ProductRecord {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priceCents: number;
  compareAtPriceCents: number | null;
  quantity: number;
  category: string | null;
  sku: string | null;
  options: ProductOption[];
  images: Array<{ url: string; alt: string | null }>;
  variants: Array<{ id: string; optionValues: Record<string, string>; sku: string | null; priceCents: number | null; quantity: number }>;
}

interface VariantRow {
  id?: string;
  optionValues: Record<string, string>;
  price: string;
  sku: string;
  quantity: string;
}

interface Props {
  initial?: ProductRecord;
  submitLabel: string;
  onSubmit: (body: Record<string, unknown>) => Promise<void>;
}

const label = "mb-1.5 block text-sm font-medium text-gray-700";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 p-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Images({ images, onChange }: { images: Array<{ url: string; alt: string }>; onChange: (images: Array<{ url: string; alt: string }>) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const upload = async (files: FileList) => {
    setUploading(true);
    setError("");
    try {
      const urls = [];
      for (const file of Array.from(files)) urls.push(await uploadImage(file));
      onChange([...images, ...urls.map((u) => ({ url: u, alt: "" }))]);
    } catch (err) {
      setError(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = (from: number, to: number) => {
    const next = [...images];
    const [img] = next.splice(from, 1);
    next.splice(to, 0, img);
    onChange(next);
  };

  return (
    <div>
      {images.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <li key={img.url} className="group relative">
              <img src={img.url} alt="" className="aspect-square w-full rounded-lg border border-gray-200 object-cover" />
              {i === 0 && <span className="badge badge-blue absolute left-1 top-1">Main</span>}
              <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                <span className="flex rounded-md bg-white/95 shadow-sm">
                  <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => move(i, i - 1)} className="p-1 disabled:opacity-30"><ArrowLeft size={12} /></button>
                  <button type="button" aria-label="Move later" disabled={i === images.length - 1} onClick={() => move(i, i + 1)} className="p-1 disabled:opacity-30"><ArrowRight size={12} /></button>
                </span>
                <button type="button" aria-label="Remove image" onClick={() => onChange(images.filter((_, j) => j !== i))} className="rounded-md bg-white/95 p-1 shadow-sm hover:text-red-600">
                  <X size={12} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary">
          <UploadSimple size={16} className="mr-1.5" /> {uploading ? "Uploading…" : "Upload images"}
        </button>
        <div className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="image-url" className="sr-only">Image link</label>
          <input id="image-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="or paste an image link" className="input-field min-w-0" />
          <button
            type="button"
            disabled={!url}
            onClick={() => {
              onChange([...images, { url, alt: "" }]);
              setUrl("");
            }}
            className="btn-secondary shrink-0"
          >
            Add
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.length && upload(e.target.files)} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function OptionsEditor({ options, onChange }: { options: ProductOption[]; onChange: (options: ProductOption[]) => void }) {
  const [drafts, setDrafts] = useState<string[]>(options.map(() => ""));
  useEffect(() => setDrafts((d) => options.map((_, i) => d[i] ?? "")), [options]);

  const addValue = (i: number) => {
    const values = drafts[i].split(",").map((v) => v.trim()).filter(Boolean);
    if (!values.length) return;
    onChange(options.map((o, j) => (j === i ? { ...o, values: [...new Set([...o.values, ...values])] } : o)));
    setDrafts((d) => d.map((v, j) => (j === i ? "" : v)));
  };

  return (
    <div className="space-y-3">
      {options.map((option, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor={`opt-${i}`} className="mb-1 block text-xs font-medium text-gray-600">Option name</label>
              <input id={`opt-${i}`} value={option.name} onChange={(e) => onChange(options.map((o, j) => (j === i ? { ...o, name: e.target.value } : o)))} placeholder="e.g. Size" className="input-field py-2" />
            </div>
            <button type="button" aria-label={`Remove ${option.name || "option"}`} onClick={() => onChange(options.filter((_, j) => j !== i))} className="rounded-md p-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600">
              <Trash size={16} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {option.values.map((v) => (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-2.5 pr-1 text-xs text-gray-800">
                {v}
                <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(options.map((o, j) => (j === i ? { ...o, values: o.values.filter((x) => x !== v) } : o)))} className="rounded-full p-0.5 hover:bg-gray-200">
                  <X size={10} />
                </button>
              </span>
            ))}
            <label htmlFor={`val-${i}`} className="sr-only">Add values for {option.name}</label>
            <input
              id={`val-${i}`}
              value={drafts[i] ?? ""}
              onChange={(e) => setDrafts((d) => d.map((v, j) => (j === i ? e.target.value : v)))}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addValue(i);
                }
              }}
              onBlur={() => addValue(i)}
              placeholder={option.values.length ? "Add another" : "Type values, press Enter"}
              className="min-w-[10rem] flex-1 border-0 bg-transparent px-1 py-1 text-sm outline-none"
            />
          </div>
        </div>
      ))}
      {options.length < MAX_OPTIONS && (
        <button type="button" onClick={() => onChange([...options, { name: "", values: [] }])} className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <Plus size={14} /> Add {options.length ? "another option" : "an option like size or colour"}
        </button>
      )}
    </div>
  );
}

export default function ProductForm({ initial, submitLabel, onSubmit }: Props) {
  const [inventoryOn, setInventoryOn] = useState<boolean | null>(null);
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "active",
    price: initial ? toMajorString(initial.priceCents) : "",
    compareAt: initial?.compareAtPriceCents ? toMajorString(initial.compareAtPriceCents) : "",
    quantity: String(initial?.quantity ?? 0),
    category: initial?.category ?? "",
    sku: initial?.sku ?? "",
  });
  const [images, setImages] = useState((initial?.images ?? []).map((i) => ({ url: i.url, alt: i.alt ?? "" })));
  const [options, setOptions] = useState<ProductOption[]>(initial?.options ?? []);
  const [variants, setVariants] = useState<VariantRow[]>(
    (initial?.variants ?? []).map((v) => ({
      id: v.id,
      optionValues: v.optionValues,
      price: v.priceCents === null ? "" : toMajorString(v.priceCents),
      sku: v.sku ?? "",
      quantity: String(v.quantity),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    storeApi.modules().then((res) => setInventoryOn(res.data.modules.some((m: { key: string; enabled: boolean }) => m.key === "inventory" && m.enabled))).catch(() => setInventoryOn(false));
  }, []);

  // Keep one variant row per combination, carrying over rows that still match.
  const complete = options.filter((o) => o.name.trim() && o.values.length);
  useEffect(() => {
    setVariants((rows) => {
      const byTitle = new Map(rows.map((r) => [variantTitle(complete, r.optionValues), r]));
      return variantCombinations(complete).map((values) => byTitle.get(variantTitle(complete, values)) ?? { optionValues: values, price: "", sku: "", quantity: "0" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(complete)]);

  const hasVariants = complete.length > 0;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setVariant = (i: number, key: keyof VariantRow, value: string) => setVariants((rows) => rows.map((r, j) => (j === i ? { ...r, [key]: value } : r)));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSubmit({
        name: form.name,
        description: form.description || null,
        status: form.status,
        price: form.price,
        compareAtPrice: form.compareAt.trim() ? form.compareAt : null,
        category: form.category.trim() || null,
        sku: form.sku.trim() || null,
        images,
        ...(hasVariants ? {} : { quantity: Number(form.quantity) || 0 }),
        // Only send variant data when the store can use it, so editing without Inventory never wipes variants.
        ...(inventoryOn && {
          options: complete,
          variants: (hasVariants ? variants : []).map((v) => ({
            id: v.id,
            optionValues: v.optionValues,
            sku: v.sku.trim() || null,
            price: v.price.trim() ? v.price : null,
            quantity: Number(v.quantity) || 0,
          })),
        }),
      });
    } catch (err) {
      setError(errorMessage(err, "Couldn't save the product"));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
      <Section title="Details">
        <div>
          <label htmlFor="p-name" className={label}>Name</label>
          <input id="p-name" required value={form.name} onChange={set("name")} className="input-field" />
        </div>
        <div>
          <label htmlFor="p-desc" className={label}>Description</label>
          <textarea id="p-desc" rows={4} value={form.description} onChange={set("description")} className="input-field resize-y" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-cat" className={label}>Category</label>
            <input id="p-cat" value={form.category} onChange={set("category")} placeholder="e.g. Coffee" className="input-field" />
          </div>
          <div>
            <label htmlFor="p-status" className={label}>Visibility</label>
            <select id="p-status" value={form.status} onChange={set("status")} className="input-field">
              <option value="active">Active: shown in your store</option>
              <option value="draft">Draft: hidden from customers</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Images" description="The first image is the main one. Use the arrows to reorder.">
        <Images images={images} onChange={setImages} />
      </Section>

      <Section title="Price">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="p-price" className={label}>Price (LKR)</label>
            <input id="p-price" required inputMode="decimal" value={form.price} onChange={set("price")} placeholder="1500" className="input-field" />
          </div>
          <div>
            <label htmlFor="p-compare" className={label}>Compare-at price (optional)</label>
            <input id="p-compare" inputMode="decimal" value={form.compareAt} onChange={set("compareAt")} placeholder="1800" className="input-field" />
            <p className="mt-1 text-xs text-gray-500">Shown crossed out, to mark the product as on sale.</p>
          </div>
        </div>
      </Section>

      <Section title="Stock" description={hasVariants ? "Stock is tracked per variant below." : undefined}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!hasVariants && (
            <div>
              <label htmlFor="p-qty" className={label}>Quantity in stock</label>
              <input id="p-qty" type="number" min={0} value={form.quantity} onChange={set("quantity")} className="input-field" />
            </div>
          )}
          <div>
            <label htmlFor="p-sku" className={label}>SKU (optional)</label>
            <input id="p-sku" value={form.sku} onChange={set("sku")} className="input-field" />
          </div>
        </div>
      </Section>

      <Section title="Variants" description="Sell this product in different sizes, colours or other options, each with its own stock.">
        {inventoryOn === null ? (
          <div className="h-10 animate-pulse rounded-lg bg-gray-100" />
        ) : !inventoryOn ? (
          <p className="text-sm text-gray-500">
            Turn on <Link href="/features" className="text-brand-700 hover:underline">Inventory</Link> to add variants.
          </p>
        ) : (
          <>
            <OptionsEditor options={options} onChange={setOptions} />
            {hasVariants && (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Variant</th>
                      <th className="px-3 py-2 font-medium">Price (blank = {form.price || "product price"})</th>
                      <th className="px-3 py-2 font-medium">SKU</th>
                      <th className="px-3 py-2 font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {variants.map((v, i) => {
                      const title = variantTitle(complete, v.optionValues);
                      return (
                        <tr key={title}>
                          <td className="whitespace-nowrap px-3 py-2 text-gray-900">{title}</td>
                          <td className="px-3 py-2"><input aria-label={`Price for ${title}`} inputMode="decimal" value={v.price} onChange={(e) => setVariant(i, "price", e.target.value)} className="input-field w-28 py-1.5" /></td>
                          <td className="px-3 py-2"><input aria-label={`SKU for ${title}`} value={v.sku} onChange={(e) => setVariant(i, "sku", e.target.value)} className="input-field w-32 py-1.5" /></td>
                          <td className="px-3 py-2"><input aria-label={`Stock for ${title}`} type="number" min={0} value={v.quantity} onChange={(e) => setVariant(i, "quantity", e.target.value)} className="input-field w-24 py-1.5" /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </Section>

      <div className="flex flex-wrap items-center gap-3 p-6">
        <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : submitLabel}</button>
        <Link href="/products" className="btn-secondary">Cancel</Link>
        {error && <p className="w-full text-sm text-red-600" role="alert">{error}</p>}
      </div>
    </form>
  );
}
