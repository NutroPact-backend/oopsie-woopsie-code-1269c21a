// @ts-nocheck
import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { Beaker, Plus, Trash2, Save, TrendingUp } from 'lucide-react';
import { getMarketingAdmin, saveMarketingSettings } from '@/lib/marketing.functions';
import { getAbResults } from '@/lib/admin-phase3.functions';
import { TabHelp } from './_TabHelp';
import { BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

type Variant = { id: string; label: string; weight: number };
type Experiment = { id: string; name: string; enabled: boolean; variants: Variant[]; description?: string };

export default function AbExperimentsTab() {
  const loadFn = useServerFn(getMarketingAdmin);
  const saveFn = useServerFn(saveMarketingSettings);
  const resultsFn = useServerFn(getAbResults);

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<Record<string, Record<string, { exposures: number; conversions: number; revenue: number }>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, res]: any = await Promise.all([loadFn({}), resultsFn({})]);
      setExperiments(Array.isArray(cfg?.config?.ab_experiments) ? cfg.config.ab_experiments : []);
      setResults(res?.experiments || {});
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await saveFn({ data: { patch: { ab_experiments: experiments } } });
      alert('Saved');
    } catch (e: any) { alert(e?.message); }
    setSaving(false);
  };

  const addExp = () => setExperiments(e => [...e, {
    id: 'exp_' + Math.random().toString(36).slice(2, 8),
    name: 'New experiment', enabled: true,
    variants: [{ id: 'control', label: 'Control', weight: 50 }, { id: 'variant_a', label: 'Variant A', weight: 50 }],
  }]);
  const update = (i: number, patch: Partial<Experiment>) => setExperiments(es => es.map((e, idx) => idx === i ? { ...e, ...patch } : e));
  const remove = (i: number) => { if (!confirm('Delete experiment?')) return; setExperiments(es => es.filter((_, idx) => idx !== i)); };
  const updateVariant = (i: number, vi: number, patch: Partial<Variant>) => update(i, { variants: experiments[i].variants.map((v, idx) => idx === vi ? { ...v, ...patch } : v) });
  const addVariant = (i: number) => update(i, { variants: [...experiments[i].variants, { id: 'v_' + Math.random().toString(36).slice(2, 6), label: 'New variant', weight: 50 }] });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSel = experiments.length > 0 && experiments.every(e => selected.has(e.id));
  const someSel = selected.size > 0 && !allSel;
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected(s => allSel ? new Set() : new Set(experiments.map(e => e.id)));

  const removeVariant = (i: number, vi: number) => update(i, { variants: experiments[i].variants.filter((_, idx) => idx !== vi) });

  if (loading) return <div className="p-8 text-sm text-gray-400">Loading…</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="ai" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2"><Beaker size={20} className="text-orange-500" /> A/B Experiments</h2>
          <p className="text-sm text-gray-500">Define experiments + variants. Use <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">pickVariant(id, variants)</code> from <code>@/lib/ab</code> in any component.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={addExp} className="px-3 py-2 bg-white border rounded-xl text-sm font-bold flex items-center gap-1 hover:bg-gray-50"><Plus size={14} /> Add</button>
          <button disabled={saving} onClick={save} className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-1 disabled:opacity-50"><Save size={14} /> {saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <BulkActionBar
        count={selected.size}
        ids={Array.from(selected)}
        onClear={() => setSelected(new Set())}
        actions={[
          { key: 'enable', label: 'Enable', color: 'bg-green-600 hover:bg-green-700',
            run: (ids) => setExperiments(es => es.map(e => ids.includes(e.id) ? { ...e, enabled: true } : e)) },
          { key: 'disable', label: 'Disable', color: 'bg-gray-600 hover:bg-gray-700',
            run: (ids) => setExperiments(es => es.map(e => ids.includes(e.id) ? { ...e, enabled: false } : e)) },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} experiments? Click Save to persist.',
            run: (ids) => setExperiments(es => es.filter(e => !ids.includes(e.id))) },
        ]}
      />
      {experiments.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 px-1">
          <SelectCheckbox checked={allSel} indeterminate={someSel} onChange={toggleAll} />
          Select all ({experiments.length})
        </label>
      )}

      {experiments.length === 0 && (
        <div className="bg-white rounded-2xl border p-8 text-center text-sm text-gray-400">
          No experiments yet. Click <strong>Add</strong> to create one.
        </div>
      )}

      {experiments.map((exp, i) => {
        const expResults = results[exp.id] || {};
        const totalExposures = Object.values(expResults).reduce((s, v) => s + v.exposures, 0);
        return (
          <div key={i} className="bg-white rounded-2xl border p-5 space-y-3">
            <div className="flex items-start gap-3">
              <SelectCheckbox checked={selected.has(exp.id)} onChange={() => toggleOne(exp.id)} />
              <input value={exp.name} onChange={e => update(i, { name: e.target.value })}
                className="flex-1 font-black text-lg border-b-2 border-transparent focus:border-orange-400 focus:outline-none" />
              <label className="flex items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={exp.enabled} onChange={e => update(i, { enabled: e.target.checked })} className="rounded" />
                Enabled
              </label>
              <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={exp.id} onChange={e => update(i, { id: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                placeholder="experiment_id" className="border rounded-lg px-3 py-1.5 text-xs font-mono" />
              <input value={exp.description || ''} onChange={e => update(i, { description: e.target.value })}
                placeholder="Description / hypothesis" className="border rounded-lg px-3 py-1.5 text-xs" />
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-500 uppercase">Variants</p>
                <button onClick={() => addVariant(i)} className="text-xs font-bold text-orange-500 hover:underline">+ Add variant</button>
              </div>
              <div className="space-y-2">
                {exp.variants.map((v, vi) => {
                  const r = expResults[v.id] || { exposures: 0, conversions: 0, revenue: 0 };
                  const conv = r.exposures > 0 ? (r.conversions / r.exposures) * 100 : 0;
                  return (
                    <div key={vi} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                      <input value={v.id} onChange={e => updateVariant(i, vi, { id: e.target.value.replace(/[^a-z0-9_]/g, '') })}
                        placeholder="id" className="col-span-2 border rounded px-2 py-1 text-xs font-mono" />
                      <input value={v.label} onChange={e => updateVariant(i, vi, { label: e.target.value })}
                        placeholder="Label" className="col-span-3 border rounded px-2 py-1 text-xs" />
                      <input type="number" value={v.weight} onChange={e => updateVariant(i, vi, { weight: Number(e.target.value) })}
                        className="col-span-1 border rounded px-2 py-1 text-xs" />
                      <div className="col-span-5 text-[11px] text-gray-600 flex items-center gap-3">
                        <span>👁 <strong>{r.exposures}</strong></span>
                        <span>✓ <strong>{r.conversions}</strong></span>
                        <span className={`font-bold ${conv >= 5 ? 'text-green-600' : 'text-gray-700'}`}>{conv.toFixed(2)}%</span>
                        <span>₹{Math.round(r.revenue).toLocaleString()}</span>
                      </div>
                      <button onClick={() => removeVariant(i, vi)} className="col-span-1 text-red-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
              {totalExposures > 0 && (
                <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1"><TrendingUp size={11} /> {totalExposures.toLocaleString()} total exposures in last 60 days</p>
              )}
            </div>
          </div>
        );
      })}

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900">
        <p className="font-bold mb-1">How to use:</p>
        <pre className="bg-white rounded p-2 overflow-x-auto"><code>{`import { pickVariant, trackAbConversion } from '@/lib/ab';

const variant = pickVariant('hero_cta_color', [
  { id: 'control', weight: 50 },
  { id: 'variant_a', weight: 50 },
]);

// On purchase / signup:
trackAbConversion('hero_cta_color', { value: orderTotal });`}</code></pre>
      </div>
    </div>
  );
}
