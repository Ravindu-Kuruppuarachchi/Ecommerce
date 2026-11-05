"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowSquareOut, ArrowUp, CaretLeft, CopySimple, Desktop, DeviceMobile, Plus, Trash } from "@phosphor-icons/react";
import { pagePath, sectionButtons, validateSections, createSection, SECTIONS, type Section, type SectionType } from "@repo/core";
import ThemeCard, { type Theme } from "@/components/editor/ThemeCard";
import StorePagesPanel from "@/components/editor/StorePagesPanel";
import { PageLinksContext, type EditorPage } from "@/components/editor/PageLinks";
import FieldEditor, { IconButton } from "@/components/editor/FieldEditor";
import { errorMessage, storeApi, pageApi } from "@/lib/api-client";
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
  return <Editor key={slug} slug={slug} />;
}

function Editor({ slug }: { slug: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [panel, setPanel] = useState<"sections" | "pages" | "theme">("sections");
  const [theme, setTheme] = useState<Theme | null>(null);
  useEffect(() => { storeApi.getMe().then(res => setTheme(res.data.theme)).catch(err => setErrors([errorMessage(err, "Could not load theme")])); }, []);
  const switching = useRef(false);
  const editRevision = useRef(0);
  const saveInFlight = useRef(false);
  const refreshPages = useCallback(async () => { setPages((await pageApi.list()).data); }, []);
  const store = useAuthStore((s) => s.store);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewReady = useRef(false);
  const readyPreviewWindow = useRef<Window | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState(0);

  const [title, setTitle] = useState("");
  const [sections, setSections] = useState<Section[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const undoStack = useRef<Section[][]>([]);
  const redoStack = useRef<Section[][]>([]);
  const [adding, setAdding] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [hasUnpublished, setHasUnpublished] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    pageApi.prepare()
      .then(() => Promise.all([pageApi.get(slug), refreshPages()]))
      .then(([res]) => {
        setTitle(res.data.title);
        setSections(res.data.draftSections);
        setPublishedAt(res.data.publishedAt);
        setHasUnpublished(JSON.stringify(res.data.draftSections) !== JSON.stringify(res.data.publishedSections));
      })
      .catch((err) => setLoadError(errorMessage(err, "Couldn't load this page")));
  }, [slug, refreshPages]);

  // ---- Preview messaging ----
  const sendToPreview = useCallback(() => {
    if (!sections || !previewReady.current || readyPreviewWindow.current !== iframeRef.current?.contentWindow) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "builder:render", sections, selectedId }, STOREFRONT_ORIGIN);
  }, [sections, selectedId]);

  useEffect(sendToPreview, [sendToPreview]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== STOREFRONT_ORIGIN || e.source !== iframeRef.current?.contentWindow) return;
      if (e.data?.type === "builder:ready") {
        previewReady.current = true;
        readyPreviewWindow.current = iframeRef.current?.contentWindow ?? null;
        setPreviewLoading(false);
        sendToPreview();
      }
      if (e.data?.type === "builder:element-change") {
        const { id, index, element } = e.data;
        if (!Number.isInteger(index) || !sections) return;
        const next = sections.map(section => {
          if (section.id !== id || !Array.isArray(section.props.elements) || index < 0 || index >= section.props.elements.length) return section;
          return { ...section, props: { ...section.props, elements: section.props.elements.map((value, i) => i === index ? element : value) } };
        });
        const result = validateSections(next);
        if (result.ok) update(result.sections);
      }
      if (e.data?.type === "builder:select" && typeof e.data.id === "string") setSelectedId(e.data.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendToPreview]);

  const scrollPreviewTo = (id: string) => {
    if (previewReady.current && readyPreviewWindow.current === iframeRef.current?.contentWindow) iframeRef.current?.contentWindow?.postMessage({ type: "builder:scroll-to", id }, STOREFRONT_ORIGIN);
  };

  // ---- Editing ----
  const update = (next: Section[]) => {
    if (sections) undoStack.current = [...undoStack.current.slice(-49), structuredClone(sections)];
    redoStack.current = [];
    editRevision.current++;
    setSections(next);
    setSaveState("dirty");
    setErrors([]);
    setNotice("");
  };

  const travelHistory = (redo: boolean) => {
    const source = redo ? redoStack : undoStack;
    const target = redo ? undoStack : redoStack;
    const next = source.current.pop();
    if (!next || !sections) return;
    target.current.push(structuredClone(sections));
    editRevision.current++;
    setSections(next);
    setSaveState("dirty");
    setErrors([]);
  };

  const convertHero = (section: Section) => {
    const p = section.props;
    const elements: Record<string, unknown>[] = [];
    if (p.image) elements.push({ kind: "image", image: p.image, text: p.imageAlt || "", x: 0, y: 0, width: 100, height: 100 });
    elements.push({ kind: "panel", x: 0, y: 0, width: 100, height: 100, fill: "#000000", fillOpacity: 40, radius: 0 });
    if (p.eyebrow) elements.push({ kind: "text", text: p.eyebrow, x: 7, y: 17, width: 80, height: 8, fontSize: 16, color: "#ffffff" });
    elements.push({ kind: "text", text: p.heading || "Your headline", x: 7, y: 28, width: 75, height: 26, fontSize: 56, weight: "700", color: "#ffffff" });
    if (p.subheading) elements.push({ kind: "text", text: p.subheading, x: 7, y: 57, width: 75, height: 16, fontSize: 20, color: "#ffffff" });
    const buttons = sectionButtons(p);
    buttons.slice(0,4).forEach((button, i) => elements.push({ kind: "button", text: button.label, link: button.link, x: 7 + i * 22, y: 80, width: 20, height: 10, fontSize: 16, fill: "#ff6a30", color: "#171717" }));
    update(sections!.map(item => item.id === section.id ? { ...item, type: "canvas", props: { canvasHeight: 650, canvasColor: "#171717", elements: [...elements, ...(Array.isArray(p.elements) ? p.elements : [])].slice(0,30) } } : item));
  };

  const select = (id: string) => {
    setPanel("sections");
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
    if (!sections || saveInFlight.current) return false;
    saveInFlight.current = true;
    const revision = editRevision.current;
    setSaveState("saving");
    setErrors([]);
    try {
      await pageApi.saveDraft(slug, { title: title.trim() || "Untitled", sections });
      const unchanged = revision === editRevision.current;
      setSaveState(unchanged ? "saved" : "dirty");
      setHasUnpublished(true);
      await refreshPages();
      return unchanged;
    } catch (err: any) {
      const details = err?.response?.data?.details;
      setErrors(Array.isArray(details) ? details.map((d: any) => (typeof d === "string" ? d : d.message)) : [errorMessage(err, "Couldn't save")]);
      setSaveState("dirty");
      return false;
    } finally { saveInFlight.current = false; }
  }, [sections, slug, title, refreshPages]);

  const publish = async () => {
    if (saveState !== "saved" && !(await save())) return;
    try {
      const res = await pageApi.publish(slug);
      setPublishedAt(res.data.publishedAt);
      setHasUnpublished(false);
      await refreshPages();
      previewReady.current = false;
      setPreviewLoading(true);
      setPreviewVersion(version => version + 1);
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

  const openPage = async (nextSlug: string) => {
    if (nextSlug === slug || switching.current || saveState === "saving") return;
    switching.current = true;
    try {
      if (saveState === "dirty" && !(await save())) return;
      router.push(`/store/pages/${encodeURIComponent(nextSlug)}`);
    } finally { switching.current = false; }
  };

  useEffect(() => {
    const navigate = (event: MessageEvent) => {
      if (event.origin !== STOREFRONT_ORIGIN || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "builder:navigate" && pages.some(page => page.slug === event.data.slug)) void openPage(event.data.slug);
    };
    window.addEventListener("message", navigate);
    return () => window.removeEventListener("message", navigate);
  });

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
    <PageLinksContext.Provider value={pages}>
    <div className="flex h-[100dvh] flex-col bg-gray-100">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-3">
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
          maxLength={80}
          value={title}
          onChange={(e) => {
            editRevision.current++;
            setTitle(e.target.value);
            setSaveState("dirty");
          }}
          className="w-16 min-w-0 flex-1 rounded-md border border-transparent px-2 py-1 text-sm font-semibold hover:border-gray-200 focus:border-gray-300 focus:outline-none sm:w-56 sm:flex-none"
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
            href={storefrontUrl(store.slug, pagePath(slug))}
            target="_blank"
            rel="noreferrer"
            className="hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 sm:block"
            aria-label="Open the published page"
            title="Open the published page"
          >
            <ArrowSquareOut size={18} />
          </a>
          <button type="button" onClick={() => travelHistory(false)} disabled={!undoStack.current.length} className="btn-secondary px-3 py-2">Undo</button>
          <button type="button" onClick={() => travelHistory(true)} disabled={!redoStack.current.length} className="btn-secondary px-3 py-2">Redo</button>
          <button type="button" onClick={save} disabled={saveState !== "dirty"} className="btn-secondary px-3 py-2">
            Save
          </button>
          <button type="button" onClick={publish} disabled={saveState === "saving" || (saveState === "saved" && !hasUnpublished)} className="btn-primary px-3 py-2">
            Publish
          </button>
        </div>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-4 py-2">
        <label htmlFor="editing-page" className="text-xs font-medium text-gray-500">Editing page</label>
        <select id="editing-page" value={slug} disabled={saveState === "saving"} onChange={e => openPage(e.target.value)} className="min-w-0 max-w-[180px] rounded border border-gray-200 px-2 py-1.5 text-sm">
          {pages.length ? pages.map(page => <option key={page.slug} value={page.slug}>{page.title}</option>) : <option value={slug}>{title}</option>}
        </select>
        <button type="button" aria-pressed={panel === "pages"} onClick={() => setPanel("pages")} className={`rounded px-3 py-1.5 text-xs font-medium ${panel === "pages" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Pages & navigation</button>
        <button type="button" aria-pressed={panel === "sections"} onClick={() => setPanel("sections")} className={`rounded px-3 py-1.5 text-xs font-medium ${panel === "sections" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Sections</button>
        <button type="button" aria-pressed={panel === "theme"} onClick={() => setPanel("theme")} className={`rounded px-3 py-1.5 text-xs font-medium ${panel === "theme" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700"}`}>Theme</button>
        <button type="button" onClick={() => { setPanel("sections"); add("canvas"); }} className="rounded bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800">+ Freeform canvas</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* Side panel */}
        <aside className="flex max-h-[45dvh] w-full shrink-0 flex-col border-b border-gray-200 bg-white md:max-h-none md:w-[40%] md:border-b-0 md:border-r">
          {(errors.length > 0 || notice) && (
            <div className={`m-3 rounded-lg border px-3 py-2 text-sm ${errors.length ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="alert">
              {notice || (
                <ul className="list-disc space-y-1 pl-4">
                  {errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
            </div>
          )}

          {panel === "theme" ? <div className="flex-1 overflow-y-auto p-4">{theme ? <ThemeCard initial={theme} onSaved={() => { void storeApi.getMe().then(res => setTheme(res.data.theme)); previewReady.current = false; setPreviewLoading(true); setPreviewVersion(value => value + 1); }} /> : <p>Loading theme…</p>}</div> : panel === "pages" ? <StorePagesPanel pages={pages} currentSlug={slug} onOpen={openPage} onRefresh={async () => { await refreshPages(); previewReady.current = false; setPreviewLoading(true); setPreviewVersion(value => value + 1); }} beforeCreate={async () => saveState === "saving" ? false : saveState === "dirty" ? save() : true} /> : selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <button type="button" onClick={() => setSelectedId(null)} className="flex items-center gap-1 border-b border-gray-100 px-4 py-3 text-sm text-gray-600 hover:text-gray-900">
                <CaretLeft size={14} /> All sections
              </button>
              <div className="flex-1 overflow-y-auto px-4 py-4">
                <h2 className="mb-4 text-sm font-semibold text-gray-900">{SECTIONS[selected.type].label}</h2>
                {selected.type === "hero" && <button type="button" className="btn-secondary mb-4" onClick={() => convertHero(selected)}>Convert hero to freeform canvas</button>}
                <div className="mb-5 rounded-lg border border-orange-200 bg-orange-50 p-3">
                  <p className="mb-2 text-sm font-medium">Add an element</p>
                  <div className="flex flex-wrap gap-2">{["text", "button", "panel", "image"].map(kind => <button key={kind} type="button" className="rounded border border-gray-200 bg-white px-3 py-2 text-sm capitalize" onClick={() => {
                    const elements = Array.isArray(selected.props.elements) ? selected.props.elements : [];
                    if (elements.length >= 30) return;
                    update(sections.map(section => section.id === selected.id ? { ...section, props: { ...section.props, elements: [...elements, { kind, text: kind === "text" ? "Your next big idea" : kind === "button" ? "Shop now" : "", link: "/products", x: 10, y: 10, width: kind === "panel" ? 50 : 30, height: kind === "panel" ? 40 : 15, fontSize: 24, color: "#171717", fill: "#ffd9bd", fillOpacity: kind === "text" || kind === "image" ? 0 : 100, opacity: 100, radius: 8 }] } } : section));
                  }}>+ {kind}</button>)}</div>
                  <p className="mt-2 text-xs text-gray-600">Drag elements in the preview. Select one and drag its orange corner to resize. Use the element controls below for precise placement and styling.</p>
                </div>
                <FieldEditor
                  fields={SECTIONS[selected.type].fields}
                  values={{ ...SECTIONS[selected.type].defaults, ...selected.props }}
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
        <main className="relative flex min-h-0 min-w-0 flex-1 justify-center overflow-hidden p-0 md:p-4">
          {previewLoading && <div className="absolute inset-0 z-10 bg-gray-100 p-6" role="status"><p className="mb-5 text-sm text-gray-500">Loading your storefront…</p><div className="h-12 animate-pulse rounded-lg bg-white" /><div className="mt-5 h-[55%] animate-pulse rounded-lg bg-white" /></div>}
          <iframe
            key={previewVersion}
            ref={iframeRef}
            title="Page preview"
            src={storefrontUrl(store.slug, "/preview")}
            className={`h-full rounded-none border-0 bg-white md:rounded-lg md:shadow-sm ${device === "mobile" ? "w-[390px] max-w-full" : "w-full"}`}
          />
        </main>
      </div>
    </div>
    </PageLinksContext.Provider>
  );
}
