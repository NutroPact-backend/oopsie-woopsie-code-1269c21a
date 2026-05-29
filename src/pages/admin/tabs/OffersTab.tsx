// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Tag, CreditCard, Layers, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { TabHelp } from "./_TabHelp";
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

import { useCategoryNames } from '@/hooks/useCategories';
const FALLBACK_CATEGORIES = ['Protein', 'Creatine', 'Pre-Workout', 'Mass Gainer', 'Vitamins', 'BCAA', 'Fat Burner'];

function uid() { return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }

function Section({ title, icon, children, action }: { title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-black text-lg flex items-center gap-2">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 ${props.className || ''}`} />;
}
function Sel(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-orange-400 ${props.className || ''}`} />;
}
function Lbl({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-black text-gray-500 uppercase tracking-wider block mb-1">{children}</label>;
}

// ─── OFFERS ─────────────────────────────────────────────────────────────────
function OffersList() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string>('');
  const catNames = useCategoryNames();
  const CATEGORIES = catNames.length ? catNames : FALLBACK_CATEGORIES;
  const bulk = useBulkSelection(items, (it: any) => it.id);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('offers').select('*').order('priority', { ascending: false }),
        supabase.from('products').select('id,name,category').limit(500),
      ]);
      setItems(a.data || []);
      setProducts(b.data || []);
      setLoading(false);
    })();
  }, []);

  const update = (idx: number, patch: any) => setItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));

  const addNew = () => setItems(arr => [{
    id: uid(), title: 'New offer', badge_label: '', description: '', terms: '',
    type: 'percent', value: 5, free_product_id: '', free_product_name: '',
    scope_type: 'all', scope_values: [], min_order_value: 0, max_order_value: 0,
    applies_to_flavors: [], applies_to_sizes: [],
    active: true, priority: 0, starts_at: null, expires_at: null,
    _new: true,
  }, ...arr]);

  const save = async (idx: number) => {
    const it = items[idx];
    setSavingId(it.id);
    const { _new, ...row } = it;
    const { error } = await supabase.from('offers').upsert(row, { onConflict: 'id' });
    setSavingId('');
    if (error) return alert(error.message);
    update(idx, { _new: false });
  };

  const remove = async (idx: number) => {
    const it = items[idx];
    if (!confirm(`Delete "${it.title}"?`)) return;
    if (!it._new) {
      const { error } = await supabase.from('offers').delete().eq('id', it.id);
      if (error) return alert(error.message);
    }
    setItems(arr => arr.filter((_, i) => i !== idx));
  };

  if (loading) return <p className="text-sm text-gray-400">Loading offers…</p>;

  return (
    <Section title="Product Offers" icon={<Tag size={18} className="text-orange-500" />}
      action={<button onClick={addNew} className="text-xs font-black bg-orange-500 text-white px-3 py-2 rounded-xl flex items-center gap-1"><Plus size={13} /> Add offer</button>}>
      {items.length === 0 && <p className="text-sm text-gray-400">No offers yet. Add one above.</p>}
      <BulkActionBar
        count={bulk.count}
        ids={Array.from(bulk.selected)}
        onClear={bulk.clear}
        actions={[
          { key: 'activate', label: 'Activate', color: 'bg-green-600 hover:bg-green-700',
            run: async (ids) => {
              await Promise.all(ids.map(id => supabase.from('offers').update({ active: true }).eq('id', id)));
              setItems(arr => arr.map(it => ids.includes(it.id) ? { ...it, active: true } : it));
            } },
          { key: 'deactivate', label: 'Deactivate', color: 'bg-gray-600 hover:bg-gray-700',
            run: async (ids) => {
              await Promise.all(ids.map(id => supabase.from('offers').update({ active: false }).eq('id', id)));
              setItems(arr => arr.map(it => ids.includes(it.id) ? { ...it, active: false } : it));
            } },
          { key: 'delete', label: 'Delete', color: 'bg-red-600 hover:bg-red-700', confirm: 'Delete {n} offers?',
            run: async (ids) => {
              const real = items.filter(it => ids.includes(it.id) && !it._new).map(it => it.id);
              if (real.length) await supabase.from('offers').delete().in('id', real);
              setItems(arr => arr.filter(it => !ids.includes(it.id)));
            } },
        ]}
      />
      {items.length > 0 && (
        <label className="flex items-center gap-2 text-xs font-bold text-gray-600 pb-1">
          <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} />
          Select all ({items.length})
        </label>
      )}
      <div className="space-y-3">
        {items.map((it, i) => (
          <details key={it.id} open={it._new} className="rounded-xl border border-gray-200 bg-gray-50/40 group">
            <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-2 list-none">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <SelectCheckbox checked={bulk.isSelected(it.id)} onChange={() => bulk.toggleOne(it.id)} />
                <span className={`w-2 h-2 rounded-full shrink-0 ${it.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="font-bold text-sm truncate">{it.title || '(untitled)'}</span>
                <span className="text-[10px] font-black bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded shrink-0">
                  {it.type === 'percent' ? `${it.value}%` : it.type === 'fixed' ? `₹${it.value}` : 'FREE'}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">[{it.scope_type}]</span>
              </div>
              <button onClick={(e) => { e.preventDefault(); remove(i); }} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
            </summary>
            <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
              <div className="grid sm:grid-cols-2 gap-3 pt-3">
                <div><Lbl>Title</Lbl><Input value={it.title || ''} onChange={e => update(i, { title: e.target.value })} /></div>
                <div><Lbl>Badge label (optional)</Lbl><Input value={it.badge_label || ''} onChange={e => update(i, { badge_label: e.target.value })} placeholder="NEW / BIOX" /></div>
                <div className="sm:col-span-2"><Lbl>Description</Lbl><Input value={it.description || ''} onChange={e => update(i, { description: e.target.value })} /></div>
                <div className="sm:col-span-2"><Lbl>Terms &amp; conditions</Lbl><Input value={it.terms || ''} onChange={e => update(i, { terms: e.target.value })} /></div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Lbl>Discount type</Lbl>
                  <Sel value={it.type} onChange={e => update(i, { type: e.target.value })}>
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed amount (₹)</option>
                    <option value="free_product">Free product</option>
                  </Sel>
                </div>
                {it.type !== 'free_product' ? (
                  <div><Lbl>Value</Lbl><Input type="number" value={it.value || 0} onChange={e => update(i, { value: Number(e.target.value) })} /></div>
                ) : (
                  <div className="sm:col-span-2"><Lbl>Free product name</Lbl><Input value={it.free_product_name || ''} onChange={e => update(i, { free_product_name: e.target.value })} placeholder="Free Shaker" /></div>
                )}
                <div><Lbl>Priority</Lbl><Input type="number" value={it.priority || 0} onChange={e => update(i, { priority: Number(e.target.value) })} /></div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Lbl>Apply to</Lbl>
                  <Sel value={it.scope_type} onChange={e => update(i, { scope_type: e.target.value, scope_values: [] })}>
                    <option value="all">All products</option>
                    <option value="product">Specific products</option>
                    <option value="category">Category</option>
                    <option value="tag">Tag</option>
                    <option value="min_order">Above order amount</option>
                    <option value="max_order">Below order amount</option>
                  </Sel>
                </div>

                {it.scope_type === 'product' && (
                  <div>
                    <Lbl>Product IDs (comma-separated)</Lbl>
                    <Input value={(it.scope_values || []).join(',')} onChange={e => update(i, { scope_values: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="Pick product IDs below" />
                    <details className="mt-1"><summary className="text-[10px] text-orange-500 cursor-pointer">Show available products</summary>
                      <div className="max-h-40 overflow-auto mt-1 text-[11px] space-y-0.5">
                        {products.map(p => (
                          <button key={p.id} type="button" onClick={() => {
                            const cur = it.scope_values || [];
                            update(i, { scope_values: cur.includes(p.id) ? cur.filter((x: string) => x !== p.id) : [...cur, p.id] });
                          }} className={`block w-full text-left px-2 py-1 rounded ${(it.scope_values || []).includes(p.id) ? 'bg-orange-100 font-bold' : 'hover:bg-gray-100'}`}>
                            {p.name} <span className="text-gray-400">({p.id})</span>
                          </button>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
                {it.scope_type === 'category' && (
                  <div>
                    <Lbl>Categories</Lbl>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map(c => {
                        const on = (it.scope_values || []).includes(c);
                        return <button key={c} type="button" onClick={() => {
                          const cur = it.scope_values || [];
                          update(i, { scope_values: on ? cur.filter((x: string) => x !== c) : [...cur, c] });
                        }} className={`text-xs px-2.5 py-1 rounded-full border ${on ? 'bg-orange-500 text-white border-orange-500' : 'bg-white border-gray-200'}`}>{c}</button>;
                      })}
                    </div>
                  </div>
                )}
                {it.scope_type === 'tag' && (
                  <div><Lbl>Tags (comma-separated)</Lbl><Input value={(it.scope_values || []).join(',')} onChange={e => update(i, { scope_values: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="bestseller, new" /></div>
                )}
                {it.scope_type === 'min_order' && (
                  <div><Lbl>Min order amount (₹)</Lbl><Input type="number" value={it.min_order_value || 0} onChange={e => update(i, { min_order_value: Number(e.target.value) })} /></div>
                )}
                {it.scope_type === 'max_order' && (
                  <div><Lbl>Max order amount (₹)</Lbl><Input type="number" value={it.max_order_value || 0} onChange={e => update(i, { max_order_value: Number(e.target.value) })} /></div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div><Lbl>Applies to flavors (comma-separated, optional)</Lbl><Input value={(it.applies_to_flavors || []).join(',')} onChange={e => update(i, { applies_to_flavors: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="Chocolate, Vanilla" /></div>
                <div><Lbl>Applies to sizes (comma-separated, optional)</Lbl><Input value={(it.applies_to_sizes || []).join(',')} onChange={e => update(i, { applies_to_sizes: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} placeholder="1kg, 2kg" /></div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div><Lbl>Starts at</Lbl><Input type="datetime-local" value={it.starts_at ? new Date(it.starts_at).toISOString().slice(0, 16) : ''} onChange={e => update(i, { starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                <div><Lbl>Expires at</Lbl><Input type="datetime-local" value={it.expires_at ? new Date(it.expires_at).toISOString().slice(0, 16) : ''} onChange={e => update(i, { expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input type="checkbox" checked={!!it.active} onChange={e => update(i, { active: e.target.checked })} />
                    Active
                  </label>
                </div>
              </div>

              <button onClick={() => save(i)} disabled={savingId === it.id}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-black px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50">
                {savingId === it.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save offer
              </button>
            </div>
          </details>
        ))}
      </div>
    </Section>
  );
}

// ─── PAYMENT OFFERS ─────────────────────────────────────────────────────────
function PaymentOffersList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    supabase.from('payment_offers').select('*').order('sort_order').then(({ data }) => {
      setItems(data || []); setLoading(false);
    });
  }, []);

  const upd = (idx: number, patch: any) => setItems(arr => arr.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const addNew = () => setItems(arr => [{ id: uid(), title: '', provider: '', description: '', code: '', max_cashback: 0, logo: '', link: '', active: true, sort_order: 0, _new: true }, ...arr]);
  const save = async (i: number) => {
    setSavingId(items[i].id);
    const { _new, ...row } = items[i];
    const { error } = await supabase.from('payment_offers').upsert(row, { onConflict: 'id' });
    setSavingId('');
    if (error) return alert(error.message);
    upd(i, { _new: false });
  };
  const remove = async (i: number) => {
    if (!confirm('Delete payment offer?')) return;
    if (!items[i]._new) await supabase.from('payment_offers').delete().eq('id', items[i].id);
    setItems(arr => arr.filter((_, j) => j !== i));
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <Section title="Payment Offers" icon={<CreditCard size={18} className="text-blue-500" />}
      action={<button onClick={addNew} className="text-xs font-black bg-blue-500 text-white px-3 py-2 rounded-xl flex items-center gap-1"><Plus size={13} /> Add</button>}>
      <p className="text-xs text-gray-500">Bank, UPI, NutroPay cashback offers shown on product pages.</p>
      {items.map((it, i) => (
        <div key={it.id} className="rounded-xl border border-gray-200 p-3 bg-gray-50/40 space-y-2.5">
          <div className="grid sm:grid-cols-2 gap-2.5">
            <div><Lbl>Title</Lbl><Input value={it.title || ''} onChange={e => upd(i, { title: e.target.value })} placeholder="Get upto ₹200 cashback using MobiKwik UPI" /></div>
            <div><Lbl>Provider</Lbl><Input value={it.provider || ''} onChange={e => upd(i, { provider: e.target.value })} placeholder="MobiKwik" /></div>
            <div><Lbl>Description</Lbl><Input value={it.description || ''} onChange={e => upd(i, { description: e.target.value })} /></div>
            <div><Lbl>Code (optional)</Lbl><Input value={it.code || ''} onChange={e => upd(i, { code: e.target.value })} placeholder="@ikwik" /></div>
            <div><Lbl>Max cashback (₹)</Lbl><Input type="number" value={it.max_cashback || 0} onChange={e => upd(i, { max_cashback: Number(e.target.value) })} /></div>
            <div><Lbl>Sort order</Lbl><Input type="number" value={it.sort_order || 0} onChange={e => upd(i, { sort_order: Number(e.target.value) })} /></div>
            <div className="sm:col-span-2"><Lbl>Logo URL (optional)</Lbl><Input value={it.logo || ''} onChange={e => upd(i, { logo: e.target.value })} placeholder="https://..." /></div>
            <div className="sm:col-span-2"><Lbl>External link (optional)</Lbl><Input value={it.link || ''} onChange={e => upd(i, { link: e.target.value })} placeholder="https://mobikwik.com/..." /></div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={!!it.active} onChange={e => upd(i, { active: e.target.checked })} /> Active
            </label>
            <div className="flex gap-2">
              <button onClick={() => remove(i)} className="text-gray-400 hover:text-red-500 p-2"><Trash2 size={14} /></button>
              <button onClick={() => save(i)} disabled={savingId === it.id}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1 disabled:opacity-50">
                {savingId === it.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
              </button>
            </div>
          </div>
        </div>
      ))}
    </Section>
  );
}

// ─── COMBO RULES ────────────────────────────────────────────────────────────
function ComboRulesList() {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const catNames = useCategoryNames();
  const CATEGORIES = catNames.length ? catNames : FALLBACK_CATEGORIES;

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        supabase.from('combo_rules').select('*').order('sort_order'),
        supabase.from('products').select('id,name,category').limit(500),
      ]);
      setItems(a.data || []);
      setProducts(b.data || []);
      setLoading(false);
    })();
  }, []);

  const upd = (i: number, p: any) => setItems(a => a.map((it, j) => j === i ? { ...it, ...p } : it));
  const addNew = () => setItems(a => [{
    id: uid(), name: 'New combo rule', description: '', min_items: 2, max_items: 10,
    extra_discount_type: 'percent', extra_discount_value: 10,
    eligible_categories: [], eligible_product_ids: [], stackable: false, active: true, sort_order: 0, _new: true,
  }, ...a]);
  const save = async (i: number) => {
    setSavingId(items[i].id);
    const { _new, ...row } = items[i];
    const { error } = await supabase.from('combo_rules').upsert(row, { onConflict: 'id' });
    setSavingId('');
    if (error) return alert(error.message);
    upd(i, { _new: false });
  };
  const remove = async (i: number) => {
    if (!confirm('Delete combo rule?')) return;
    if (!items[i]._new) await supabase.from('combo_rules').delete().eq('id', items[i].id);
    setItems(a => a.filter((_, j) => j !== i));
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <Section title="Combo Rules" icon={<Layers size={18} className="text-amber-500" />}
      action={<button onClick={addNew} className="text-xs font-black bg-amber-500 text-white px-3 py-2 rounded-xl flex items-center gap-1"><Plus size={13} /> Add rule</button>}>
      <p className="text-xs text-gray-500">Customer combos auto-calculate using these. Leave categories &amp; products empty to allow any combination.</p>
      {items.map((it, i) => (
        <details key={it.id} open={it._new} className="rounded-xl border border-gray-200 bg-gray-50/40">
          <summary className="px-4 py-3 cursor-pointer flex items-center justify-between gap-2 list-none">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className={`w-2 h-2 rounded-full shrink-0 ${it.active ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="font-bold text-sm truncate">{it.name}</span>
              <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded shrink-0">
                {it.min_items}+ → {it.extra_discount_type === 'percent' ? `${it.extra_discount_value}%` : `₹${it.extra_discount_value}`}
              </span>
            </div>
            <button onClick={(e) => { e.preventDefault(); remove(i); }} className="text-gray-400 hover:text-red-500 p-1"><Trash2 size={14} /></button>
          </summary>
          <div className="px-4 pb-4 space-y-3 border-t border-gray-200">
            <div className="grid sm:grid-cols-2 gap-3 pt-3">
              <div><Lbl>Name</Lbl><Input value={it.name} onChange={e => upd(i, { name: e.target.value })} /></div>
              <div><Lbl>Description</Lbl><Input value={it.description || ''} onChange={e => upd(i, { description: e.target.value })} /></div>
              <div><Lbl>Min items</Lbl><Input type="number" value={it.min_items} onChange={e => upd(i, { min_items: Number(e.target.value) })} /></div>
              <div><Lbl>Max items</Lbl><Input type="number" value={it.max_items} onChange={e => upd(i, { max_items: Number(e.target.value) })} /></div>
              <div>
                <Lbl>Extra discount type</Lbl>
                <Sel value={it.extra_discount_type} onChange={e => upd(i, { extra_discount_type: e.target.value })}>
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed (₹)</option>
                </Sel>
              </div>
              <div><Lbl>Extra discount value</Lbl><Input type="number" value={it.extra_discount_value} onChange={e => upd(i, { extra_discount_value: Number(e.target.value) })} /></div>
              <div><Lbl>Sort order</Lbl><Input type="number" value={it.sort_order || 0} onChange={e => upd(i, { sort_order: Number(e.target.value) })} /></div>
            </div>

            <div>
              <Lbl>Eligible categories (empty = all)</Lbl>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(c => {
                  const on = (it.eligible_categories || []).includes(c);
                  return <button key={c} type="button" onClick={() => {
                    const cur = it.eligible_categories || [];
                    upd(i, { eligible_categories: on ? cur.filter((x: string) => x !== c) : [...cur, c] });
                  }} className={`text-xs px-2.5 py-1 rounded-full border ${on ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200'}`}>{c}</button>;
                })}
              </div>
            </div>

            <div>
              <Lbl>Eligible specific products (empty = all)</Lbl>
              <div className="max-h-44 overflow-auto rounded-lg border border-gray-200 p-2 text-xs space-y-0.5 bg-white">
                {products.map(p => {
                  const on = (it.eligible_product_ids || []).includes(p.id);
                  return <button key={p.id} type="button" onClick={() => {
                    const cur = it.eligible_product_ids || [];
                    upd(i, { eligible_product_ids: on ? cur.filter((x: string) => x !== p.id) : [...cur, p.id] });
                  }} className={`block w-full text-left px-2 py-1 rounded ${on ? 'bg-amber-100 font-bold' : 'hover:bg-gray-100'}`}>{p.name} <span className="text-gray-400">({p.category})</span></button>;
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!it.active} onChange={e => upd(i, { active: e.target.checked })} /> Active</label>
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!it.stackable} onChange={e => upd(i, { stackable: e.target.checked })} /> Stackable with coupons</label>
            </div>

            <button onClick={() => save(i)} disabled={savingId === it.id}
              className="bg-amber-500 hover:bg-amber-600 text-white text-sm font-black px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50">
              {savingId === it.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save rule
            </button>
          </div>
        </details>
      ))}
    </Section>
  );
}

export default function OffersTab() {
  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="offers" />
      <div>
        <h1 className="text-2xl font-black">Offers, Payments & Combos</h1>
        <p className="text-sm text-gray-500">Fully customizable promotional rules shown on product pages and the combo builder.</p>
      </div>
      <OffersList />
      <PaymentOffersList />
      <ComboRulesList />
    </div>
  );
}
