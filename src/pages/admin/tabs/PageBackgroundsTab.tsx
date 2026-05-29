// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, Trash2, Image as ImageIcon, Save } from "lucide-react";
import {
  adminListPageBackgrounds,
  upsertPageBackground,
  deletePageBackground,
} from "@/lib/page-backgrounds.functions";
import { useSimpleUpload } from "@/lib/useSimpleUpload";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

// Known site pages — admin can also pick "global" as a fallback.
const PAGE_OPTIONS: { key: string; label: string }[] = [
  { key: "global", label: "Global (fallback for any page without its own image)" },
  { key: "home", label: "Home (/)" },
  { key: "products", label: "Products listing (/products)" },
  { key: "p", label: "Product detail (/p/*)" },
  { key: "category", label: "Category pages (/category/*)" },
  { key: "cart", label: "Cart (/cart)" },
  { key: "checkout", label: "Checkout (/checkout)" },
  { key: "about", label: "About (/about)" },
  { key: "blog", label: "Blog (/blog & /blog/*)" },
  { key: "contact", label: "Contact (/contact)" },
  { key: "faq", label: "FAQ (/faq)" },
  { key: "testimonials", label: "Testimonials (/testimonials)" },
  { key: "search", label: "Search (/search)" },
  { key: "account", label: "Account (/account/*)" },
  { key: "login", label: "Login (/login)" },
  { key: "track-order", label: "Track Order (/track-order)" },
  { key: "shipping", label: "Shipping policy (/shipping)" },
  { key: "privacy", label: "Privacy (/privacy)" },
  { key: "terms", label: "Terms (/terms)" },
  { key: "refund", label: "Refund (/refund)" },
  { key: "combo", label: "Combo builder (/combo)" },
];

type Row = {
  page_key: string;
  image_url: string | null;
  opacity: number;
  enabled: boolean;
  position: string;
  size: string;
  repeat: string;
  blend_mode: string;
};

export default function PageBackgroundsTab() {
  const perms = useAdminPermissions();
  const canEdit = perms.has("backgrounds.edit");
  const list = useServerFn(adminListPageBackgrounds);
  const upsert = useServerFn(upsertPageBackground);
  const del = useServerFn(deletePageBackground);
  const qc = useQueryClient();
  const { uploadFile, isUploading: uploading } = useSimpleUpload({ bucket: "page-backgrounds" });

  const q = useQuery({ queryKey: ["admin-page-backgrounds"], queryFn: () => list() });

  const [selected, setSelected] = useState<string>("home");
  const [form, setForm] = useState<Row>({
    page_key: "home",
    image_url: null,
    opacity: 0.15,
    enabled: true,
    position: "center",
    size: "cover",
    repeat: "no-repeat",
    blend_mode: "normal",
  });

  useEffect(() => {
    const existing = (q.data?.backgrounds as any[] | undefined)?.find((r) => r.page_key === selected);
    if (existing) setForm(existing);
    else setForm((f) => ({ ...f, page_key: selected, image_url: null, opacity: 0.15, enabled: true, position: "center", size: "cover", repeat: "no-repeat", blend_mode: "normal" }));
  }, [selected, q.data]);

  const onPickFile = async (file: File) => {
    try {
      const url = await uploadFile(file);
      if (url) setForm((f) => ({ ...f, image_url: url }));
    } catch (e: any) {
      toast.error(e?.message || "Upload failed");
    }
  };

  const save = async () => {
    try {
      await upsert({
        data: {
          pageKey: form.page_key,
          imageUrl: form.image_url,
          opacity: Number(form.opacity),
          enabled: form.enabled,
          position: form.position as any,
          size: form.size as any,
          repeat: form.repeat as any,
          blendMode: form.blend_mode as any,
        },
      });
      toast.success("Saved");
      await qc.invalidateQueries({ queryKey: ["admin-page-backgrounds"] });
      await qc.invalidateQueries({ queryKey: ["page-backgrounds"] });
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    }
  };

  const remove = async () => {
    if (!confirm(`Remove background for "${selected}"?`)) return;
    try {
      await del({ data: { pageKey: selected } });
      toast.success("Removed");
      await qc.invalidateQueries({ queryKey: ["admin-page-backgrounds"] });
      await qc.invalidateQueries({ queryKey: ["page-backgrounds"] });
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  };

  if (!perms.has("backgrounds.view")) {
    return <div className="p-6 text-sm text-gray-500">You don't have permission to view page backgrounds.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <p className="text-xs text-gray-500">
          Upload a background image for any page. Pick a page below, upload an image, set how transparent it should be, and save.
          The "Global" entry is used as a fallback when a specific page has no image.
          {!canEdit && <span className="block mt-2 text-amber-600 font-semibold">You can view but not edit (need <code>backgrounds.edit</code> permission).</span>}
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Page list */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 max-h-[600px] overflow-auto">
          {PAGE_OPTIONS.map((p) => {
            const has = (q.data?.backgrounds as any[] | undefined)?.find((r) => r.page_key === p.key);
            return (
              <button
                key={p.key}
                onClick={() => setSelected(p.key)}
                className={`w-full flex items-start justify-between gap-2 text-left px-3 py-2 rounded-lg text-xs mb-1 ${
                  selected === p.key ? "bg-orange-500 text-white" : "hover:bg-gray-100 text-gray-700"
                }`}
              >
                <span className="font-semibold truncate">{p.label}</span>
                {has?.image_url && <span className={`text-[10px] shrink-0 rounded px-1.5 py-0.5 ${selected === p.key ? "bg-white/20" : "bg-emerald-100 text-emerald-700"}`}>set</span>}
              </button>
            );
          })}
        </div>

        {/* Editor */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-5">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Editing</p>
            <h3 className="text-lg font-black text-gray-900">{PAGE_OPTIONS.find((p) => p.key === selected)?.label ?? selected}</h3>
          </div>

          {/* Image */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Background image</label>
            <div className="flex items-start gap-4">
              <div className="w-40 h-28 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {form.image_url ? (
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="text-gray-300" size={28} />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-xs font-semibold cursor-pointer ${!canEdit || uploading ? "opacity-50 pointer-events-none" : "hover:bg-gray-50"}`}>
                  <Upload size={14} />
                  {uploading ? "Uploading…" : "Upload image"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!canEdit || uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickFile(f); }}
                  />
                </label>
                {form.image_url && (
                  <button
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setForm((f) => ({ ...f, image_url: null }))}
                    className="block text-xs text-red-600 hover:underline disabled:opacity-50"
                  >
                    Clear image
                  </button>
                )}
                <input
                  type="url"
                  placeholder="Or paste image URL"
                  value={form.image_url ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value || null }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Opacity */}
          <div>
            <label className="text-xs font-bold text-gray-700 flex justify-between mb-2">
              <span>Transparency (opacity)</span>
              <span className="text-orange-600">{Math.round(form.opacity * 100)}%</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.01}
              value={form.opacity}
              disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, opacity: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-[10px] text-gray-500 mt-1">0% = fully invisible, 100% = fully opaque. Subtle backgrounds usually work best at 10–25%.</p>
          </div>

          {/* Toggle */}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700">
            <input type="checkbox" checked={form.enabled} disabled={!canEdit}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} />
            Enabled (show on the site)
          </label>

          {/* Advanced */}
          <details className="border border-gray-200 rounded-lg p-3">
            <summary className="text-xs font-bold cursor-pointer">Advanced display</summary>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Size">
                <select value={form.size} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} className="w-full px-2 py-1.5 border rounded text-xs">
                  <option value="cover">cover</option>
                  <option value="contain">contain</option>
                  <option value="auto">auto</option>
                </select>
              </Field>
              <Field label="Position">
                <select value={form.position} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))} className="w-full px-2 py-1.5 border rounded text-xs">
                  {["center","top","bottom","left","right","top left","top right","bottom left","bottom right"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Repeat">
                <select value={form.repeat} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, repeat: e.target.value }))} className="w-full px-2 py-1.5 border rounded text-xs">
                  <option value="no-repeat">no-repeat</option>
                  <option value="repeat">repeat (tile)</option>
                  <option value="repeat-x">repeat-x</option>
                  <option value="repeat-y">repeat-y</option>
                </select>
              </Field>
              <Field label="Blend mode">
                <select value={form.blend_mode} disabled={!canEdit} onChange={(e) => setForm((f) => ({ ...f, blend_mode: e.target.value }))} className="w-full px-2 py-1.5 border rounded text-xs">
                  {["normal","multiply","overlay","soft-light","screen","darken","lighten"].map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
            </div>
          </details>

          {/* Preview */}
          <div>
            <p className="text-xs font-bold text-gray-700 mb-2">Live preview</p>
            <div className="relative h-40 rounded-lg border border-gray-200 bg-white overflow-hidden">
              {form.image_url && form.enabled && (
                <div
                  style={{
                    position: "absolute", inset: 0,
                    backgroundImage: `url(${form.image_url})`,
                    backgroundPosition: form.position,
                    backgroundSize: form.size,
                    backgroundRepeat: form.repeat,
                    opacity: form.opacity,
                    mixBlendMode: form.blend_mode as any,
                  }}
                />
              )}
              <div className="relative p-4 text-sm text-gray-700">Page content sits on top of the background.</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <button onClick={save} disabled={!canEdit} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm disabled:opacity-50">
              <Save size={14} /> Save
            </button>
            <button onClick={remove} disabled={!canEdit} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 text-red-700 hover:bg-red-50 font-semibold text-sm disabled:opacity-50">
              <Trash2 size={14} /> Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-gray-500 mb-1">{label}</p>
      {children}
    </div>
  );
}
