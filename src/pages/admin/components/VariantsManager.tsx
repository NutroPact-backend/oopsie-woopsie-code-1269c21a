// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Sparkles, Upload, Star, RotateCw, ChevronDown, ChevronUp, X as XIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFlavors, useSizes, fetchVariants, type ProductVariant } from '@/hooks/useMasterData';
import { useSimpleUpload } from '@/lib/useSimpleUpload';

/**
 * Big-brand variant matrix manager.
 * Picks flavors + sizes from master lists → builds matrix → per-row SKU/price/stock/image.
 * Saves to product_variants table AND mirrors a compact JSON shape into products.variants
 * (and products.flavors/sizes) so the existing PDP keeps working without refactor.
 */

export interface VariantRow {
  id?: string;
  flavor_id: string | null;
  size_id: string | null;
  flavor_name: string;
  size_name: string;
  sku: string;
  price: number;
  compare_price: number;
  stock: number;
  image_url: string;
  images: string[];
  description: string;
  highlights: string[];
  weight_grams: number;
  is_default: boolean;
  active: boolean;
}

interface Props {
  productId?: string;             // undefined → new product (in-memory only until parent saves)
  productName: string;
  basePrice: number;
  baseComparePrice: number;
  variants: VariantRow[];
  onChange: (rows: VariantRow[]) => void;
  selectedFlavorIds: string[];
  selectedSizeIds: string[];
  onFlavorsChange: (ids: string[]) => void;
  onSizesChange: (ids: string[]) => void;
  onValidityChange?: (valid: boolean) => void;
}

const skuify = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 32);

export default function VariantsManager(props: Props) {
  const { productId, productName, basePrice, baseComparePrice, variants, onChange,
          selectedFlavorIds, selectedSizeIds, onFlavorsChange, onSizesChange, onValidityChange } = props;
  const { data: flavors } = useFlavors();
  const { data: sizes } = useSizes();
  const { uploadFile, isUploading } = useSimpleUpload();
  const [bulkPrice, setBulkPrice] = useState<string>('');
  const [bulkStock, setBulkStock] = useState<string>('');
  const [loadingDb, setLoadingDb] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const toggleExpand = (i: number) => setExpanded(e => ({ ...e, [i]: !e[i] }));

  // On mount with existing product, hydrate from DB (only if parent hasn't pre-populated)
  useEffect(() => {
    if (!productId || variants.length > 0) return;
    setLoadingDb(true);
    fetchVariants(productId).then(rows => {
      onChange(rows.map(toRow));
      onFlavorsChange(Array.from(new Set(rows.map(r => r.flavor_id).filter(Boolean) as string[])));
      onSizesChange(Array.from(new Set(rows.map(r => r.size_id).filter(Boolean) as string[])));
    }).catch(() => {}).finally(() => setLoadingDb(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const flavorMap = useMemo(() => Object.fromEntries(flavors.map(f => [f.id, f])), [flavors]);
  const sizeMap = useMemo(() => Object.fromEntries(sizes.map(s => [s.id, s])), [sizes]);
  const variantKey = (fId: string | null, sId: string | null) => `${fId || ''}::${sId || ''}`;

  // Detect duplicate SKUs (case-insensitive, trimmed). Empty SKUs ignored — autosynced on save.
  const dupSkus = useMemo(() => {
    const counts = new Map<string, number>();
    variants.forEach(v => {
      const k = (v.sku || '').trim().toUpperCase();
      if (!k) return;
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, n]) => n > 1).map(([k]) => k));
  }, [variants]);
  const hasDupes = dupSkus.size > 0;
  useEffect(() => { onValidityChange?.(!hasDupes); }, [hasDupes, onValidityChange]);

  /** Rebuild matrix preserving existing rows where combo matches */
  const rebuildMatrix = () => {
    const fIds = selectedFlavorIds.length ? selectedFlavorIds : [null];
    const sIds = selectedSizeIds.length ? selectedSizeIds : [null];
    const existing = Object.fromEntries(variants.map(v => [variantKey(v.flavor_id, v.size_id), v]));
    const matrix: VariantRow[] = [];
    for (const fId of fIds) {
      for (const sId of sIds) {
        const key = variantKey(fId, sId);
        if (existing[key]) { matrix.push(existing[key]); continue; }
        const fName = fId ? flavorMap[fId]?.name || '' : '';
        const sName = sId ? sizeMap[sId]?.name || '' : '';
        matrix.push({
          flavor_id: fId, size_id: sId, flavor_name: fName, size_name: sName,
          sku: autoSku(productName, fName, sName),
          price: basePrice || 0, compare_price: baseComparePrice || 0,
          stock: 50, image_url: '', images: [], description: '', highlights: [],
          weight_grams: sId ? sizeMap[sId]?.value_grams || 0 : 0,
          is_default: matrix.length === 0, active: true,
        });
      }
    }
    onChange(matrix);
  };

  const toggle = (kind: 'flavor' | 'size', id: string) => {
    const arr = kind === 'flavor' ? selectedFlavorIds : selectedSizeIds;
    const setter = kind === 'flavor' ? onFlavorsChange : onSizesChange;
    setter(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);
  };

  const updateRow = (idx: number, patch: Partial<VariantRow>) => {
    const next = variants.slice();
    next[idx] = { ...next[idx], ...patch };
    if (patch.is_default) next.forEach((r, i) => { if (i !== idx) r.is_default = false; });
    onChange(next);
  };
  const removeRow = (idx: number) => onChange(variants.filter((_, i) => i !== idx));
  const addImageToRow = async (idx: number, file: File) => {
    const url = await uploadFile(file);
    if (!url) return;
    const row = variants[idx];
    const next = [...(row.images || []), url];
    updateRow(idx, { images: next, image_url: row.image_url || url });
  };
  const removeImageFromRow = (idx: number, imgIdx: number) => {
    const row = variants[idx];
    const next = (row.images || []).filter((_, j) => j !== imgIdx);
    updateRow(idx, { images: next, image_url: next[0] || '' });
  };
  const applyBulkPrice = () => { const v = Number(bulkPrice); if (!v) return; onChange(variants.map(r => ({ ...r, price: v }))); };
  const applyBulkStock = () => { const v = Number(bulkStock); if (bulkStock === '') return; onChange(variants.map(r => ({ ...r, stock: v }))); };
  const regenSkus = () => onChange(variants.map(r => ({ ...r, sku: autoSku(productName, r.flavor_name, r.size_name) })));

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
        <strong>How it works:</strong> Pick flavors & sizes from the master lists below → click <em>Build matrix</em> → fill price/stock per variant.
        Each combination becomes its own SKU (e.g. <code className="bg-white px-1 rounded">PROT-CHOC-1KG</code>).
        Manage master flavors/sizes in <strong>Catalog → Flavors / Sizes</strong>.
      </div>

      {hasDupes && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-xs text-red-800 font-bold">
          ⚠ {dupSkus.size} duplicate SKU{dupSkus.size > 1 ? 's' : ''} detected: <span className="font-mono">{Array.from(dupSkus).join(', ')}</span>. Each variant needs a unique SKU before saving.
        </div>
      )}


      {/* Flavor picker */}
      <div>
        <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-500">Flavors available for this product</label><span className="text-xs text-gray-400">{selectedFlavorIds.length} selected</span></div>
        <div className="flex flex-wrap gap-2">
          {flavors.length === 0 && <p className="text-xs text-gray-400">No flavors in master list — add in <strong>Catalog → Flavors</strong>.</p>}
          {flavors.map(f => {
            const on = selectedFlavorIds.includes(f.id);
            return (
              <button key={f.id} type="button" onClick={() => toggle('flavor', f.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${on ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: f.hex_color }} /> {f.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size picker */}
      <div>
        <div className="flex items-center justify-between mb-2"><label className="text-xs font-bold text-gray-500">Sizes available for this product</label><span className="text-xs text-gray-400">{selectedSizeIds.length} selected</span></div>
        <div className="flex flex-wrap gap-2">
          {sizes.length === 0 && <p className="text-xs text-gray-400">No sizes in master list — add in <strong>Catalog → Sizes</strong>.</p>}
          {sizes.map(s => {
            const on = selectedSizeIds.includes(s.id);
            return (
              <button key={s.id} type="button" onClick={() => toggle('size', s.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition ${on ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}>
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button type="button" onClick={rebuildMatrix} className="inline-flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl text-xs"><Sparkles size={14} /> Build / refresh matrix</button>
        {variants.length > 0 && <button type="button" onClick={regenSkus} className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs"><RotateCw size={13} /> Re-generate SKUs</button>}
        {variants.length > 0 && (
          <>
            <div className="flex items-center gap-1 ml-auto">
              <input value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} type="number" placeholder="Bulk ₹" className="w-24 border rounded-lg px-2 py-1.5 text-xs" />
              <button type="button" onClick={applyBulkPrice} className="px-2 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">Apply price</button>
            </div>
            <div className="flex items-center gap-1">
              <input value={bulkStock} onChange={e => setBulkStock(e.target.value)} type="number" placeholder="Bulk stock" className="w-24 border rounded-lg px-2 py-1.5 text-xs" />
              <button type="button" onClick={applyBulkStock} className="px-2 py-1.5 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded-lg">Apply stock</button>
            </div>
          </>
        )}
      </div>

      {loadingDb && <p className="text-xs text-gray-400">Loading variants…</p>}

      {variants.length > 0 ? (
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs border-separate border-spacing-y-1">
            <thead className="text-[10px] uppercase text-gray-400">
              <tr>
                <th className="text-left px-2">Default</th>
                <th className="text-left px-2">Variant</th>
                <th className="text-left px-2">SKU</th>
                <th className="text-right px-2">Price ₹</th>
                <th className="text-right px-2">MRP ₹</th>
                <th className="text-right px-2">Stock</th>
                <th className="px-2">Image</th>
                <th className="px-2">Active</th>
                <th className="px-2"></th>
              </tr>
            </thead>
            <tbody>
              {variants.map((row, i) => {
                const skuKey = (row.sku || '').trim().toUpperCase();
                const isDup = !!skuKey && dupSkus.has(skuKey);
                return (
                <>
                <tr key={i} className={`bg-white border ${isDup ? 'border-red-300' : 'border-gray-100'}`}>
                  <td className="px-2 text-center"><input type="radio" name="default-variant" checked={row.is_default} onChange={() => updateRow(i, { is_default: true })} /></td>
                  <td className="px-2 py-2">
                    <div className="font-bold">{[row.flavor_name, row.size_name].filter(Boolean).join(' · ') || <span className="text-gray-300">—</span>}</div>
                    {isDup && <div className="text-[10px] text-red-600 font-bold mt-0.5">Duplicate SKU — must be unique</div>}
                  </td>
                  <td className="px-2"><input value={row.sku} onChange={e => updateRow(i, { sku: e.target.value })} className={`w-32 border rounded-lg px-2 py-1.5 text-xs font-mono ${isDup ? 'border-red-400 bg-red-50 text-red-700' : ''}`} /></td>
                  <td className="px-2"><input type="number" value={row.price} onChange={e => updateRow(i, { price: Number(e.target.value) })} className="w-20 border rounded-lg px-2 py-1.5 text-xs text-right" /></td>
                  <td className="px-2"><input type="number" value={row.compare_price} onChange={e => updateRow(i, { compare_price: Number(e.target.value) })} className="w-20 border rounded-lg px-2 py-1.5 text-xs text-right" /></td>
                  <td className="px-2"><input type="number" value={row.stock} onChange={e => updateRow(i, { stock: Number(e.target.value) })} className={`w-16 border rounded-lg px-2 py-1.5 text-xs text-right ${row.stock <= 0 ? 'border-red-300 bg-red-50' : row.stock < 10 ? 'border-amber-300 bg-amber-50' : ''}`} /></td>
                  <td className="px-2">
                    <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                      {(row.images || []).map((img, j) => (
                        <div key={j} className="relative group">
                          <img src={img} alt="" className={`w-8 h-8 object-cover rounded border ${j === 0 ? 'border-orange-400' : 'border-gray-200'}`} />
                          <button type="button" onClick={() => removeImageFromRow(i, j)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" title="Remove image"><XIcon size={8} /></button>
                        </div>
                      ))}
                      <label className="px-1.5 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center" title="Add image(s)">
                        {isUploading ? '…' : <Upload size={11} />}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={async e => { const files = Array.from(e.target.files || []); for (const f of files) await addImageToRow(i, f); e.currentTarget.value = ''; }} />
                      </label>
                    </div>
                    {(row.images?.length || 0) > 0 && <div className="text-[9px] text-gray-400 mt-0.5">{row.images.length} img · first = main</div>}
                  </td>
                  <td className="px-2 text-center"><input type="checkbox" checked={row.active} onChange={e => updateRow(i, { active: e.target.checked })} /></td>
                  <td className="px-2 whitespace-nowrap">
                    <button type="button" onClick={() => toggleExpand(i)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg" title="Per-variant description / highlights overrides">
                      {expanded[i] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                    <button type="button" onClick={() => removeRow(i)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={13} /></button>
                  </td>
                </tr>
                {expanded[i] && (
                  <tr key={`${i}-x`} className="bg-orange-50/40">
                    <td colSpan={9} className="px-3 py-3">
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500">Description override (optional)</label>
                          <textarea value={row.description} onChange={e => updateRow(i, { description: e.target.value })}
                            rows={4} placeholder="Leave blank to inherit the main product description. Set this only if this flavor/size needs its own copy."
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-xs" />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase text-gray-500">Highlights override (one per line)</label>
                          <textarea value={(row.highlights || []).join('\n')} onChange={e => updateRow(i, { highlights: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                            rows={4} placeholder={'24g protein per scoop\nNo added sugar\nMade in India'}
                            className="w-full mt-1 border rounded-lg px-2 py-1.5 text-xs font-mono" />
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">💡 When this variant is selected on the product page, its gallery images lead, and description / highlights swap to these overrides (if set).</p>
                    </td>
                  </tr>
                )}
                </>
                );
              })}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1"><Star size={11} className="text-orange-400 fill-orange-400" /> Default variant is what shows first on the product page.</p>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400 text-sm">
          <p>No variants yet. Pick flavors/sizes above and click <strong className="text-gray-700">Build matrix</strong>.</p>
          <p className="text-xs mt-1">Single-variant products: leave both empty and click Build — a single default variant will be created.</p>
        </div>
      )}
    </div>
  );
}

function autoSku(productName: string, flavor: string, size: string) {
  const p = skuify(productName).split('-').slice(0, 2).join('-');
  const parts = [p, skuify(flavor).slice(0, 6), skuify(size)].filter(Boolean);
  return parts.join('-');
}

function toRow(v: ProductVariant): VariantRow {
  const d = (v.data || {}) as { gallery_images?: string[]; description?: string; highlights?: string[] };
  const gallery = Array.isArray(d.gallery_images) ? d.gallery_images : [];
  const images = gallery.length ? gallery : (v.image_url ? [v.image_url] : []);
  return {
    id: v.id, flavor_id: v.flavor_id, size_id: v.size_id,
    flavor_name: v.flavor_name, size_name: v.size_name,
    sku: v.sku, price: Number(v.price), compare_price: Number(v.compare_price || 0),
    stock: v.stock, image_url: v.image_url || images[0] || '',
    images, description: d.description || '', highlights: Array.isArray(d.highlights) ? d.highlights : [],
    weight_grams: Number(v.weight_grams || 0),
    is_default: v.is_default, active: v.active,
  };
}

/**
 * After product is saved, persist variants to product_variants table.
 * Returns the compact jsonb to mirror into products.variants for PDP backward-compat.
 */
export async function syncVariantsToDb(productId: string, rows: VariantRow[]) {
  // Server-side dup-SKU guard (in case caller skipped UI validation)
  const seen = new Map<string, number>();
  rows.forEach(r => {
    const k = (r.sku || '').trim().toUpperCase();
    if (!k) return;
    seen.set(k, (seen.get(k) || 0) + 1);
  });
  const dupes = Array.from(seen.entries()).filter(([, n]) => n > 1).map(([k]) => k);
  if (dupes.length) throw new Error(`Duplicate SKUs: ${dupes.join(', ')}`);

  // Delete removed rows
  const keepIds = rows.map(r => r.id).filter(Boolean) as string[];
  if (keepIds.length > 0) {
    await supabase.from('product_variants').delete().eq('product_id', productId).not('id', 'in', `(${keepIds.join(',')})`);
  } else {
    await supabase.from('product_variants').delete().eq('product_id', productId);
  }
  // Upsert each
  for (const r of rows) {
    const payload = {
      product_id: productId, sku: r.sku || `${productId.slice(0, 6)}-${Math.random().toString(36).slice(2, 6)}`.toUpperCase(),
      flavor_id: r.flavor_id, size_id: r.size_id,
      flavor_name: r.flavor_name, size_name: r.size_name,
      price: r.price, compare_price: r.compare_price, stock: r.stock,
      image_url: r.image_url || r.images?.[0] || '', weight_grams: r.weight_grams,
      data: {
        gallery_images: r.images || [],
        description: r.description || '',
        highlights: r.highlights || [],
      },
      is_default: r.is_default, active: r.active,
    };
    if (r.id) await supabase.from('product_variants').update(payload).eq('id', r.id);
    else await supabase.from('product_variants').insert(payload);
  }

  // Roll product-level stock = sum of active variant stock → keeps listing page variant-aware
  const totalStock = rows.filter(r => r.active).reduce((s, r) => s + (Number(r.stock) || 0), 0);
  await supabase.from('products').update({
    stock: totalStock,
  }).eq('id', productId);
}

/** Compact shape used by ProductPage.tsx (flavor/size lookup) */
export function variantsToJson(rows: VariantRow[]) {
  return rows.filter(r => r.active).map(r => ({
    sku: r.sku, flavor: r.flavor_name, size: r.size_name,
    price: r.price, comparePrice: r.compare_price, stock: r.stock,
    image: r.image_url || r.images?.[0] || '',
    images: r.images || [],
    description: r.description || '',
    highlights: r.highlights || [],
    isDefault: r.is_default,
  }));
}
