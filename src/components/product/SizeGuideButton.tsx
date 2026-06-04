// @ts-nocheck
import { useEffect, useState } from 'react';
import { Ruler, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Chart {
  id: string; name: string; category: string; description?: string;
  image_url?: string; columns: string[]; rows: string[][]; unit_hint?: string;
}

/**
 * Renders a "Size Guide" link that opens a modal showing the linked size chart.
 * Resolves chart from (in order):
 *   1) product.size_chart_override (per-product JSON override)
 *   2) product.size_chart_id (linked library chart)
 *   3) Any chart linked from the currently selected size (size.chart_id)
 */
export default function SizeGuideButton({ product, selectedSizeName }: { product: any; selectedSizeName?: string }) {
  const [open, setOpen] = useState(false);
  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(false);

  const override: Chart | null = product?.size_chart_override && typeof product.size_chart_override === 'object'
    ? product.size_chart_override as Chart : null;
  const chartId: string | null = product?.size_chart_id || null;

  useEffect(() => {
    if (override) { setChart(override); return; }
    let cancelled = false;
    const resolve = async () => {
      setLoading(true);
      try {
        let id = chartId;
        if (!id && selectedSizeName) {
          const { data: sz } = await supabase.from('product_sizes').select('chart_id').eq('name', selectedSizeName).maybeSingle();
          if (sz?.chart_id) id = sz.chart_id;
        }
        if (!id) { setChart(null); return; }
        const { data } = await supabase.from('size_charts').select('*').eq('id', id).eq('active', true).maybeSingle();
        if (!cancelled) setChart(data as Chart);
      } finally { if (!cancelled) setLoading(false); }
    };
    resolve();
    return () => { cancelled = true; };
  }, [chartId, selectedSizeName, override]);

  if (!chart && !loading && !override && !chartId) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 underline-offset-2 hover:underline">
        <Ruler size={13} /> Size Guide
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="border-b px-6 py-4 flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2"><Ruler size={18} /> {chart?.name || 'Size Guide'}</h3>
                {chart?.unit_hint && <p className="text-xs text-gray-500">All measurements in {chart.unit_hint}</p>}
              </div>
              <button onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {loading && <div className="text-center text-gray-400 py-8">Loading…</div>}
              {chart?.description && <p className="text-sm text-gray-600">{chart.description}</p>}
              {chart?.image_url && <img src={chart.image_url} alt={chart.name} className="w-full rounded-xl border" loading="lazy" />}
              {chart && chart.columns?.length > 0 && chart.rows?.length > 0 && (
                <div className="overflow-x-auto border rounded-xl">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>{chart.columns.map((c, i) => <th key={i} className="px-3 py-2.5 text-left text-xs font-black uppercase text-gray-600">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {chart.rows.map((row, ri) => (
                        <tr key={ri} className="border-t">
                          {row.map((cell, ci) => <td key={ci} className={`px-3 py-2.5 ${ci === 0 ? 'font-bold' : 'tabular-nums'}`}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {!loading && !chart && <div className="text-center text-gray-400 py-8 text-sm">No size chart linked.</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
