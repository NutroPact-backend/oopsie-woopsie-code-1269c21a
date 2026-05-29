// @ts-nocheck
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Upload, Download, FileSpreadsheet, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Info } from 'lucide-react';
import { TabHelp } from './_TabHelp';

interface ParsedRow {
  rowIndex: number;
  data: Record<string, any>;
  errors: string[];
  warnings: string[];
}

const REQUIRED = ['name', 'slug', 'category', 'price'];
const ALL_FIELDS = [
  'id', 'name', 'slug', 'category', 'description', 'short_description',
  'price', 'compare_price', 'sku', 'brand', 'hsn_code', 'gst_rate',
  'stock_count', 'in_stock', 'is_active', 'is_featured', 'is_new_arrival', 'is_best_seller',
  'weight', 'shipping_weight', 'tags', 'images',
  'ingredients', 'serving_size', 'servings', 'warnings', 'how_to_use',
];

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const toBool = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  if (v === undefined || v === null || v === '') return false;
  const s = String(v).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
};
const toNum = (v: any): number | null => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
};
const toList = (v: any): string[] => {
  if (Array.isArray(v)) return v.map(String).map(s => s.trim()).filter(Boolean);
  if (v === undefined || v === null || v === '') return [];
  return String(v).split(/[|,;\n]/).map(s => s.trim()).filter(Boolean);
};

function normalizeRow(raw: Record<string, any>, rowIndex: number): ParsedRow {
  const errors: string[] = [];
  const warnings: string[] = [];
  const data: Record<string, any> = {};

  // Lowercase + trim keys
  const r: Record<string, any> = {};
  Object.entries(raw).forEach(([k, v]) => { r[k.toString().trim().toLowerCase().replace(/\s+/g, '_')] = v; });

  data.name = (r.name ?? r.product_name ?? '').toString().trim();
  data.slug = (r.slug ?? '').toString().trim() || slugify(data.name);
  data.category = (r.category ?? '').toString().trim();
  data.price = toNum(r.price);
  data.compare_price = toNum(r.compare_price ?? r.mrp);
  data.description = r.description?.toString() || null;
  data.short_description = r.short_description?.toString() || null;
  data.sku = r.sku?.toString().trim() || null;
  data.brand = r.brand?.toString().trim() || 'NutroPact';
  data.hsn_code = (r.hsn_code ?? r.hsn ?? '').toString().trim();
  data.gst_rate = toNum(r.gst_rate ?? r.gst) ?? 0;
  data.stock_count = toNum(r.stock_count ?? r.stock) ?? 0;
  data.in_stock = r.in_stock !== undefined ? toBool(r.in_stock) : (data.stock_count > 0);
  data.is_active = r.is_active !== undefined ? toBool(r.is_active) : true;
  data.is_featured = toBool(r.is_featured);
  data.is_new_arrival = toBool(r.is_new_arrival);
  data.is_best_seller = toBool(r.is_best_seller);
  data.weight = toNum(r.weight);
  data.shipping_weight = toNum(r.shipping_weight);
  data.ingredients = r.ingredients?.toString() || null;
  data.serving_size = r.serving_size?.toString() || null;
  data.servings = toNum(r.servings);
  data.warnings = r.warnings?.toString() || null;
  data.how_to_use = r.how_to_use?.toString() || null;

  const tags = toList(r.tags);
  if (tags.length) data.tags = tags;
  const images = toList(r.images ?? r.image_urls);
  if (images.length) data.images = images.map(url => ({ url }));

  if (r.id) data.id = r.id.toString().trim();

  // Validation
  REQUIRED.forEach(f => {
    if (data[f] === null || data[f] === undefined || data[f] === '') errors.push(`Missing "${f}"`);
  });
  if (data.price !== null && data.price <= 0) errors.push('Price must be > 0');
  if (data.compare_price !== null && data.price !== null && data.compare_price < data.price) {
    warnings.push('compare_price is less than price (no discount shown)');
  }
  if (!data.hsn_code) warnings.push('Missing HSN — invoice may show empty HSN');
  if (!images.length) warnings.push('No images provided');

  // Drop nulls so DB defaults apply
  Object.keys(data).forEach(k => { if (data[k] === null) delete data[k]; });

  return { rowIndex, data, errors, warnings };
}

export default function BulkImportTab() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; updated: number; failed: number; errors: string[] } | null>(null);

  const handleFile = async (file: File) => {
    setResult(null);
    setFileName(file.name);
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
    const parsed = json.map((r, i) => normalizeRow(r, i + 2)); // +2 because row 1 = headers
    setRows(parsed);
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    const sample = [{
      name: 'Sample Whey Protein 1kg',
      slug: 'sample-whey-protein-1kg',
      category: 'protein',
      description: 'Premium whey protein for muscle recovery.',
      short_description: '24g protein per scoop',
      price: 2499,
      compare_price: 2999,
      sku: 'NP-WHY-001',
      brand: 'NutroPact',
      hsn_code: '21069099',
      gst_rate: 18,
      stock_count: 100,
      in_stock: true,
      is_active: true,
      is_featured: false,
      weight: 1,
      shipping_weight: 1.1,
      tags: 'protein|muscle|whey',
      images: 'https://example.com/p1.jpg|https://example.com/p2.jpg',
      ingredients: 'Whey protein concentrate, cocoa, stevia',
      serving_size: '30g',
      servings: 33,
      how_to_use: 'Mix 1 scoop with 250ml water/milk',
    }];
    const ws = XLSX.utils.json_to_sheet(sample, { header: ALL_FIELDS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Products');
    XLSX.writeFile(wb, 'nutropact-products-template.xlsx');
  };

  const runImport = async () => {
    const valid = rows.filter(r => r.errors.length === 0);
    if (valid.length === 0) return;
    setImporting(true);
    const errors: string[] = [];
    let inserted = 0, updated = 0, failed = 0;

    // Process in batches of 50 to avoid timeouts
    for (let i = 0; i < valid.length; i += 50) {
      const batch = valid.slice(i, i + 50);
      for (const row of batch) {
        const payload: any = { ...row.data };
        if (!payload.id) payload.id = payload.slug + '-' + Math.random().toString(36).slice(2, 7);
        const { error, count } = await supabase
          .from('products')
          .upsert(payload, { onConflict: 'id', count: 'exact' });
        if (error) {
          failed++;
          errors.push(`Row ${row.rowIndex} (${row.data.name}): ${error.message}`);
        } else {
          // Heuristic: we don't reliably know insert vs update from upsert; just count as inserted/updated
          if (row.data.id) updated++; else inserted++;
        }
      }
    }
    setImporting(false);
    setResult({ inserted, updated, failed, errors });
  };

  const validCount = rows.filter(r => r.errors.length === 0).length;
  const errorCount = rows.length - validCount;
  const warningCount = rows.filter(r => r.warnings.length > 0).length;

  return (
    <div className="space-y-6">
      <TabHelp topic="bulkImport" />
      <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-sm">
        <div className="flex items-center gap-2 font-bold text-blue-900 mb-2"><Info size={16} /> Bulk Product Import — kaise use karein</div>
        <ol className="list-decimal pl-5 space-y-1 text-blue-900/90 text-xs leading-relaxed">
          <li><b>Download template</b> dabake sample XLSX le lo (saare supported columns ke saath).</li>
          <li>Har row = ek product. <b>Required</b>: name, slug, category, price. (slug khali ho to name se auto-ban jaata hai.)</li>
          <li>Multiple images ya tags ke liye <code className="px-1 bg-white rounded">|</code> (pipe) se separate karo — e.g. <code className="px-1 bg-white rounded">url1|url2|url3</code>.</li>
          <li>Boolean columns: <code className="px-1 bg-white rounded">true/false</code>, <code className="px-1 bg-white rounded">yes/no</code>, ya <code className="px-1 bg-white rounded">1/0</code>.</li>
          <li>Existing product update karna ho to <code className="px-1 bg-white rounded">id</code> column me uska ID daalo. Naya add karna ho to <code className="px-1 bg-white rounded">id</code> khali chhod do.</li>
          <li>Upload karne ke baad <b>preview</b> me row-wise errors/warnings dikhenge. Sirf valid rows import hongi.</li>
          <li>HSN + GST rate fill karna recommend hai — sahi invoice ke liye.</li>
        </ol>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2"><FileSpreadsheet size={20} className="text-orange-500" /> Upload products file</h3>
            <p className="text-xs text-gray-500 mt-1">.xlsx, .xls or .csv (max ~5MB recommended)</p>
          </div>
          <button onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 hover:text-orange-700 border border-orange-200 hover:bg-orange-50 px-3 py-2 rounded-lg">
            <Download size={14} /> Download template
          </button>
        </div>

        <label className="block border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl p-8 text-center cursor-pointer transition">
          <Upload size={28} className="mx-auto text-gray-400 mb-2" />
          <p className="font-bold text-sm">{fileName ? fileName : 'Choose a file or drop here'}</p>
          <p className="text-xs text-gray-500 mt-1">CSV, XLSX or XLS</p>
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </label>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <h3 className="text-lg font-black">Preview ({rows.length} rows)</h3>
            <div className="flex gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 font-bold">
                <CheckCircle2 size={12} /> {validCount} valid
              </span>
              {warningCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-bold">
                  <AlertTriangle size={12} /> {warningCount} warnings
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 font-bold">
                  <X size={12} /> {errorCount} with errors
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-left">Slug</th>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-right">Price</th>
                  <th className="px-2 py-2 text-right">Stock</th>
                  <th className="px-2 py-2 text-left">Issues</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(r => {
                  const ok = r.errors.length === 0;
                  return (
                    <tr key={r.rowIndex} className={ok ? '' : 'bg-red-50/30'}>
                      <td className="px-2 py-1.5 text-gray-400">{r.rowIndex}</td>
                      <td className="px-2 py-1.5">
                        {ok
                          ? <span className="text-green-600 font-bold">OK</span>
                          : <span className="text-red-600 font-bold">ERR</span>}
                      </td>
                      <td className="px-2 py-1.5 font-semibold">{r.data.name || <em className="text-gray-400">—</em>}</td>
                      <td className="px-2 py-1.5 text-gray-500">{r.data.slug}</td>
                      <td className="px-2 py-1.5 text-gray-500">{r.data.category}</td>
                      <td className="px-2 py-1.5 text-right">{r.data.price ?? '—'}</td>
                      <td className="px-2 py-1.5 text-right">{r.data.stock_count ?? 0}</td>
                      <td className="px-2 py-1.5 text-[10px]">
                        {r.errors.map((e, i) => <div key={i} className="text-red-600">• {e}</div>)}
                        {r.warnings.map((w, i) => <div key={i} className="text-amber-600">⚠ {w}</div>)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
            <p className="text-xs text-gray-500">Only valid rows will be imported. Errors are skipped.</p>
            <button onClick={runImport} disabled={importing || validCount === 0}
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-2.5 rounded-xl text-sm disabled:opacity-50 transition">
              {importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : <>Import {validCount} valid rows</>}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className={`rounded-2xl border p-5 ${result.failed === 0 ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <h3 className="font-black mb-2">Import complete</h3>
          <p className="text-sm">
            ✅ {result.inserted} inserted · 🔄 {result.updated} updated · ❌ {result.failed} failed
          </p>
          {result.errors.length > 0 && (
            <details className="mt-3">
              <summary className="text-xs font-bold cursor-pointer">Show errors ({result.errors.length})</summary>
              <ul className="mt-2 text-xs space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i} className="text-red-700">• {e}</li>)}
              </ul>
            </details>
          )}
          <button onClick={() => { setRows([]); setResult(null); setFileName(''); }}
            className="mt-3 text-xs font-bold text-gray-600 underline">Start over</button>
        </div>
      )}
    </div>
  );
}
