// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Download, RefreshCw, X, FileSpreadsheet } from 'lucide-react';
import { gstr1B2cSummary, gstr3bSummary, hsnSummary, type InvoiceRow } from '@/lib/gstr';
import { TabHelp } from './_TabHelp';

type Product = { id: string; name: string; hsn_code: string | null; gst_rate: number };
type PurchaseItem = { product_id: string; product_name: string; hsn_code: string; qty: number; unit_cost: number; gst_rate: number };
type Purchase = {
  id: string; purchase_number: string; supplier_name: string; supplier_gstin: string; supplier_state_code: string;
  invoice_number: string; invoice_date: string | null; subtotal: number; cgst: number; sgst: number; igst: number;
  total: number; status: string; created_at: string;
};

type SalesRow = { period: string; invoice_number: string; order_number: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; issued_at: string };
type PurchRow = { period: string; purchase_number: string; invoice_number: string; supplier_name: string; supplier_gstin: string; taxable: number; cgst: number; sgst: number; igst: number; total: number; invoice_date: string };

export default function AccountingTab() {
  const [view, setView] = useState<'purchases' | 'sales-register' | 'purchase-register' | 'summary'>('purchases');
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<SalesRow[]>([]);
  const [purchReg, setPurchReg] = useState<PurchRow[]>([]);
  const [sellerState, setSellerState] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<null | { items: PurchaseItem[]; meta: Partial<Purchase> }>(null);
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

  async function loadAll() {
    setLoading(true);
    const [{ data: p }, { data: pr }, { data: ss }, { data: sr }, { data: prr }] = await Promise.all([
      supabase.from('products').select('id,name,hsn_code,gst_rate').order('name'),
      supabase.from('purchases').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('site_settings').select('settings').eq('key', 'default').maybeSingle(),
      supabase.from('gst_sales_register').select('*').order('issued_at', { ascending: false }).limit(500),
      supabase.from('gst_purchase_register').select('*').order('invoice_date', { ascending: false }).limit(500),
    ]);
    setProducts((p as Product[]) || []);
    setPurchases((pr as Purchase[]) || []);
    setSales((sr as SalesRow[]) || []);
    setPurchReg((prr as PurchRow[]) || []);
    setSellerState(((ss as any)?.settings?.invoicing?.stateCode || (ss as any)?.settings?.stateCode || '').toString());
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const summary = useMemo(() => {
    const sP = sales.filter(s => s.period === period);
    const pP = purchReg.filter(p => p.period === period);
    const outTax = sP.reduce((s, r) => s + Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0), 0);
    const inTax = pP.reduce((s, r) => s + Number(r.cgst || 0) + Number(r.sgst || 0) + Number(r.igst || 0), 0);
    return {
      salesTaxable: sP.reduce((s, r) => s + Number(r.taxable || 0), 0),
      salesTotal: sP.reduce((s, r) => s + Number(r.total || 0), 0),
      purchTaxable: pP.reduce((s, r) => s + Number(r.taxable || 0), 0),
      purchTotal: pP.reduce((s, r) => s + Number(r.total || 0), 0),
      outputTax: outTax, inputTax: inTax, netPayable: outTax - inTax,
    };
  }, [sales, purchReg, period]);

  function exportCsv(rows: any[], name: string) {
    if (!rows.length) { alert('Nothing to export for this period'); return; }
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `${name}-${period}.csv`; a.click();
  }

  const [exporting, setExporting] = useState(false);
  async function downloadGstrReport(kind: 'gstr1-b2c' | 'gstr3b' | 'hsn') {
    setExporting(true);
    try {
      const [y, m] = period.split('-').map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
      const end = new Date(Date.UTC(y, m, 1)).toISOString();
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number, order_number, issued_at, snapshot')
        .gte('issued_at', start).lt('issued_at', end)
        .limit(1000);
      if (error) { alert(error.message); setExporting(false); return; }
      const rows = (data || []) as InvoiceRow[];
      if (kind === 'gstr1-b2c') exportCsv(gstr1B2cSummary(rows), 'gstr1-b2c');
      else if (kind === 'gstr3b') exportCsv(gstr3bSummary(rows), 'gstr3b');
      else exportCsv(hsnSummary(rows), 'hsn-summary');
    } catch (e: any) { alert(e?.message || 'Export failed'); }
    setExporting(false);
  }

  function openNewPurchase() {
    setModal({ items: [], meta: { supplier_name: '', supplier_gstin: '', supplier_state_code: '', invoice_number: '', invoice_date: new Date().toISOString().slice(0, 10) } });
  }

  function addLine() {
    if (!modal) return;
    setModal({ ...modal, items: [...modal.items, { product_id: '', product_name: '', hsn_code: '', qty: 1, unit_cost: 0, gst_rate: 0 }] });
  }

  function updateLine(i: number, patch: Partial<PurchaseItem>) {
    if (!modal) return;
    const items = modal.items.slice();
    items[i] = { ...items[i], ...patch };
    setModal({ ...modal, items });
  }

  function pickProduct(i: number, pid: string) {
    const p = products.find(x => x.id === pid);
    if (!p) return;
    updateLine(i, { product_id: p.id, product_name: p.name, hsn_code: p.hsn_code || '', gst_rate: Number(p.gst_rate) || 0 });
  }

  const modalTotals = useMemo(() => {
    if (!modal) return { sub: 0, cgst: 0, sgst: 0, igst: 0, total: 0 };
    const sameState = sellerState && modal.meta.supplier_state_code && sellerState === modal.meta.supplier_state_code;
    let sub = 0, cgst = 0, sgst = 0, igst = 0;
    for (const it of modal.items) {
      const taxable = (it.qty || 0) * (it.unit_cost || 0);
      const tax = taxable * ((it.gst_rate || 0) / 100);
      sub += taxable;
      if (sameState) { cgst += tax / 2; sgst += tax / 2; } else { igst += tax; }
    }
    return { sub: r2(sub), cgst: r2(cgst), sgst: r2(sgst), igst: r2(igst), total: r2(sub + cgst + sgst + igst) };
  }, [modal, sellerState]);

  async function savePurchase() {
    if (!modal || modal.items.length === 0) return;
    const sameState = sellerState && modal.meta.supplier_state_code && sellerState === modal.meta.supplier_state_code;
    const purchaseNumber = `PO-${Date.now()}`;
    const { data: ph, error } = await supabase.from('purchases').insert({
      purchase_number: purchaseNumber,
      supplier_name: modal.meta.supplier_name || '',
      supplier_gstin: modal.meta.supplier_gstin || '',
      supplier_state_code: modal.meta.supplier_state_code || '',
      invoice_number: modal.meta.invoice_number || '',
      invoice_date: modal.meta.invoice_date || null,
      subtotal: modalTotals.sub, cgst: modalTotals.cgst, sgst: modalTotals.sgst, igst: modalTotals.igst, total: modalTotals.total,
      status: 'received',
    }).select('id').single();
    if (error || !ph) { alert(error?.message || 'Save failed'); return; }
    const items = modal.items.filter(it => it.product_id && it.qty > 0).map(it => {
      const taxable = it.qty * it.unit_cost;
      const tax = taxable * (it.gst_rate / 100);
      return {
        purchase_id: ph.id, product_id: it.product_id, product_name: it.product_name, hsn_code: it.hsn_code,
        qty: it.qty, unit_cost: it.unit_cost, gst_rate: it.gst_rate, taxable: r2(taxable),
        cgst: sameState ? r2(tax / 2) : 0, sgst: sameState ? r2(tax / 2) : 0, igst: sameState ? 0 : r2(tax),
        line_total: r2(taxable + tax),
      };
    });
    await supabase.from('purchase_items').insert(items);
    setModal(null); loadAll();
  }

  async function deletePurchase(id: string) {
    if (!confirm('Delete this purchase? Stock will NOT be auto-reversed — adjust manually if needed.')) return;
    await supabase.from('purchases').delete().eq('id', id);
    loadAll();
  }

  return (
    <div className="space-y-5">
      <TabHelp topic="accounting" />
      <div className="flex items-center gap-2 flex-wrap">
        {([['purchases', 'Purchases'], ['sales-register', 'GST Sales Register'], ['purchase-register', 'GST Purchase Register'], ['summary', 'GST Summary']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k as any)} className={`px-3 py-2 rounded-lg text-sm border ${view === k ? 'bg-gray-900 text-white border-gray-900' : 'bg-white'}`}>{l}</button>
        ))}
        <button onClick={loadAll} className="ml-auto inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      {view !== 'purchases' && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">Period</label>
          <input type="month" value={period} onChange={e => setPeriod(e.target.value)} className="border rounded-lg px-2 py-1 text-sm" />
          {sellerState ? <span className="text-xs text-gray-500">Seller state code: <b>{sellerState}</b></span> : <span className="text-xs text-amber-600">Set seller State Code in Site Settings → GST & Invoicing</span>}
        </div>
      )}

      {view === 'purchases' && (
        <>
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Purchases (auto-increments stock + builds input GST register)</h3>
            <button onClick={openNewPurchase} className="inline-flex items-center gap-1 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm"><Plus size={14} /> New Purchase</button>
          </div>
          <div className="bg-white border rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr><th className="text-left p-3">#</th><th className="text-left p-3">Supplier</th><th className="text-left p-3">Invoice</th><th className="text-right p-3">Taxable</th><th className="text-right p-3">Tax</th><th className="text-right p-3">Total</th><th></th></tr>
              </thead>
              <tbody className="divide-y">
                {loading ? <tr><td colSpan={7} className="p-6 text-center text-gray-500">Loading…</td></tr> :
                  purchases.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-gray-500">No purchases yet.</td></tr> :
                  purchases.map(p => (
                    <tr key={p.id}>
                      <td className="p-3 text-xs"><div className="font-mono">{p.purchase_number}</div><div className="text-gray-500">{new Date(p.created_at).toLocaleDateString('en-IN')}</div></td>
                      <td className="p-3"><div className="font-medium">{p.supplier_name || '—'}</div><div className="text-xs text-gray-500">{p.supplier_gstin}</div></td>
                      <td className="p-3 text-xs">{p.invoice_number || '—'}<br /><span className="text-gray-500">{p.invoice_date || ''}</span></td>
                      <td className="p-3 text-right font-mono">₹{Number(p.subtotal).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono text-xs">₹{(Number(p.cgst) + Number(p.sgst) + Number(p.igst)).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-mono font-semibold">₹{Number(p.total).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right"><button onClick={() => deletePurchase(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={14} /></button></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === 'sales-register' && (
        <RegisterTable rows={sales.filter(s => s.period === period)} columns={['invoice_number', 'order_number', 'taxable', 'cgst', 'sgst', 'igst', 'total']} onExport={() => exportCsv(sales.filter(s => s.period === period), 'gst-sales')} />
      )}
      {view === 'purchase-register' && (
        <RegisterTable rows={purchReg.filter(p => p.period === period)} columns={['purchase_number', 'invoice_number', 'supplier_name', 'supplier_gstin', 'taxable', 'cgst', 'sgst', 'igst', 'total']} onExport={() => exportCsv(purchReg.filter(p => p.period === period), 'gst-purchases')} />
      )}
      {view === 'summary' && (
        <div className="grid md:grid-cols-2 gap-4">
          <SummaryCard title="Output (Sales)" rows={[
            ['Taxable sales', summary.salesTaxable],
            ['Total invoiced', summary.salesTotal],
            ['Output GST', summary.outputTax],
          ]} />
          <SummaryCard title="Input (Purchases)" rows={[
            ['Taxable purchases', summary.purchTaxable],
            ['Total spent', summary.purchTotal],
            ['Input GST credit', summary.inputTax],
          ]} />
          <div className="md:col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 border rounded-2xl p-5">
            <div className="text-sm text-gray-600">Net GST Payable for {period}</div>
            <div className={`text-3xl font-bold mt-1 ${summary.netPayable < 0 ? 'text-green-700' : 'text-amber-700'}`}>₹{Math.abs(summary.netPayable).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
            <div className="text-xs text-gray-500 mt-1">{summary.netPayable < 0 ? 'Refund / carry-forward credit available' : 'Pay this amount via GSTR-3B'}</div>
          </div>
          <div className="md:col-span-2 bg-white border rounded-2xl p-5 space-y-3">
            <div>
              <h3 className="font-semibold text-sm">GST Return Downloads</h3>
              <p className="text-xs text-gray-500">CSV files for {period} — upload to GST portal or share with your CA.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button disabled={exporting} onClick={() => downloadGstrReport('gstr1-b2c')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 text-sm font-semibold disabled:opacity-50">
                <FileSpreadsheet size={14} /> GSTR-1 (B2C Summary)
              </button>
              <button disabled={exporting} onClick={() => downloadGstrReport('gstr3b')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 text-sm font-semibold disabled:opacity-50">
                <FileSpreadsheet size={14} /> GSTR-3B Summary
              </button>
              <button disabled={exporting} onClick={() => downloadGstrReport('hsn')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 text-sm font-semibold disabled:opacity-50">
                <FileSpreadsheet size={14} /> HSN Summary
              </button>
            </div>
            <p className="text-[11px] text-gray-400">Aggregated from issued invoices in the selected month. To export B2B (with GSTIN) separately, use admin → invoices.</p>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">New Purchase</h3>
              <button onClick={() => setModal(null)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="Supplier name" value={modal.meta.supplier_name || ''} onChange={v => setModal({ ...modal, meta: { ...modal.meta, supplier_name: v } })} />
              <Field label="Supplier GSTIN" value={modal.meta.supplier_gstin || ''} onChange={v => setModal({ ...modal, meta: { ...modal.meta, supplier_gstin: v } })} />
              <Field label="Supplier state code (e.g. 27)" value={modal.meta.supplier_state_code || ''} onChange={v => setModal({ ...modal, meta: { ...modal.meta, supplier_state_code: v } })} />
              <Field label="Invoice #" value={modal.meta.invoice_number || ''} onChange={v => setModal({ ...modal, meta: { ...modal.meta, invoice_number: v } })} />
              <Field label="Invoice date" type="date" value={modal.meta.invoice_date || ''} onChange={v => setModal({ ...modal, meta: { ...modal.meta, invoice_date: v } })} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-sm">Items</h4>
                <button onClick={addLine} className="text-xs px-2 py-1 border rounded inline-flex items-center gap-1"><Plus size={12} /> Add item</button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50"><tr><th className="text-left p-2">Product</th><th className="p-2">HSN</th><th className="p-2">Qty</th><th className="p-2">Unit cost</th><th className="p-2">GST%</th><th className="p-2">Total</th><th></th></tr></thead>
                  <tbody className="divide-y">
                    {modal.items.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 p-3">No items.</td></tr>}
                    {modal.items.map((it, i) => {
                      const lt = (it.qty || 0) * (it.unit_cost || 0) * (1 + (it.gst_rate || 0) / 100);
                      return (
                        <tr key={i}>
                          <td className="p-1">
                            <select className="border rounded px-1 py-1 w-full text-xs" value={it.product_id} onChange={e => pickProduct(i, e.target.value)}>
                              <option value="">— pick —</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="p-1"><input className="border rounded px-1 py-1 w-20 text-xs" value={it.hsn_code} onChange={e => updateLine(i, { hsn_code: e.target.value })} /></td>
                          <td className="p-1"><input type="number" className="border rounded px-1 py-1 w-16 text-xs text-right" value={it.qty} onChange={e => updateLine(i, { qty: parseInt(e.target.value) || 0 })} /></td>
                          <td className="p-1"><input type="number" step="0.01" className="border rounded px-1 py-1 w-24 text-xs text-right" value={it.unit_cost} onChange={e => updateLine(i, { unit_cost: parseFloat(e.target.value) || 0 })} /></td>
                          <td className="p-1"><input type="number" step="0.01" className="border rounded px-1 py-1 w-14 text-xs text-right" value={it.gst_rate} onChange={e => updateLine(i, { gst_rate: parseFloat(e.target.value) || 0 })} /></td>
                          <td className="p-1 text-right font-mono">₹{lt.toFixed(2)}</td>
                          <td className="p-1 text-right"><button onClick={() => setModal({ ...modal, items: modal.items.filter((_, x) => x !== i) })}><Trash2 size={12} className="text-red-500" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 text-sm text-right space-y-0.5">
                <div>Taxable: <b>₹{modalTotals.sub.toFixed(2)}</b></div>
                <div>CGST: ₹{modalTotals.cgst.toFixed(2)} · SGST: ₹{modalTotals.sgst.toFixed(2)} · IGST: ₹{modalTotals.igst.toFixed(2)}</div>
                <div className="text-base">Total: <b>₹{modalTotals.total.toFixed(2)}</b></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 border rounded-lg text-sm" onClick={() => setModal(null)}>Cancel</button>
              <button className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm" onClick={savePurchase}>Save Purchase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function r2(n: number) { return Math.round(n * 100) / 100; }

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <input type={type} className="border rounded-lg px-3 py-2 w-full text-sm" value={value} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function RegisterTable({ rows, columns, onExport }: { rows: any[]; columns: string[]; onExport: () => void }) {
  const totals = columns.reduce((acc, c) => { acc[c] = rows.reduce((s, r) => s + (typeof r[c] === 'number' ? r[c] : Number(r[c]) || 0), 0); return acc; }, {} as Record<string, number>);
  const numericCols = new Set(['taxable', 'cgst', 'sgst', 'igst', 'total']);
  return (
    <div>
      <div className="flex justify-end mb-2"><button onClick={onExport} className="inline-flex items-center gap-1 text-sm border rounded-lg px-3 py-2"><Download size={14} /> Export CSV</button></div>
      <div className="bg-white border rounded-2xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>{columns.map(c => <th key={c} className={`p-2 ${numericCols.has(c) ? 'text-right' : 'text-left'}`}>{c.replace(/_/g, ' ')}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? <tr><td colSpan={columns.length} className="p-6 text-center text-gray-500">No rows for this period.</td></tr> :
              rows.map((r, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c} className={`p-2 ${numericCols.has(c) ? 'text-right font-mono' : ''}`}>
                      {numericCols.has(c) ? `₹${Number(r[c] || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : (r[c] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            {rows.length > 0 && (
              <tr className="bg-gray-50 font-semibold">
                {columns.map(c => (
                  <td key={c} className={`p-2 ${numericCols.has(c) ? 'text-right font-mono' : ''}`}>
                    {numericCols.has(c) ? `₹${totals[c].toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : (c === columns[0] ? 'TOTAL' : '')}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="bg-white border rounded-2xl p-5">
      <h4 className="font-semibold mb-3">{title}</h4>
      <div className="space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between"><span className="text-gray-600">{k}</span><span className="font-mono">₹{Number(v).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span></div>
        ))}
      </div>
    </div>
  );
}
