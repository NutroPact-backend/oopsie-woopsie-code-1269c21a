// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import {
  Layers, Plus, Minus, Sparkles, ShoppingCart, Search, ChevronRight,
  Check, Trash2, Zap, ShieldCheck, Truck, X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

type Product = {
  id: string; name: string; slug: string; price: number; compare_price?: number;
  category: string; images: any; stock_count: number; is_active: boolean;
  short_description?: string;
};

type ComboRule = {
  id: string; name: string; description: string;
  min_items: number; max_items: number;
  extra_discount_type: 'percent' | 'fixed';
  extra_discount_value: number;
  eligible_categories: string[];
  eligible_product_ids: string[];
  stackable: boolean;
  sort_order: number;
};

function ruleApplies(r: ComboRule, picked: Product[]): boolean {
  if (picked.length < r.min_items) return false;
  if (r.max_items && picked.length > r.max_items) return false;
  const cats = Array.isArray(r.eligible_categories) ? r.eligible_categories : [];
  const ids = Array.isArray(r.eligible_product_ids) ? r.eligible_product_ids : [];
  if (cats.length === 0 && ids.length === 0) return true;
  return picked.every(p =>
    (cats.length > 0 && cats.includes(p.category)) ||
    (ids.length > 0 && ids.includes(p.id))
  );
}

function bestRule(rules: ComboRule[], picked: Product[]): { rule: ComboRule | null; discount: number } {
  const subtotal = picked.reduce((s, p) => s + Number(p.price), 0);
  let best: { rule: ComboRule | null; discount: number } = { rule: null, discount: 0 };
  for (const r of rules) {
    if (!ruleApplies(r, picked)) continue;
    const d = r.extra_discount_type === 'percent'
      ? Math.round(subtotal * (r.extra_discount_value / 100))
      : Math.min(subtotal, r.extra_discount_value);
    if (d > best.discount) best = { rule: r, discount: d };
  }
  return best;
}

const Step = ({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) => (
  <div className="flex items-center gap-2.5">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition ${
      done ? 'bg-white text-orange-600 border-white' :
      active ? 'bg-white/20 text-white border-white' :
               'bg-transparent text-white/60 border-white/30'
    }`}>
      {done ? <Check size={13} strokeWidth={3} /> : n}
    </div>
    <span className={`text-[11px] font-bold tracking-wide uppercase ${active || done ? 'text-white' : 'text-white/50'}`}>{label}</span>
  </div>
);

export default function ComboPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<ComboRule[]>([]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('All');
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    (async () => {
      const [pr, rl] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,slug,price,compare_price,category,images,stock_count,is_active,short_description')
          .eq('is_active', true)
          .limit(80),
        supabase
          .from('combo_rules')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
      ]);
      setProducts((pr.data || []) as any);
      setRules((rl.data || []) as any);
      setLoading(false);
    })();
  }, []);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))],
    [products]
  );
  const filtered = useMemo(
    () => products.filter(p =>
      (cat === 'All' || p.category === cat) &&
      (!search || p.name.toLowerCase().includes(search.toLowerCase()))
    ),
    [products, cat, search]
  );

  const pickedProducts = useMemo(() => {
    const out: Product[] = [];
    for (const p of products) {
      const q = picked[p.id] || 0;
      for (let i = 0; i < q; i++) out.push(p);
    }
    return out;
  }, [picked, products]);

  const subtotal = pickedProducts.reduce((s, p) => s + Number(p.price), 0);
  const { rule, discount } = bestRule(rules, pickedProducts);
  const total = Math.max(0, subtotal - discount);
  const itemCount = pickedProducts.length;

  const nextRule = useMemo(() => {
    if (rule) return null;
    return rules
      .map(r => ({ r, need: r.min_items - itemCount }))
      .filter(x => x.need > 0)
      .sort((a, b) => a.need - b.need)[0]?.r || null;
  }, [rules, rule, itemCount]);

  const inc = (id: string) => setPicked(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
  const dec = (id: string) => setPicked(p => {
    const next = { ...p, [id]: Math.max(0, (p[id] || 0) - 1) };
    if (next[id] === 0) delete next[id];
    return next;
  });
  const clearAll = () => setPicked({});

  const addAllToCart = () => {
    if (pickedProducts.length === 0) return;
    const grouped: Record<string, { p: Product; qty: number }> = {};
    for (const p of pickedProducts) {
      grouped[p.id] = grouped[p.id] || { p, qty: 0 };
      grouped[p.id].qty += 1;
    }
    Object.values(grouped).forEach(({ p, qty }) => {
      addItem({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        image: Array.isArray(p.images) ? p.images[0] : '',
        flavor: '', size: '', quantity: qty,
        category: p.category,
      } as any);
    });
    if (typeof window !== 'undefined') window.location.href = '/cart';
  };

  const stepDone1 = itemCount >= 1;
  const stepDone2 = !!rule;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Hero with step tracker */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-orange-900 to-orange-600 text-white">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <div className="flex items-center gap-2 text-[10px] font-black tracking-[0.28em] text-orange-200 mb-4">
            <Sparkles size={12} /> COMBO BUILDER • SAVE UP TO 25%
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[0.95] max-w-3xl">
            Build your stack.<br />
            <span className="text-orange-300">Stack the savings.</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-orange-100/90 max-w-xl leading-relaxed">
            Pick any 2 or more products. We'll auto-apply the highest possible combo discount at checkout — no coupon codes, no fine print.
          </p>

          {/* Steps */}
          <div className="mt-8 flex items-center gap-3 sm:gap-5 flex-wrap">
            <Step n={1} label="Browse" active={!stepDone1} done={stepDone1} />
            <ChevronRight size={14} className="text-white/30" />
            <Step n={2} label="Pick 2+" active={stepDone1 && !stepDone2} done={stepDone2} />
            <ChevronRight size={14} className="text-white/30" />
            <Step n={3} label="Unlock & checkout" active={stepDone2} done={false} />
          </div>

          {/* Trust strip */}
          <div className="mt-8 grid grid-cols-3 max-w-xl gap-3 text-[11px] sm:text-xs">
            <div className="flex items-center gap-2 text-orange-100/90"><Zap size={14} className="text-orange-300" /> Auto discount</div>
            <div className="flex items-center gap-2 text-orange-100/90"><ShieldCheck size={14} className="text-orange-300" /> Lab tested</div>
            <div className="flex items-center gap-2 text-orange-100/90"><Truck size={14} className="text-orange-300" /> Free shipping</div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
        {/* Product picker */}
        <div>
          {/* Sticky search/filter */}
          <div className="sticky top-0 z-20 -mx-4 sm:-mx-0 px-4 sm:px-0 py-3 bg-stone-50/95 backdrop-blur border-b border-stone-200">
            <div className="flex gap-2.5">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search products to add…"
                  className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <button
                onClick={() => setShowMobileSummary(true)}
                className="lg:hidden relative rounded-xl bg-gray-900 text-white px-4 text-xs font-black inline-flex items-center gap-1.5"
              >
                <Layers size={14} />
                {itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCat(c)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${
                    cat === c
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 border border-stone-200 hover:border-gray-400'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
              {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-64 bg-white border border-stone-200 animate-pulse rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-12 text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300">
              <p className="text-sm font-bold text-gray-500">No products match your search.</p>
              <button onClick={() => { setSearch(''); setCat('All'); }} className="mt-3 text-xs font-bold text-orange-600 hover:text-orange-700">Reset filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mt-5">
              {filtered.map(p => {
                const q = picked[p.id] || 0;
                const img = Array.isArray(p.images) ? p.images[0] : '';
                const compare = Number(p.compare_price || 0);
                const hasDiscount = compare > Number(p.price);
                return (
                  <div key={p.id}
                    className={`group rounded-2xl overflow-hidden bg-white transition relative ${
                      q > 0
                        ? 'ring-2 ring-orange-500 shadow-lg shadow-orange-100'
                        : 'border border-stone-200 hover:border-gray-300 hover:shadow-md'
                    }`}>
                    {q > 0 && (
                      <div className="absolute top-2.5 left-2.5 z-10 bg-orange-500 text-white text-[10px] font-black rounded-full px-2 py-1 flex items-center gap-1">
                        <Check size={11} strokeWidth={3} /> IN COMBO
                      </div>
                    )}
                    {hasDiscount && (
                      <div className="absolute top-2.5 right-2.5 z-10 bg-gray-900 text-white text-[10px] font-black rounded-full px-2 py-1">
                        −{Math.round(((compare - Number(p.price)) / compare) * 100)}%
                      </div>
                    )}
                    <Link to="/products/$slug" params={{ slug: p.slug }}
                      onClick={e => e.stopPropagation()}
                      className="block aspect-square bg-stone-100 overflow-hidden">
                      {img && (
                        <img src={img} alt={p.name} loading="lazy" width={300} height={300}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                      )}
                    </Link>
                    <div className="p-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{p.category}</p>
                      <p className="text-sm font-black text-gray-900 line-clamp-2 leading-tight mt-1 min-h-[36px]">{p.name}</p>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <p className="text-base font-black text-gray-900">{formatPrice(Number(p.price))}</p>
                        {hasDiscount && <p className="text-xs text-gray-400 line-through">{formatPrice(compare)}</p>}
                      </div>
                      {q === 0 ? (
                        <button onClick={() => inc(p.id)}
                          className="mt-2.5 w-full rounded-xl bg-gray-900 hover:bg-orange-500 text-white text-xs font-black py-2.5 transition inline-flex items-center justify-center gap-1.5">
                          <Plus size={13} strokeWidth={3} /> ADD TO COMBO
                        </button>
                      ) : (
                        <div className="mt-2.5 flex items-center justify-between bg-orange-50 border border-orange-200 rounded-xl px-1.5 py-1.5">
                          <button onClick={() => dec(p.id)} aria-label="Decrease"
                            className="w-8 h-8 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 flex items-center justify-center text-orange-600 transition">
                            <Minus size={13} strokeWidth={3} />
                          </button>
                          <span className="font-black text-sm text-orange-600">× {q}</span>
                          <button onClick={() => inc(p.id)} aria-label="Increase"
                            className="w-8 h-8 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 flex items-center justify-center text-orange-600 transition">
                            <Plus size={13} strokeWidth={3} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop sticky summary */}
        <aside className="hidden lg:block">
          <ComboSummary
            products={products}
            picked={picked}
            pickedProducts={pickedProducts}
            subtotal={subtotal}
            rule={rule}
            discount={discount}
            total={total}
            nextRule={nextRule}
            inc={inc} dec={dec}
            clearAll={clearAll}
            onCheckout={addAllToCart}
            rules={rules}
          />
        </aside>
      </div>

      {/* Mobile sticky CTA bar */}
      {itemCount > 0 && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-stone-200 px-4 py-3 shadow-2xl">
          <button
            onClick={() => setShowMobileSummary(true)}
            className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm flex items-center justify-between px-5 transition"
          >
            <span className="flex items-center gap-2">
              <Layers size={15} /> {itemCount} item{itemCount === 1 ? '' : 's'} • {formatPrice(total)}
            </span>
            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider">
              View combo <ChevronRight size={14} />
            </span>
          </button>
        </div>
      )}

      {/* Mobile summary drawer */}
      {showMobileSummary && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 flex items-end" onClick={() => setShowMobileSummary(false)}>
          <div onClick={e => e.stopPropagation()}
            className="w-full max-h-[88vh] overflow-y-auto bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2"><Layers size={18} className="text-orange-500" /> Your Combo</h3>
              <button onClick={() => setShowMobileSummary(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100"><X size={18} /></button>
            </div>
            <ComboSummary
              products={products}
              picked={picked}
              pickedProducts={pickedProducts}
              subtotal={subtotal}
              rule={rule}
              discount={discount}
              total={total}
              nextRule={nextRule}
              inc={inc} dec={dec}
              clearAll={clearAll}
              onCheckout={addAllToCart}
              rules={rules}
              embedded
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Summary panel (used on desktop sidebar AND mobile drawer) ──────────────
function ComboSummary(props: {
  products: Product[];
  picked: Record<string, number>;
  pickedProducts: Product[];
  subtotal: number;
  rule: ComboRule | null;
  discount: number;
  total: number;
  nextRule: ComboRule | null;
  inc: (id: string) => void;
  dec: (id: string) => void;
  clearAll: () => void;
  onCheckout: () => void;
  rules: ComboRule[];
  embedded?: boolean;
}) {
  const { products, picked, pickedProducts, subtotal, rule, discount, total, nextRule, inc, dec, clearAll, onCheckout, rules, embedded } = props;
  const itemCount = pickedProducts.length;
  const progress = nextRule ? Math.min(100, Math.round((itemCount / nextRule.min_items) * 100)) : 100;
  const savePct = subtotal > 0 ? Math.round((discount / subtotal) * 100) : 0;

  return (
    <div className={embedded ? 'space-y-4' : 'lg:sticky lg:top-4 self-start space-y-4'}>
      <div className="rounded-3xl bg-white border border-stone-200 overflow-hidden shadow-sm">
        {/* Header */}
        {!embedded && (
          <div className="bg-gray-900 text-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-orange-300" />
                <h3 className="font-black text-base">Your Combo</h3>
              </div>
              {itemCount > 0 && (
                <button onClick={clearAll} className="text-[10px] font-bold uppercase tracking-wider text-white/60 hover:text-white inline-flex items-center gap-1">
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
            <p className="text-[11px] text-white/60 mt-1">
              {itemCount === 0 ? 'Empty — pick 2+ items below.' : `${itemCount} item${itemCount === 1 ? '' : 's'} ready to combo.`}
            </p>
          </div>
        )}

        {/* Progress bar */}
        {nextRule && itemCount > 0 && (
          <div className="px-5 pt-4">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider mb-1.5">
              <span className="text-orange-600">
                +{nextRule.min_items - itemCount} more to unlock
              </span>
              <span className="text-gray-700">
                {nextRule.extra_discount_type === 'percent'
                  ? `${nextRule.extra_discount_value}% off`
                  : `${formatPrice(nextRule.extra_discount_value)} off`}
              </span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {rule && (
          <div className="mx-5 mt-4 rounded-2xl bg-green-50 border border-green-200 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-green-700 flex items-center gap-1">
              <Sparkles size={11} /> Combo unlocked
            </p>
            <p className="text-sm font-black text-green-800 mt-0.5">{rule.name}</p>
            <p className="text-xs text-green-700 mt-0.5">
              You save {formatPrice(discount)} ({savePct}% off)
            </p>
          </div>
        )}

        {/* Item list */}
        <div className="px-5 py-4">
          {itemCount === 0 ? (
            <div className="py-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 flex items-center justify-center mb-2.5">
                <Layers size={20} className="text-stone-400" />
              </div>
              <p className="text-sm font-bold text-gray-600">Your combo is empty</p>
              <p className="text-xs text-gray-400 mt-0.5">Add 2 or more items to unlock discount.</p>
            </div>
          ) : (
            <ul className="space-y-2.5 max-h-[280px] overflow-auto pr-1 -mr-1">
              {Object.entries(picked).map(([id, qty]) => {
                const p = products.find(x => x.id === id);
                if (!p) return null;
                const img = Array.isArray(p.images) ? p.images[0] : '';
                return (
                  <li key={id} className="flex items-center gap-3 group">
                    <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                      {img && <img src={img} alt={p.name} loading="lazy" width={48} height={48} className="w-full h-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{formatPrice(Number(p.price))} × {qty}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => dec(id)} aria-label="Decrease"
                        className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-gray-700 transition">
                        <Minus size={11} strokeWidth={3} />
                      </button>
                      <span className="w-5 text-center text-xs font-black">{qty}</span>
                      <button onClick={() => inc(id)} aria-label="Increase"
                        className="w-6 h-6 rounded-md bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-gray-700 transition">
                        <Plus size={11} strokeWidth={3} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Totals */}
        {itemCount > 0 && (
          <div className="px-5 py-4 border-t border-stone-100 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span className="tabular-nums">{formatPrice(subtotal)}</span>
            </div>
            {rule && discount > 0 && (
              <div className="flex justify-between text-green-600 font-bold">
                <span className="truncate pr-2">{rule.name}</span>
                <span className="tabular-nums shrink-0">− {formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
              <span className="font-black text-gray-900">Total</span>
              <div className="text-right">
                {discount > 0 && <span className="text-xs text-gray-400 line-through mr-2 tabular-nums">{formatPrice(subtotal)}</span>}
                <span className="font-black text-xl text-orange-600 tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="px-5 pb-5">
          <button onClick={onCheckout} disabled={itemCount === 0}
            className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-black text-sm flex items-center justify-center gap-2 transition shadow-sm">
            <ShoppingCart size={16} /> {itemCount === 0 ? 'Pick items to continue' : 'Add combo & checkout'}
          </button>
          <Link to="/products" className="mt-2 block text-center text-[11px] font-bold text-gray-400 hover:text-orange-500 transition">
            ← Browse full catalog
          </Link>
        </div>
      </div>

      {/* Active rules — info card */}
      {rules.length > 0 && !embedded && (
        <div className="rounded-3xl bg-white border border-stone-200 p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Active combo deals</p>
          <ul className="space-y-3 text-xs">
            {rules.map(r => (
              <li key={r.id} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                  <Sparkles size={11} className="text-orange-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-gray-900 leading-tight">{r.name}</p>
                  <p className="text-gray-500 mt-0.5 leading-snug">
                    {r.min_items}+ items → {r.extra_discount_type === 'percent' ? `${r.extra_discount_value}% extra off` : `${formatPrice(r.extra_discount_value)} extra off`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
