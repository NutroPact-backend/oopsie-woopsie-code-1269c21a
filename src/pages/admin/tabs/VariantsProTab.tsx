// @ts-nocheck
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Save, Star, AlertCircle, Package } from "lucide-react";
import {
  searchProductsForVariantsPro,
  getProductVariantsList,
  setVariantsProConfig,
} from "@/lib/variantsPro.functions";
import { setFeatureFlag } from "@/lib/featureFlags.functions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type ProConfig = {
  display_mode: "dropdown" | "radio-cards" | "tabs";
  recommended_variant_id?: string | null;
  badges: Record<string, { text: string; color?: string; bg_color?: string; icon?: string }>;
  per_pack_offers: Record<string, string>;
  show_per_day_cost: boolean;
  per_day_divisor: Record<string, number>;
  show_save_chip: boolean;
};

const DEFAULT_CFG: ProConfig = {
  display_mode: "radio-cards",
  recommended_variant_id: null,
  badges: {},
  per_pack_offers: {},
  show_per_day_cost: false,
  per_day_divisor: {},
  show_save_chip: true,
};

export default function VariantsProTab() {
  const qc = useQueryClient();
  const searchFn = useServerFn(searchProductsForVariantsPro);
  const varListFn = useServerFn(getProductVariantsList);
  const saveCfgFn = useServerFn(setVariantsProConfig);
  const flagFn = useServerFn(setFeatureFlag);
  const { isEnabled, refetch } = useFeatureFlags();
  const masterOn = isEnabled("variants_pro");

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<{ id: string; name: string; cfg: ProConfig } | null>(null);

  const products = useQuery({
    queryKey: ["vpro-search", q],
    queryFn: () => searchFn({ data: { q } }),
  });
  const variants = useQuery({
    queryKey: ["vpro-variants", selected?.id],
    queryFn: () => varListFn({ data: { product_id: selected!.id } }),
    enabled: !!selected,
  });

  useEffect(() => {
    if (selected) {
      const p = products.data?.products.find((x: any) => x.id === selected.id);
      if (p) {
        const cfg = { ...DEFAULT_CFG, ...((p.variants_pro_config ?? {}) as Partial<ProConfig>) };
        setSelected({ id: p.id, name: p.name, cfg });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data]);

  const save = useMutation({
    mutationFn: () => saveCfgFn({ data: { product_id: selected!.id, config: selected!.cfg as any } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["vpro-search"] }),
  });

  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => flagFn({ data: { key: "variants_pro", enabled } }),
    onSuccess: () => refetch(),
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Package size={22} /> Pro Variant UI</h1>
          <p className="text-sm text-gray-500 mt-1">Per-product: display mode, recommended pack, badges, per-pack offers.</p>
        </div>
        <label className="flex items-center gap-3 bg-white border rounded-xl px-4 py-2.5 cursor-pointer">
          <span className="text-sm font-bold">Master {masterOn ? "ON" : "OFF"}</span>
          <input type="checkbox" checked={masterOn} onChange={(e) => toggleMaster.mutate(e.target.checked)} className="h-5 w-5" />
        </label>
      </div>

      {!masterOn && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-sm">
          <AlertCircle size={16} /> Feature is OFF — even if you configure products, the PDP will use the default variant picker.
        </div>
      )}

      <div className="grid md:grid-cols-[320px_1fr] gap-4">
        <div className="bg-white rounded-2xl border p-3">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm" />
          </div>
          {products.isLoading ? <p className="text-sm text-gray-500 p-2">Loading…</p> : (
            <ul className="space-y-1 max-h-[60vh] overflow-y-auto">
              {(products.data?.products ?? []).map((p: any) => {
                const hasCfg = p.variants_pro_config && Object.keys(p.variants_pro_config).length > 0;
                return (
                  <li key={p.id}>
                    <button onClick={() => setSelected({ id: p.id, name: p.name, cfg: { ...DEFAULT_CFG, ...(p.variants_pro_config as object) } })}
                      className={`w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-50 ${selected?.id === p.id ? "bg-orange-50 ring-1 ring-orange-300" : ""}`}>
                      {(p.images?.[0]) ? <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" /> : <div className="w-8 h-8 bg-gray-100 rounded" />}
                      <span className="flex-1 text-sm truncate">{p.name}</span>
                      {hasCfg && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded">SET</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border p-4 min-h-[200px]">
          {!selected ? <p className="text-sm text-gray-500">Select a product on the left to configure its variant UI.</p> : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-black text-lg">{selected.name}</h2>
                <button onClick={() => save.mutate()} disabled={save.isPending}
                  className="bg-black text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1.5">
                  <Save size={14} /> {save.isPending ? "Saving…" : "Save"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <F label="Display mode">
                  <select value={selected.cfg.display_mode} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, display_mode: e.target.value as any } })}
                    className="w-full border rounded-lg px-3 py-2 text-sm">
                    <option value="dropdown">Dropdown (default)</option>
                    <option value="radio-cards">Radio cards (pro)</option>
                    <option value="tabs">Tabs</option>
                  </select>
                </F>
                <label className="flex items-center gap-2 text-sm font-bold mt-6">
                  <input type="checkbox" checked={selected.cfg.show_save_chip} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, show_save_chip: e.target.checked } })} />
                  Show "You Save ₹X (Y%)" chip
                </label>
                <label className="flex items-center gap-2 text-sm font-bold mt-6">
                  <input type="checkbox" checked={selected.cfg.show_per_day_cost} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, show_per_day_cost: e.target.checked } })} />
                  Show per-day cost
                </label>
              </div>

              <div>
                <h3 className="font-bold text-sm mb-2">Variants — set badge / recommended / per-pack offer</h3>
                {variants.isLoading ? <p className="text-sm text-gray-500">Loading variants…</p> : (variants.data?.variants ?? []).length === 0 ? (
                  <p className="text-xs text-gray-500">No variants on this product yet. Add variants from the Products tab first.</p>
                ) : (
                  <ul className="space-y-2">
                    {(variants.data?.variants ?? []).map((v: any) => {
                      const badge = selected.cfg.badges[v.id] ?? { text: "", color: "#ffffff", bg_color: "#dc2626" };
                      const isRec = selected.cfg.recommended_variant_id === v.id;
                      return (
                        <li key={v.id} className="border rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{[v.flavor_name, v.size_name].filter(Boolean).join(" · ") || v.sku}</span>
                            <span className="text-xs text-gray-500">₹{v.price}{v.compare_price ? ` (MRP ₹${v.compare_price})` : ""}</span>
                            <button onClick={() => setSelected({ ...selected, cfg: { ...selected.cfg, recommended_variant_id: isRec ? null : v.id } })}
                              className={`ml-auto text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${isRec ? "bg-yellow-400 text-black" : "bg-gray-100 text-gray-600"}`}>
                              <Star size={11} /> {isRec ? "Recommended" : "Mark recommended"}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <input placeholder="Badge text" value={badge.text} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, badges: { ...selected.cfg.badges, [v.id]: { ...badge, text: e.target.value } } } })}
                              className="border rounded px-2 py-1.5 text-xs" />
                            <input type="color" value={badge.bg_color ?? "#dc2626"} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, badges: { ...selected.cfg.badges, [v.id]: { ...badge, bg_color: e.target.value } } } })}
                              className="border rounded h-8" />
                            <input type="color" value={badge.color ?? "#ffffff"} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, badges: { ...selected.cfg.badges, [v.id]: { ...badge, color: e.target.value } } } })}
                              className="border rounded h-8" />
                            <input placeholder="+ Free Shaker / etc." value={selected.cfg.per_pack_offers[v.id] ?? ""} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, per_pack_offers: { ...selected.cfg.per_pack_offers, [v.id]: e.target.value } } })}
                              className="border rounded px-2 py-1.5 text-xs" />
                          </div>
                          {selected.cfg.show_per_day_cost && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-gray-600">Days in pack:</span>
                              <input type="number" value={selected.cfg.per_day_divisor[v.id] ?? ""} onChange={(e) => setSelected({ ...selected, cfg: { ...selected.cfg, per_day_divisor: { ...selected.cfg.per_day_divisor, [v.id]: Number(e.target.value) } } })}
                                className="border rounded px-2 py-1 w-24" placeholder="e.g. 30" />
                              <span className="text-gray-400">→ ₹/day auto-calc on PDP</span>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-bold text-gray-700">{label}</span><div className="mt-1">{children}</div></label>;
}
