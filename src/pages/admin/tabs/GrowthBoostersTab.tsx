// @ts-nocheck
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Save, Sparkles, Loader2, Search, X, Wand2, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  getGrowthBoosters,
  saveGrowthBoosters,
  type GrowthBoostersSettings,
} from "@/lib/growthBoosters.functions";
import { translateAllProducts } from "@/lib/translations.functions";
import { LOCALES } from "@/lib/locales";

type Brand = GrowthBoostersSettings["marketplace"]["brands"][number];

const ACCENT_BG = "bg-gradient-to-br from-orange-50 via-amber-50 to-white";

export default function GrowthBoostersTab() {
  const qc = useQueryClient();
  const get = useServerFn(getGrowthBoosters);
  const save = useServerFn(saveGrowthBoosters);
  const bulkTrans = useServerFn(translateAllProducts);

  const { data, isLoading } = useQuery({
    queryKey: ["growth-boosters"],
    queryFn: () => get({}),
  });

  const [form, setForm] = useState<GrowthBoostersSettings | null>(null);
  useEffect(() => { if (data && !form) setForm(data as any); }, [data]);

  const saveMut = useMutation({
    mutationFn: (v: GrowthBoostersSettings) => save({ data: v as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["growth-boosters"] }),
  });

  const bulkMut = useMutation({
    mutationFn: (limit: number) => bulkTrans({ data: { limit } }),
  });

  if (isLoading || !form) {
    return <div className="p-6"><div className="h-40 bg-gray-100 rounded-2xl animate-pulse" /></div>;
  }

  const update = <K extends keyof GrowthBoostersSettings>(k: K, v: GrowthBoostersSettings[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <div className={`p-4 md:p-6 max-w-5xl mx-auto space-y-6 ${ACCENT_BG} min-h-full`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Sparkles className="text-orange-500" /> Growth Boosters</h1>
          <p className="text-sm text-gray-500 mt-1">Marketplace strip · Empty cart upsell · Rating filter · Hindi PDP infographics</p>
        </div>
        <button
          onClick={() => saveMut.mutate(form)}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-black disabled:opacity-50"
        >
          {saveMut.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
          Save all
        </button>
      </div>
      {saveMut.isSuccess && <p className="text-xs text-green-600 font-bold">✓ Saved</p>}
      {saveMut.isError && <p className="text-xs text-red-600 font-bold">Failed: {(saveMut.error as any)?.message}</p>}

      <MarketplaceSection value={form.marketplace} onChange={(v) => update("marketplace", v)} />
      <EmptyCartSection value={form.emptyCart} onChange={(v) => update("emptyCart", v)} />
      <RatingFilterSection value={form.ratingFilter} onChange={(v) => update("ratingFilter", v)} />
    </div>
  );
}

/* ───────────────────── Marketplace ───────────────────── */
function MarketplaceSection({ value, onChange }: { value: GrowthBoostersSettings["marketplace"]; onChange: (v: GrowthBoostersSettings["marketplace"]) => void }) {
  const add = () => onChange({
    ...value,
    brands: [...value.brands, { id: crypto.randomUUID(), label: "", logo: "", url: "", enabled: true }],
  });
  const upd = (i: number, patch: Partial<Brand>) => onChange({
    ...value,
    brands: value.brands.map((b, idx) => idx === i ? { ...b, ...patch } : b),
  });
  const rm = (i: number) => onChange({ ...value, brands: value.brands.filter((_, idx) => idx !== i) });

  return (
    <Card title="🏪 Marketplace Trust Strip" desc="Show 'Also available on' logos in footer with links to your listing on each marketplace. Unlimited brands.">
      <ToggleRow label="Show marketplace strip in footer" checked={value.enabled} onChange={(b) => onChange({ ...value, enabled: b })} />
      <FieldRow label="Section heading">
        <input value={value.heading} onChange={(e) => onChange({ ...value, heading: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Also available on" />
      </FieldRow>

      <div className="mt-4 space-y-2">
        {value.brands.length === 0 && (
          <p className="text-xs text-gray-500 italic">No brands yet. Click "Add brand" to add Amazon, Flipkart, Blinkit, Zepto, etc.</p>
        )}
        {value.brands.map((b, i) => (
          <div key={b.id} className="bg-white border rounded-xl p-3 grid grid-cols-12 gap-2 items-center">
            <input value={b.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder="Amazon"
              className="col-span-12 sm:col-span-2 border rounded-lg px-2 py-1.5 text-sm" />
            <input value={b.logo} onChange={(e) => upd(i, { logo: e.target.value })} placeholder="Logo URL (PNG, ideally white bg)"
              className="col-span-12 sm:col-span-4 border rounded-lg px-2 py-1.5 text-sm" />
            <input value={b.url} onChange={(e) => upd(i, { url: e.target.value })} placeholder="Your store URL on this marketplace"
              className="col-span-12 sm:col-span-4 border rounded-lg px-2 py-1.5 text-sm" />
            <div className="col-span-12 sm:col-span-2 flex items-center justify-end gap-2">
              {b.logo && <img src={b.logo} alt="" className="h-8 w-8 object-contain bg-gray-50 rounded p-1" />}
              <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={b.enabled} onChange={(e) => upd(i, { enabled: e.target.checked })} /> On</label>
              <button onClick={() => rm(i)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        <button onClick={add} className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700">
          <Plus size={14} /> Add brand
        </button>
      </div>
    </Card>
  );
}

/* ───────────────────── Empty Cart ───────────────────── */
function EmptyCartSection({ value, onChange }: { value: GrowthBoostersSettings["emptyCart"]; onChange: (v: GrowthBoostersSettings["emptyCart"]) => void }) {
  return (
    <Card title="🛒 Empty Cart Upsell" desc="What customers see when their cart is empty. Pick the products that convert best.">
      <ToggleRow label="Show upsell on empty cart" checked={value.enabled} onChange={(b) => onChange({ ...value, enabled: b })} />
      <div className="grid sm:grid-cols-2 gap-3">
        <FieldRow label="Heading">
          <input value={value.heading} onChange={(e) => onChange({ ...value, heading: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="You might love these" />
        </FieldRow>
        <FieldRow label="CTA button label">
          <input value={value.ctaLabel} onChange={(e) => onChange({ ...value, ctaLabel: e.target.value })}
            className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Add to cart" />
        </FieldRow>
      </div>
      <FieldRow label="Subheading (one line, conversion-friendly)">
        <input value={value.subheading} onChange={(e) => onChange({ ...value, subheading: e.target.value })}
          className="w-full border rounded-xl px-3 py-2 text-sm" placeholder="Hand-picked bestsellers our customers swear by" />
      </FieldRow>

      <ProductPicker
        selectedIds={value.productIds}
        onChange={(ids) => onChange({ ...value, productIds: ids })}
        max={12}
      />
      <p className="text-xs text-gray-500 mt-2">Empty if no products selected — frontend will fall back to trending products automatically.</p>
    </Card>
  );
}

/* ───────────────────── Rating filter ───────────────────── */
function RatingFilterSection({ value, onChange }: { value: GrowthBoostersSettings["ratingFilter"]; onChange: (v: GrowthBoostersSettings["ratingFilter"]) => void }) {
  return (
    <Card title="⭐ Rating-Count Filter" desc="Adds a '4★ & up / 3★ & up' filter on the Products page. Separate from your testimonial section — no impact on it. Useful when you have many reviews.">
      <ToggleRow label="Show rating filter on Products page" checked={value.enabled} onChange={(b) => onChange({ ...value, enabled: b })} />
      <p className="text-xs text-gray-500">
        💡 <b>Independent feature.</b> Testimonial section pulls from <code className="bg-gray-100 px-1 rounded">reviews</code> table; this filter only reads each product's own <code className="bg-gray-100 px-1 rounded">ratings</code> column. Turning this on/off does NOT affect testimonials.
      </p>
    </Card>
  );
}


/* ───────────────────── Reusable bits ───────────────────── */
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5 space-y-3 shadow-sm">
      <div>
        <h2 className="font-black text-lg">{title}</h2>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 bg-gray-50 border rounded-xl px-4 py-2.5 cursor-pointer">
      <span className="text-sm font-bold">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-orange-500" />
    </label>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-600 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function ProductPicker({ selectedIds, onChange, max }: { selectedIds: string[]; onChange: (ids: string[]) => void; max: number }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: products } = useQuery({
    queryKey: ["gb-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id,name,category,images").order("name").limit(500);
      return data || [];
    },
  });
  const list = useMemo(() => (products || []).filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  const selected = useMemo(() => (products || []).filter((p: any) => selectedIds.includes(p.id)), [products, selectedIds]);

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id));
    else if (selectedIds.length < max) onChange([...selectedIds, id]);
  };

  return (
    <div>
      <label className="text-xs font-bold text-gray-600 block mb-1">Products to show ({selected.length}/{max})</label>
      <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] bg-gray-50 border rounded-xl p-2">
        {selected.length === 0 && <span className="text-xs text-gray-400 italic">No products picked yet</span>}
        {selected.map((p: any) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 bg-white border rounded-lg pl-2 pr-1 py-1 text-xs font-semibold">
            {p.images?.[0] && <img src={p.images[0]} alt="" className="w-5 h-5 rounded object-cover" />}
            {p.name}
            <button onClick={() => toggle(p.id)} className="text-gray-400 hover:text-red-500 ml-0.5"><X size={12} /></button>
          </span>
        ))}
      </div>
      <button onClick={() => setOpen(!open)}
        className="text-xs font-bold text-orange-600 hover:text-orange-700 inline-flex items-center gap-1">
        <Plus size={12} /> {open ? "Hide picker" : "Pick products"}
      </button>
      {open && (
        <div className="mt-2 bg-white border rounded-xl p-3">
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {list.map((p: any) => {
              const on = selectedIds.includes(p.id);
              const disabled = !on && selectedIds.length >= max;
              return (
                <button key={p.id} onClick={() => toggle(p.id)} disabled={disabled}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition ${on ? "bg-orange-50 border border-orange-300" : "hover:bg-gray-50"} ${disabled ? "opacity-40" : ""}`}>
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt="" className="w-8 h-8 rounded object-cover" />
                    : <div className="w-8 h-8 rounded bg-gray-100" />}
                  <span className="flex-1 font-semibold truncate">{p.name}</span>
                  <span className="text-[10px] text-gray-400">{p.category}</span>
                  {on && <span className="text-orange-600 font-black">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
