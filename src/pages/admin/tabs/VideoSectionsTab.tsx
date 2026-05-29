// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Save, GripVertical, Upload, X, Search, Video as VideoIcon, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { adminListVideoSections, upsertVideoSection, deleteVideoSection } from "@/lib/video-sections.functions";
import { useSimpleUpload } from "@/lib/useSimpleUpload";
import API from "@/lib/api";

type VideoItem = {
  id: string;
  src: string;
  type: "mp4" | "youtube" | "instagram";
  thumbnail?: string;
  title?: string;
  views?: number | string;
  productId?: string;
  cta?: { text?: string; href?: string };
};

type Placement = {
  type: "home" | "product" | "category" | "page" | "blog" | "blog-index";
  scope: "all" | "specific";
  ids: string[];
  position: number;
};

type Section = {
  id?: string;
  heading: string;
  subheading?: string;
  layout: "reel-carousel" | "grid" | "single-feature";
  enabled: boolean;
  videos: VideoItem[];
  placements: Placement[];
  visibility: { desktop: boolean; mobile: boolean; startAt?: string; endAt?: string };
  sortOrder: number;
};

const PLACEMENT_TYPES: { value: Placement["type"]; label: string; supportsSpecific: boolean }[] = [
  { value: "home", label: "Homepage", supportsSpecific: false },
  { value: "product", label: "Product page", supportsSpecific: true },
  { value: "category", label: "Category page", supportsSpecific: true },
  { value: "page", label: "Custom page", supportsSpecific: true },
  { value: "blog", label: "Blog post", supportsSpecific: true },
  { value: "blog-index", label: "Blog index", supportsSpecific: false },
];

const blank = (): Section => ({
  heading: "Watch & Shop",
  subheading: "",
  layout: "reel-carousel",
  enabled: true,
  videos: [],
  placements: [{ type: "home", scope: "all", ids: [], position: 50 }],
  visibility: { desktop: true, mobile: true },
  sortOrder: 0,
});

function detectType(src: string): VideoItem["type"] {
  if (/youtube\.com|youtu\.be/.test(src)) return "youtube";
  if (/instagram\.com/.test(src)) return "instagram";
  return "mp4";
}

function newVideo(): VideoItem {
  return { id: crypto.randomUUID(), src: "", type: "mp4", thumbnail: "", title: "", views: 0, productId: "", cta: { text: "", href: "" } };
}

function PlacementPicker({ placements, products, categories, pages, posts, onChange }: {
  placements: Placement[];
  products: any[]; categories: any[]; pages: any[]; posts: any[];
  onChange: (p: Placement[]) => void;
}) {
  const optionsFor = (t: Placement["type"]) => {
    if (t === "product") return products.map((p) => ({ id: p._id || p.id, name: p.name }));
    if (t === "category") return categories.map((c) => ({ id: c._id || c.id || c.slug, name: c.name }));
    if (t === "page") return pages.map((p) => ({ id: p.id, name: p.title }));
    if (t === "blog") return posts.map((p) => ({ id: p._id || p.id || p.slug, name: p.title }));
    return [];
  };
  const update = (i: number, patch: Partial<Placement>) => {
    const next = placements.slice(); next[i] = { ...next[i], ...patch }; onChange(next);
  };
  const remove = (i: number) => onChange(placements.filter((_, j) => j !== i));
  const add = () => onChange([...placements, { type: "home", scope: "all", ids: [], position: 50 }]);
  return (
    <div className="space-y-2">
      {placements.map((p, i) => {
        const meta = PLACEMENT_TYPES.find((t) => t.value === p.type)!;
        const opts = optionsFor(p.type);
        return (
          <div key={i} className="rounded-xl border border-gray-200 p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <select value={p.type} onChange={(e) => update(i, { type: e.target.value as any, scope: "all", ids: [] })}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                {PLACEMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {meta.supportsSpecific && (
                <select value={p.scope} onChange={(e) => update(i, { scope: e.target.value as any })}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                  <option value="all">All {meta.label.toLowerCase()}s</option>
                  <option value="specific">Specific…</option>
                </select>
              )}
              <div className="flex items-center gap-1 ml-auto">
                <span className="text-[10px] text-gray-500">Position</span>
                <input type="number" value={p.position} onChange={(e) => update(i, { position: Number(e.target.value) })}
                  className="w-14 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white" />
                <button onClick={() => remove(i)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button>
              </div>
            </div>
            {meta.supportsSpecific && p.scope === "specific" && (
              <div className="max-h-32 overflow-auto rounded-lg bg-white border border-gray-200 p-2 space-y-1">
                {opts.length === 0 && <div className="text-xs text-gray-400 italic">No items found.</div>}
                {opts.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                    <input type="checkbox" checked={p.ids.includes(o.id)} onChange={(e) => {
                      const next = e.target.checked ? [...p.ids, o.id] : p.ids.filter((x) => x !== o.id);
                      update(i, { ids: next });
                    }} />
                    <span className="line-clamp-1">{o.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <button onClick={add} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
        <Plus size={14} /> Add placement
      </button>
    </div>
  );
}

function VideoEditor({ video, products, onChange, onRemove }: {
  video: VideoItem; products: any[]; onChange: (v: VideoItem) => void; onRemove: () => void;
}) {
  const { uploadFile, isUploading } = useSimpleUpload();
  const [picker, setPicker] = useState("");
  const filtered = useMemo(() => {
    const q = picker.toLowerCase().trim();
    if (!q) return products.slice(0, 8);
    return products.filter((p) => (p.name || "").toLowerCase().includes(q)).slice(0, 8);
  }, [picker, products]);
  const selected = products.find((p) => (p._id || p.id) === video.productId);

  return (
    <div className="rounded-2xl border border-gray-200 p-3 bg-white space-y-2">
      <div className="flex items-start gap-2">
        <GripVertical size={16} className="text-gray-300 mt-2 shrink-0" />
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-gray-500">Video URL (mp4 / YouTube / Instagram)</label>
            <div className="flex gap-1">
              <input value={video.src} onChange={(e) => onChange({ ...video, src: e.target.value, type: detectType(e.target.value) })}
                placeholder="https://..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
              <label className="text-[10px] font-bold bg-gray-900 text-white px-2 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 hover:bg-gray-700">
                {isUploading ? "…" : <><Upload size={11} /> Upload</>}
                <input type="file" accept="video/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await uploadFile(f);
                  if (url) onChange({ ...video, src: url, type: "mp4" });
                }} />
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500">Thumbnail URL</label>
            <div className="flex gap-1">
              <input value={video.thumbnail || ""} onChange={(e) => onChange({ ...video, thumbnail: e.target.value })}
                placeholder="https://..." className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
              <label className="text-[10px] font-bold bg-gray-900 text-white px-2 py-1.5 rounded-lg cursor-pointer flex items-center gap-1 hover:bg-gray-700">
                <Upload size={11} />
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f) return;
                  const url = await uploadFile(f);
                  if (url) onChange({ ...video, thumbnail: url });
                }} />
              </label>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500">Title (optional)</label>
            <input value={video.title || ""} onChange={(e) => onChange({ ...video, title: e.target.value })}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500">Views (e.g. 65K or 65000)</label>
            <input value={String(video.views ?? "")} onChange={(e) => {
              const raw = e.target.value;
              const num = Number(raw);
              onChange({ ...video, views: raw === "" ? "" : isNaN(num) ? raw : num });
            }} className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-bold text-gray-500">Attach product (for Add-to-Cart)</label>
            {selected ? (
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                {selected.images?.[0] && <img src={selected.images[0]} alt="" className="w-6 h-6 rounded object-cover" />}
                <span className="text-xs flex-1 truncate">{selected.name}</span>
                <button onClick={() => onChange({ ...video, productId: "" })} className="text-red-500 p-0.5"><X size={12} /></button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={picker} onChange={(e) => setPicker(e.target.value)} placeholder="Search products…"
                    className="w-full text-xs border border-gray-200 rounded-lg pl-6 pr-2 py-1.5" />
                </div>
                {picker && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-lg max-h-32 overflow-auto">
                    {filtered.map((p) => (
                      <button key={p._id || p.id} type="button" onClick={() => { onChange({ ...video, productId: p._id || p.id }); setPicker(""); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-gray-50 text-left">
                        {p.images?.[0] && <img src={p.images[0]} alt="" className="w-5 h-5 rounded object-cover" />}
                        <span className="line-clamp-1">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <button onClick={onRemove} className="text-red-500 hover:bg-red-50 p-1.5 rounded shrink-0"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

function SectionEditor({ initial, products, categories, pages, posts, onSaved, onCancel, onDelete }: {
  initial: Section;
  products: any[]; categories: any[]; pages: any[]; posts: any[];
  onSaved: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const [s, setS] = useState<Section>(initial);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!s.heading.trim()) { alert("Heading is required"); return; }
    setSaving(true);
    try {
      await upsertVideoSection({ data: s as any });
      onSaved();
    } catch (e: any) {
      alert("Save failed: " + (e?.message || "unknown"));
    } finally { setSaving(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Heading *</label>
          <input value={s.heading} onChange={(e) => setS({ ...s, heading: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Subheading (optional)</label>
          <input value={s.subheading || ""} onChange={(e) => setS({ ...s, subheading: e.target.value })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Layout</label>
          <select value={s.layout} onChange={(e) => setS({ ...s, layout: e.target.value as any })}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <option value="reel-carousel">Reel Carousel (horizontal, shoppable)</option>
            <option value="grid">Grid (3-4 columns)</option>
            <option value="single-feature">Single Feature (one big video)</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input type="checkbox" checked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
            Enabled
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={s.visibility.desktop} onChange={(e) => setS({ ...s, visibility: { ...s.visibility, desktop: e.target.checked } })} />
            Desktop
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={s.visibility.mobile} onChange={(e) => setS({ ...s, visibility: { ...s.visibility, mobile: e.target.checked } })} />
            Mobile
          </label>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <span className="text-gray-500">Sort</span>
            <input type="number" value={s.sortOrder} onChange={(e) => setS({ ...s, sortOrder: Number(e.target.value) })}
              className="w-16 border border-gray-200 rounded-lg px-2 py-1" />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-black text-gray-800">Videos ({s.videos.length})</h4>
          <button onClick={() => setS({ ...s, videos: [...s.videos, newVideo()] })}
            className="text-xs font-bold bg-gray-900 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-gray-700">
            <Plus size={12} /> Add video
          </button>
        </div>
        <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
          {s.videos.map((v, i) => (
            <VideoEditor key={v.id} video={v} products={products}
              onChange={(nv) => setS({ ...s, videos: s.videos.map((x, j) => j === i ? nv : x) })}
              onRemove={() => setS({ ...s, videos: s.videos.filter((_, j) => j !== i) })} />
          ))}
          {s.videos.length === 0 && <p className="text-xs text-gray-400 italic bg-gray-50 rounded-xl p-3 text-center">No videos yet. Click "Add video".</p>}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-black text-gray-800 mb-2">Where to show this section</h4>
        <PlacementPicker placements={s.placements} products={products} categories={categories} pages={pages} posts={posts}
          onChange={(p) => setS({ ...s, placements: p })} />
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        {onDelete ? (
          <button onClick={onDelete} className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-1">
            <Trash2 size={12} /> Delete section
          </button>
        ) : <span />}
        <div className="flex items-center gap-2">
          <button onClick={onCancel} className="text-xs font-bold text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg">Cancel</button>
          <button onClick={save} disabled={saving}
            className="text-xs font-black bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1">
            <Save size={12} /> {saving ? "Saving…" : "Save section"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VideoSectionsTab() {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Section | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [secs, p, c, s, b] = await Promise.all([
      adminListVideoSections().catch(() => []),
      API.get("/products").then((r) => r.data || []).catch(() => []),
      API.get("/admin/categories").then((r) => r.data || []).catch(() => []),
      API.get("/admin/settings").then((r) => r.data?.customPages || []).catch(() => []),
      API.get("/blog").then((r) => r.data || []).catch(() => []),
    ]);
    setSections(secs as any);
    setProducts(p); setCategories(c); setPages(s); setPosts(b);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this video section?")) return;
    await deleteVideoSection({ data: { id } });
    setEditing(null);
    load();
  };

  if (loading) return <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><VideoIcon size={18} /> Video Sections</h2>
          <p className="text-xs text-gray-500 mt-1">One place to manage shoppable Reel-style video sections. Place on any page; multiple per page allowed.</p>
        </div>
        <button onClick={() => setEditing(blank())}
          className="text-xs font-black bg-gray-900 text-white px-4 py-2 rounded-lg flex items-center gap-1 hover:bg-gray-700 shrink-0">
          <Plus size={14} /> New section
        </button>
      </div>

      {editing && (
        <SectionEditor initial={editing} products={products} categories={categories} pages={pages} posts={posts}
          onSaved={() => { setEditing(null); load(); }}
          onCancel={() => setEditing(null)}
          onDelete={editing.id ? () => remove(editing.id!) : undefined} />
      )}

      {!editing && (
        <div className="space-y-2">
          {sections.length === 0 && (
            <div className="bg-gray-50 rounded-2xl p-8 text-center text-sm text-gray-500">
              No video sections yet. Click <strong>New section</strong> to add a "Watch &amp; Shop" carousel.
            </div>
          )}
          {sections.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-200 p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setExpanded(expanded === s.id ? null : s.id!)} className="text-gray-400 hover:text-gray-700">
                  {expanded === s.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900 truncate">{s.heading}</span>
                    {!s.enabled && <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">DISABLED</span>}
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{s.layout}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {s.videos.length} videos · placements: {s.placements.map((p) => `${p.type}${p.scope === "specific" ? `(${p.ids.length})` : ""}`).join(", ") || "none"}
                  </div>
                </div>
                {s.enabled ? <Eye size={14} className="text-green-600" /> : <EyeOff size={14} className="text-gray-400" />}
                <button onClick={() => setEditing(s)} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg">Edit</button>
              </div>
              {expanded === s.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 md:grid-cols-6 gap-2">
                  {s.videos.slice(0, 6).map((v) => (
                    <div key={v.id} className="aspect-[9/16] bg-gray-100 rounded-lg overflow-hidden">
                      {v.thumbnail ? <img src={v.thumbnail} alt="" className="w-full h-full object-cover" /> :
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">no thumb</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}