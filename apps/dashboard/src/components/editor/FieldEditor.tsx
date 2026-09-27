"use client";

import { useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash, UploadSimple } from "@phosphor-icons/react";
import type { FieldDefinition } from "@repo/core";
import { errorMessage, uploadImage } from "@/lib/api-client";

type Values = Record<string, unknown>;

const str = (v: unknown) => (typeof v === "string" ? v : "");

function ImageField({ field, value, onChange, id }: { field: FieldDefinition; value: string; onChange: (v: string) => void; id: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(errorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>
      {value && <img src={value} alt="" className="mb-2 aspect-video w-full rounded-lg border border-gray-200 object-cover" />}
      <div className="flex gap-2">
        <input id={id} type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://" className="input-field min-w-0 flex-1" />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary shrink-0 px-3" aria-label={`Upload ${field.label}`}>
          <UploadSimple size={16} />
          <span className="ml-1.5">{uploading ? "Uploading" : "Upload"}</span>
        </button>
      </div>
      {value && (
        <button type="button" onClick={() => onChange("")} className="mt-1.5 text-xs text-gray-500 hover:text-red-600">
          Remove image
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ListField({ field, value, onChange }: { field: Extract<FieldDefinition, { kind: "list" }>; value: unknown; onChange: (v: Values[]) => void }) {
  const items = Array.isArray(value) ? (value as Values[]) : [];
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-gray-700">{field.label}</legend>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Item {i + 1}</span>
              <div className="flex gap-1">
                <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={14} /></IconButton>
                <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={14} /></IconButton>
                <IconButton label="Remove item" onClick={() => onChange(items.filter((_, j) => j !== i))}><Trash size={14} /></IconButton>
              </div>
            </div>
            <FieldEditor fields={field.fields} values={item} onChange={(next) => onChange(items.map((it, j) => (j === i ? next : it)))} />
          </div>
        ))}
      </div>
      {items.length < field.maxItems && (
        <button type="button" onClick={() => onChange([...items, {}])} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline">
          <Plus size={14} /> Add item
        </button>
      )}
    </fieldset>
  );
}

export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-900 disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}

function Field({ field, value, onChange }: { field: FieldDefinition; value: unknown; onChange: (v: unknown) => void }) {
  const id = useId();
  const label = <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">{field.label}</label>;

  switch (field.kind) {
    case "text":
    case "url":
      return (
        <div>
          {label}
          <input
            id={id}
            type="text"
            value={str(value)}
            maxLength={field.kind === "text" ? field.maxLength : undefined}
            placeholder={field.kind === "url" ? "/products or https://" : undefined}
            onChange={(e) => onChange(e.target.value)}
            className="input-field"
          />
        </div>
      );
    case "textarea":
      return (
        <div>
          {label}
          <textarea id={id} rows={4} value={str(value)} maxLength={field.maxLength} onChange={(e) => onChange(e.target.value)} className="input-field resize-y" />
        </div>
      );
    case "image":
      return <ImageField field={field} value={str(value)} onChange={onChange} id={id} />;
    case "color":
      return (
        <div>
          {label}
          <div className="flex gap-2">
            <input type="color" aria-label={`${field.label} picker`} value={str(value) || "#000000"} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 rounded-md border border-gray-300" />
            <input id={id} value={str(value)} onChange={(e) => onChange(e.target.value)} className="input-field font-mono" />
          </div>
        </div>
      );
    case "number":
      return (
        <div>
          {label}
          <input
            id={id}
            type="number"
            min={field.min}
            max={field.max}
            value={typeof value === "number" ? value : ""}
            onChange={(e) => onChange(e.target.value === "" ? undefined : Math.round(Number(e.target.value)))}
            className="input-field w-32"
          />
        </div>
      );
    case "boolean":
      return (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          {field.label}
        </label>
      );
    case "select":
      return (
        <div>
          {label}
          <select id={id} value={str(value) || field.options[0]} onChange={(e) => onChange(e.target.value)} className="input-field">
            {field.options.map((o) => (
              <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
            ))}
          </select>
        </div>
      );
    case "list":
      return <ListField field={field} value={value} onChange={onChange} />;
  }
}

/** A form for any section, generated from its field definitions in @repo/core. */
export default function FieldEditor({ fields, values, onChange }: { fields: readonly FieldDefinition[]; values: Values; onChange: (next: Values) => void }) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <Field key={field.name} field={field} value={values[field.name]} onChange={(v) => onChange({ ...values, [field.name]: v })} />
      ))}
    </div>
  );
}
