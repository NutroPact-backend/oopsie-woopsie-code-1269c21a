// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Package, Plus, RefreshCw, Save, TrendingDown, TrendingUp } from 'lucide-react';

type Product = { id: string; name: string; sku: string | null; stock_count: number | null; low_stock_threshold: number; price: number; hsn_code: string | null; gst_rate: number };
type Movement = { id: string; product_id: string; qty: number; direction: string; reason: string; ref_type: string | null; ref_id: string | null; stock_after: number | null; note: string | null; created_at: string };

export default function InventoryTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'low' | 'out'>('all');
  const [search, setSearch] = useState('');
  const [adjust, setAdjust] = useState<{ pid: string; qty: number; reason: 'adjustment' | 'damage' | 'opening'; note: string } | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: p }, { data: m }] = await Promise.all([
      supabase.from('products').select('id,name,sku,stock_count,low_stock_threshold,price,hsn_code,gst_rate').order('name'),
      supabase.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setProducts((p as Product[]) || []);
    setMovements((m as Movement[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products.filter(p => {
      if (s && !(`${p.name} ${p.sku || ''}`.toLowerCase().includes(s))) return false;
      const stock = p.stock_count || 0;
      if (filter === 'out') return stock <= 0;
      if (filter === 'low') return stock > 0 && stock <= (p.low_stock_threshold || 5);
      return true;
    });
  }, [products, filter, search]);

  const stats = useMemo(() => {
    const total = products.length;
    const out = products.filter(p => (p.stock_count || 0) <= 0).length;
    const low = products.filter(p => (p.stock_count || 0) > 0 && (p.stock_count || 0) <= (p.low_stock_threshold || 5)).length;
    const value = products.reduce((s, p) => s + (Number(p.price) || 0) * (p.stock_count || 0), 0);
    return { total, out, low, value };
  }, [products]);

  async function saveThreshold(p: Product, val: number) {
    setSaving(p.id);
    await supabase.from('products').update({ low_stock_threshold: Math.max(0, val) }).eq('id', p.id);
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, low_stock_threshold: val } : x));
    setSaving(null);
  }

  async function submitAdjust() {
    if (!adjust) return;
    const p = products.find(x => x.id === adjust.pid);
    if (!p) return;
    const delta = adjust.reason === 'opening' ? Math.abs(adjust.qty) : adjust.qty;
    const newStock = Math.max(0, (p.stock_count || 0) + (adjust.reason === 'damage' ? -Math.abs(delta) : delta));
    await supabase.from('products').update({ stock_count: newStock, in_stock: newStock > 0 }).eq('id', p.id);
    await supabase.from('stock_movements').insert({
      product_id: p.id, qty: Math.abs(delta), direction: delta >= 0 && adjust.reason !== 'damage' ? 'in' : 'out',
      reason: adjust.reason, ref_type: 'manual', stock_after: newStock, note: adjust.note,
    });
    setAdjust(null);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Package size={18} />} label="Total SKUs" value={stats.total} />
        <StatCard icon={<AlertTriangle size={18} />} label="Low stock" value={stats.low} tone="warn" />
        <StatCard icon={<TrendingDown size={18} />} label="Out of stock" value={stats.out} tone="bad" />
        <StatCard icon={<TrendingUp size={18} />} label="Stock value" value={`₹${stats.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" placeholder="Search by name or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="inline-flex rounded-lg border overflow-hidden text-sm">
          {(['all', 'low', 'out'] as const).map(k => (
            <button key={k} onClick={() => setFilter(k)} className={`px-3 py-2 ${filter === k ? 'bg-gray-900 text-white' : 'bg-white'}`}>{k === 'all' ? 'All' : k === 'low' ? 'Low' : 'Out'}</button>
          ))}
        </div>
        <button onClick={load} className="inline-flex items-center gap-1 border rounded-lg px-3 py-2 text-sm hover:bg-gray-50"><RefreshCw size={14} /> Refresh</button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">SKU / HSN</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Low alert ≤</th>
                <th className="text-right p-3">Value</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">Loading…</td></tr> :
                filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-gray-500">No products.</td></tr> :
                filtered.map(p => {
                  const stock = p.stock_count || 0;
                  const isOut = stock <= 0; const isLow = !isOut && stock <= (p.low_stock_threshold || 5);
                  return (
                    <tr key={p.id} className={isOut ? 'bg-red-50/50' : isLow ? 'bg-amber-50/50' : ''}>
                      <td className="p-3">
                        <div className="font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500">GST {Number(p.gst_rate) || 0}%</div>
                      </td>
                      <td className="p-3 text-xs text-gray-600">
                        <div>{p.sku || '—'}</div>
                        <div>HSN {p.hsn_code || '—'}</div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        <span className={isOut ? 'text-red-600 font-semibold' : isLow ? 'text-amber-700 font-semibold' : ''}>{stock}</span>
                      </td>
                      <td className="p-3 text-right">
                        <input type="number" min={0} className="w-16 border rounded px-2 py-1 text-right text-sm"
                          defaultValue={p.low_stock_threshold} onBlur={e => {
                            const v = parseInt(e.target.value); if (!isNaN(v) && v !== p.low_stock_threshold) saveThreshold(p, v);
                          }} />
                        {saving === p.id && <Save size={12} className="inline ml-1 text-gray-400 animate-pulse" />}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">₹{((Number(p.price) || 0) * stock).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => setAdjust({ pid: p.id, qty: 0, reason: 'adjustment', note: '' })} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">Adjust</button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent stock movements (last 100)</h3>
        <div className="bg-white border rounded-2xl overflow-hidden max-h-[420px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500 sticky top-0">
              <tr>
                <th className="text-left p-2">When</th>
                <th className="text-left p-2">Product</th>
                <th className="text-left p-2">Reason</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">After</th>
                <th className="text-left p-2">Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {movements.length === 0 ? <tr><td colSpan={6} className="p-4 text-center text-gray-400">No movements yet.</td></tr> :
                movements.map(m => {
                  const p = products.find(x => x.id === m.product_id);
                  return (
                    <tr key={m.id}>
                      <td className="p-2 text-gray-500">{new Date(m.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="p-2">{p?.name || m.product_id}</td>
                      <td className="p-2"><span className={`px-2 py-0.5 rounded text-[10px] uppercase ${m.direction === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{m.reason}</span></td>
                      <td className={`p-2 text-right font-mono ${m.direction === 'in' ? 'text-green-700' : 'text-red-700'}`}>{m.direction === 'in' ? '+' : '−'}{m.qty}</td>
                      <td className="p-2 text-right font-mono">{m.stock_after ?? '—'}</td>
                      <td className="p-2 text-gray-500">{m.ref_type ? `${m.ref_type}:${m.ref_id || ''}` : '—'}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {adjust && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center z-50 p-4" onClick={() => setAdjust(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-3">Adjust stock</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reason</label>
                <select className="border rounded-lg px-3 py-2 w-full" value={adjust.reason} onChange={e => setAdjust({ ...adjust, reason: e.target.value as any })}>
                  <option value="adjustment">Adjustment (+/−)</option>
                  <option value="damage">Damage (−)</option>
                  <option value="opening">Opening balance (set +)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Qty {adjust.reason === 'adjustment' ? '(use negative for out)' : ''}</label>
                <input type="number" className="border rounded-lg px-3 py-2 w-full" value={adjust.qty} onChange={e => setAdjust({ ...adjust, qty: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Note</label>
                <input className="border rounded-lg px-3 py-2 w-full" value={adjust.note} onChange={e => setAdjust({ ...adjust, note: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 text-sm border rounded-lg" onClick={() => setAdjust(null)}>Cancel</button>
              <button className="px-3 py-2 text-sm bg-gray-900 text-white rounded-lg" onClick={submitAdjust}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: any; tone?: 'warn' | 'bad' }) {
  const color = tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : 'text-gray-900';
  return (
    <div className="bg-white border rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-gray-500">{icon}{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${color}`}>{value}</div>
    </div>
  );
}
