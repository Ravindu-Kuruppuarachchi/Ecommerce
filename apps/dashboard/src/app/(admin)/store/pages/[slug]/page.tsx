"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowSquareOut, ArrowUp, CaretLeft, CopySimple, Desktop, DeviceMobile, Plus, Trash } from "@phosphor-icons/react";
import { createSection, SECTIONS, type Section, type SectionType } from "@repo/core";
import FieldEditor, { IconButton } from "@/components/editor/FieldEditor";
import { errorMessage, pageApi } from "@/lib/api-client";
import { STOREFRONT_URL, storefrontUrl } from "@/lib/urls";
import { useAuthStore } from "@/stores/auth-store";

const STOREFRONT_ORIGIN = new URL(STOREFRONT_URL).origin;
const SECTION_TYPES = Object.keys(SECTIONS) as SectionType[];

type SaveState = "saved" | "dirty" | "saving";

/** One-line description of a section for the list, from its most telling prop. */
function summary(section: Section): string {
  const p = section.props;
  for (const key of ["heading", "text", "label"]) if (typeof p[key] === "string" && p[key]) return p[key] as string;
  return "";
}

export default function PageEditor() {
  const { slug } = useParams<{ slug: string }>();
  const store = useAuthStore((s) => s.store);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Section[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    pageApi
      .get(slug)
      .then((res) => {
        setTitle(res.data.title);
        setSections(res.data.draftSections);
        setPublishedAt(res.data.publishedAt);
        setHasUnpublished(JSON.stringify(res.data.draftSections) !== JSON.stringify(res.data.publishedSections));
      })
      .catch((err) => setLoadError(errorMessage(err, "Couldn't load this page")));
  }, [slug]);

  // ---- Preview messaging ----
  const sendToPreview = useCallback(() => {
    if (!sections) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "builder:render", sections, selectedId }, STOREFRONT_ORIGIN);
  }, [sections, selectedId]);

  useEffect(sendToPreview, [sendToPreview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== STOREFRONT_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === "builder:ready") sendToPreview();
      if (e.data?.type === "builder:select" && typeof e.data.id === "string") setSelectedId(e.data.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendToPreview]);

  const scrollPreviewTo = (id: string) =>
    iframeRef.current?.contentWindow?.postMessage({ type: "builder:scroll-to", id }, STOREFRONT_ORIGIN);

  // ---- Editing ----
  const update = (next: Section[]) => {
    setSections(next);
    setSaveState("dirty");
    setErrors([]);
    setNotice("");
  };

  const select = (id: string) => {
    setSelectedId(id);
    setAdding(false);
    scrollPreviewTo(id);
  };

  const add = (type: SectionType) => {
    const section = createSection(type);
    const at = selectedId ? sections!.findIndex((s) => s.id === selectedId) + 1 : sections!.length;
    update([...sections!.slice(0, at), section, ...sections!.slice(at)]);
    setAdding(false);
    setSelectedId(section.id);
    setTimeout(() => scrollPreviewTo(section.id), 100);
  };

  const move = (index: number, to: number) => {
    const next = [...sections!];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    update(next);
  };

  const duplicate = (index: number) => {
    const copy = createSection(sections![index].type, structuredClone(sections![index].props));
    update([...sections!.slice(0, index + 1), copy, ...sections!.slice(index + 1)]);
  };

  const remove = (index: number) => {
    const section = sections![index];
    if (!window.confirm(`Remove the ${SECTIONS[section.type].label.toLowerCase()} section?`)) return;
    update(sections!.filter((_, i) => i !== index));
    if (selectedId === section.id) setSelectedId(null);
  };

  // ---- Saving ----
  const save = useCallback(async (): Promise<boolean> => {
    if (!sections) return false;
    setSaveState("saving");
    setErrors([]);
    try {
      await pageApi.saveDraft(slug, { title: title.trim() || "Untitled", sections });
      setSaveState("saved");
      setHasUnpublished(true);
      return true;
    } catch (err: any) {
      const details = err?.response?.data?.details;
      setErrors(Array.isArray(details) ? details.map((d: any) => (typeof d === "string" ? d : d.message)) : [errorMessage(err, "Couldn't save")]);
      setSaveState("dirty");
      return false;
    }
  }, [sections, slug, title]);

  const publish = async () => {
    if (saveState !== "saved" && !(await save())) return;
    try {
      const res = await pageApi.publish(slug);
      setPublishedAt(res.data.publishedAt);
      setHasUnpublished(false);
      setNotice("Published. Customers now see this version.");
    } catch (err) {
      setErrors([errorMessage(err, "Couldn't publish")]);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        save();
      }
    };
    const onLeave = (e: BeforeUnloadEvent) => {
      if (saveState !== "saved") e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onLeave);
    };
  }, [save, saveState]);

  const selected = useMemo(() => sections?.find((s) => s.id === selectedId) ?? null, [sections, selectedId]);

  if (loadError) {
    return (
      <div className="p-8">
        <p className="text-red-600">{loadError}</p>
        <Link href="/store" className="btn-secondary mt-4">Back to Online store</Link>
      </div>
    );
  }
  if (!sections || !store) return <div className="h-[100dvh] animate-pulse bg-gray-100" aria-busy="true" />;

  const statusText =
    saveState === "saving" ? "Saving…" : saveState === "dirty" ? "Unsaved changes" : hasUnpublished ? "Draft saved, not published" : publishedAt ? "Published" : "Not published";

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3">
        <Link
          href="/store"
          onClick={(e) => saveState !== "saved" && !window.confirm("Leave without saving your changes?") && e.preventDefault()}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Back to Online store"
        >
          <ArrowLeft size={18} />
        </Link>
        <label htmlFor="page-title" className="sr-only">Page title</label>
        <input
          id="page-title"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaveState("dirty");
          }}
          className="w-40 min-w-0 rounded-md border border-transparent px-2 py-1 text-sm font-semibold hover:border-gray-200 focus:border-gray-300 focus:outline-none sm:w-56"
        />
        <span className={`hidden text-xs sm:inline ${saveState === "dirty" ? "text-amber-600" : "text-gray-500"}`} role="status">
          {statusText}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden rounded-lg border border-gray-200 p-0.5 md:flex" role="group" aria-label="Preview size">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                aria-pressed={device === d}
                aria-label={d === "desktop" ? "Desktop preview" : "Mobile preview"}
                className={`rounded-md p-1.5 ${device === d ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                {d === "desktop" ? <Desktop size={16} /> : <DeviceMobile size={16} />}
              </button>
            ))}
          </div>
          <a
            href={storefrontUrl(store.slug, slug === "home" ? "" : `/pages/${slug}`)}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:block"
            aria-label="Open the published page"
            title="Open the published page"
          >
            <ArrowSquareOut size={18} />
          </a>
          <button type="button" onClick={save} disabled={saveState !== "dirty"} className="btn-secondary px-3 py-2">
            Save
          </button>
          <button type="button" onClick={publish} disabled={saveState === "saving" || (saveState === "saved" && !hasUnpublished)} className="btn-primary px-3 py-2">
            Publish
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Side panel */}
        <aside className="flex max-h-[45dvh] w-full shrink-0 flex-col border-b border-gray-200 bg-white md:max-h-none md:w-[340px] md:border-b-0 md:border-r">
          {(errors.length > 0 || notice) && (
            <div className={`m-3 rounded-lg border px-3 py-2 text-sm ${errors.length ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="alert">
              {notice || (
                <ul className="list-disc space-y-1 pl-4">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 border-b border-gray-100 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
                <CaretLeft size={14} /> All sections
              </button>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">{SECTIONS[selected.type].label}</h2>
                <FieldEditor
                  fields={SECTIONS[selected.type].fields}
                  values={selected.props}
                  onChange={(props) => update(sections.map((s) => (s.id === selected.id ? { ...s, props } : s)))}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Sections</h2>
              {sections.length === 0 && <p className="px-1 py-4 text-sm text-gray-500">This page has no sections yet.</p>}
              <ol className="space-y-1">
                {sections.map((section, i) => (
                  <li key={section.id} className="group flex items-center gap-1 rounded-lg border border-transparent hover:border-gray-200 hover:bg-gray-50">
                    <button type="button" onClick={() => select(section.id)} className="min-w-0 flex-1 px-3 py-2 text-left">
                      <span className="block text-sm font-medium text-gray-900">{SECTIONS[section.type].label}</span>
                      {summary(section) && <span className="block truncate text-xs text-gray-500">{summary(section)}</span>}
                    </button>
                    <div className="flex shrink-0 pr-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp size={14} /></IconButton>
                      <IconButton label="Move down" disabled={i === sections.length - 1} onClick={() => move(i, i + 1)}><ArrowDown size={14} /></IconButton>
                      <IconButton label="Duplicate" onClick={() => duplicate(i)}><CopySimple size={14} /></IconButton>
                      <IconButton label="Remove" onClick={() => remove(i)}><Trash size={14} /></IconButton>
                    </div>
                  </li>
                ))}
              </ol>

              {adding ? (
                <div className="mt-3 rounded-lg border border-gray-200 p-2">
                  <p className="px-2 pb-1 text-xs font-medium text-gray-500">Add a section</p>
                  {SECTION_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => add(type)} className="block w-full rounded-md px-2 py-2 text-left text-sm text-gray-800 hover:bg-gray-100">
                      {SECTIONS[type].label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setAdding(false)} className="mt-1 w-full rounded-md px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setAdding(true)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-gray-400 hover:bg-gray-50">
                  <Plus size={16} /> Add section
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Preview */}
        <main className="flex min-h-0 flex-1 justify-center overflow-hidden p-0 md:p-4">
          <iframe
            ref={iframeRef}
            title="Page preview"
            src={storefrontUrl(store.slug, "/preview")}
            className={`h-full rounded-none border-0 bg-white md:rounded-lg md:shadow-sm ${device === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
          />
        </main>
      </div>
    </div>
  );
}
