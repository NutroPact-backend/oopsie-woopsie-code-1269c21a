// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, AlertCircle, Layout, ChevronDown, ChevronRight } from "lucide-react";
import { getMegaMenu, setMegaMenu } from "@/lib/megaMenu.functions";
import { setFeatureFlag } from "@/lib/featureFlags.functions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type Link = { label: string; href: string; icon?: string; badge?: string };
type Column = { title: string; links: Link[] };
type Item = {
  id: string;
  label: string;
  layout: "simple" | "grid-2" | "grid-3" | "grid-4" | "featured";
  trigger: "hover" | "click";
  enabled: boolean;
  columns: Column[];
  featured?: { image: string; heading: string; sub: string; cta_label: string; cta_href: string } | null;
  promo?: { text: string; href: string; bg: string; color: string } | null;
};

const NEW_ITEM = (): Item => ({
  id: `m_${Math.random().toString(36).slice(2, 8)}`,
  label: "New menu",
  layout: "grid-3",
  trigger: "hover",
  enabled: true,
  columns: [{ title: "Column 1", links: [] }],
});

export default function MegaMenuTab() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMegaMenu);
  const saveFn = useServerFn(setMegaMenu);
  const flagFn = useServerFn(setFeatureFlag);
  const { isEnabled, refetch } = useFeatureFlags();
  const masterOn = isEnabled("mega_menu");

  const { data } = useQuery({ queryKey: ["admin-mega-menu"], queryFn: () => getFn({}) });
  const [items, setItems] = useState<Item[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => { if (data) setItems((data.items ?? []) as Item[]); }, [data]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { items: items as any } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-mega-menu"] }),
  });
  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => flagFn({ data: { key: "mega_menu", enabled } }),
    onSuccess: () => refetch(),
  });

  const upd = (i: number, patch: Partial<Item>) => setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const updCol = (i: number, c: number, patch: Partial<Column>) => upd(i, { columns: items[i].columns.map((col, ci) => ci === c ? { ...col, ...patch } : col) });
  const updLink = (i: number, c: number, l: number, patch: Partial<Link>) =>
    updCol(i, c, { links: items[i].columns[c].links.map((lk, li) => li === l ? { ...lk, ...patch } : lk) });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Layout size={22} /> Mega Menu Builder</h1>
          <p className="text-sm text-gray-500 mt-1">3-level menu with columns, featured panel, promo banners.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 cursor-pointer">
            <span className="text-sm font-bold">Master {masterOn ? "ON" : "OFF"}</span>
            <input type="checkbox" checked={masterOn} onChange={(e) => toggleMaster.mutate(e.target.checked)} className="h-5 w-5" />
          </label>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5">
            <Save size={14} /> {save.isPending ? "Saving…" : "Save all"}
          </button>
        </div>
      </div>

      {!masterOn && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle size={16} /> Feature is OFF — header will use normal nav links until you turn this ON.
        </div>
      )}

      <button onClick={() => setItems((a) => [...a, NEW_ITEM()])}
        className="flex items-center gap-1.5 bg-orange-500 text-white text-sm px-3 py-2 rounded-lg font-bold">
        <Plus size={14} /> Add top-level menu
      </button>

      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={it.id} className="bg-white rounded-2xl border">
            <div className="flex items-center gap-2 p-3">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="p-1">
                {openIdx === i ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              <input value={it.label} onChange={(e) => upd(i, { label: e.target.value })} className="font-bold text-sm border-0 focus:ring-1 rounded px-2 py-1 flex-1" />
              <select value={it.layout} onChange={(e) => upd(i, { layout: e.target.value as any })} className="text-xs border rounded px-2 py-1">
                <option value="simple">Simple dropdown</option>
                <option value="grid-2">Grid 2-col</option>
                <option value="grid-3">Grid 3-col</option>
                <option value="grid-4">Grid 4-col</option>
                <option value="featured">Featured panel</option>
              </select>
              <select value={it.trigger} onChange={(e) => upd(i, { trigger: e.target.value as any })} className="text-xs border rounded px-2 py-1">
                <option value="hover">Hover</option><option value="click">Click</option>
              </select>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={it.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /> ON</label>
              <button onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
            </div>

            {openIdx === i && (
              <div className="p-3 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-600">Columns</h4>
                  <button onClick={() => upd(i, { columns: [...it.columns, { title: `Column ${it.columns.length + 1}`, links: [] }] })}
                    className="text-xs flex items-center gap-1 border rounded px-2 py-1"><Plus size={11} /> Add column</button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {it.columns.map((col, ci) => (
                    <div key={ci} className="border rounded-xl p-2 space-y-2 bg-gray-50">
                      <div className="flex gap-2">
                        <input value={col.title} onChange={(e) => updCol(i, ci, { title: e.target.value })} placeholder="Column title" className="flex-1 border rounded px-2 py-1 text-xs" />
                        <button onClick={() => upd(i, { columns: it.columns.filter((_, x) => x !== ci) })} className="text-red-500 p-1"><Trash2 size={12} /></button>
                      </div>
                      <ul className="space-y-1">
                        {col.links.map((lk, li) => (
                          <li key={li} className="flex gap-1">
                            <input value={lk.label} onChange={(e) => updLink(i, ci, li, { label: e.target.value })} placeholder="Label" className="flex-1 border rounded px-2 py-1 text-xs" />
                            <input value={lk.href} onChange={(e) => updLink(i, ci, li, { href: e.target.value })} placeholder="/href" className="flex-1 border rounded px-2 py-1 text-xs" />
                            <input value={lk.badge ?? ""} onChange={(e) => updLink(i, ci, li, { badge: e.target.value })} placeholder="Badge" className="w-16 border rounded px-2 py-1 text-xs" />
                            <button onClick={() => updCol(i, ci, { links: col.links.filter((_, x) => x !== li) })} className="text-red-500 p-1"><Trash2 size={11} /></button>
                          </li>
                        ))}
                      </ul>
                      <button onClick={() => updCol(i, ci, { links: [...col.links, { label: "Link", href: "/" }] })}
                        className="text-xs flex items-center gap-1 text-orange-600 font-bold"><Plus size={11} /> Add link</button>
                    </div>
                  ))}
                </div>

                {it.layout === "featured" && (
                  <div className="border rounded-xl p-3 space-y-2">
                    <h5 className="font-bold text-xs">Featured panel</h5>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Image URL" value={it.featured?.image ?? ""} onChange={(e) => upd(i, { featured: { ...(it.featured ?? { heading: "", sub: "", cta_label: "", cta_href: "" }), image: e.target.value } })} className="border rounded px-2 py-1 text-xs" />
                      <input placeholder="Heading" value={it.featured?.heading ?? ""} onChange={(e) => upd(i, { featured: { ...(it.featured ?? { image: "", sub: "", cta_label: "", cta_href: "" }), heading: e.target.value } })} className="border rounded px-2 py-1 text-xs" />
                      <input placeholder="Sub-text" value={it.featured?.sub ?? ""} onChange={(e) => upd(i, { featured: { ...(it.featured ?? { image: "", heading: "", cta_label: "", cta_href: "" }), sub: e.target.value } })} className="border rounded px-2 py-1 text-xs" />
                      <input placeholder="CTA label" value={it.featured?.cta_label ?? ""} onChange={(e) => upd(i, { featured: { ...(it.featured ?? { image: "", heading: "", sub: "", cta_href: "" }), cta_label: e.target.value } })} className="border rounded px-2 py-1 text-xs" />
                      <input placeholder="CTA href" value={it.featured?.cta_href ?? ""} onChange={(e) => upd(i, { featured: { ...(it.featured ?? { image: "", heading: "", sub: "", cta_label: "" }), cta_href: e.target.value } })} className="border rounded px-2 py-1 text-xs col-span-2" />
                    </div>
                  </div>
                )}

                <div className="border rounded-xl p-3 space-y-2">
                  <h5 className="font-bold text-xs">Promo banner (optional)</h5>
                  <div className="grid grid-cols-4 gap-2">
                    <input placeholder="Text" value={it.promo?.text ?? ""} onChange={(e) => upd(i, { promo: { ...(it.promo ?? { href: "/", bg: "#fef3c7", color: "#92400e" }), text: e.target.value } })} className="border rounded px-2 py-1 text-xs col-span-2" />
                    <input placeholder="Href" value={it.promo?.href ?? ""} onChange={(e) => upd(i, { promo: { ...(it.promo ?? { text: "", bg: "#fef3c7", color: "#92400e" }), href: e.target.value } })} className="border rounded px-2 py-1 text-xs" />
                    <div className="flex gap-1">
                      <input type="color" value={it.promo?.bg ?? "#fef3c7"} onChange={(e) => upd(i, { promo: { ...(it.promo ?? { text: "", href: "/", color: "#92400e" }), bg: e.target.value } })} className="flex-1 border rounded h-7" />
                      <input type="color" value={it.promo?.color ?? "#92400e"} onChange={(e) => upd(i, { promo: { ...(it.promo ?? { text: "", href: "/", bg: "#fef3c7" }), color: e.target.value } })} className="flex-1 border rounded h-7" />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
