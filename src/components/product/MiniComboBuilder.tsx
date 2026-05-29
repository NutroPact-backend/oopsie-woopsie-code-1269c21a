// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Layers, Plus, Check, Sparkles, ShoppingCart, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';

type P = {
  id: string; name: string; slug: string; price: number; compare_price?: number;
  category: string; images: any; stock_count: number;
};
type ComboRule = {
  id: string; name: string; min_items: number; max_items: number;
  extra_discount_type: 'percent' | 'fixed';
  extra_discount_value: number;
  eligible_categories: string[]; eligible_product_ids: string[];
  sort_order: number;
};

function applies(r: ComboRule, picked: P[]): boolean {
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
function bestRule(rules: ComboRule[], picked: P[]) {
  const subtotal = picked.reduce((s, p) => s + Number(p.price), 0);
  let best: { rule: ComboRule | null; discount: number } = { rule: null, discount: 0 };
  for (const r of rules) {
    if (!applies(r, picked)) continue;
    const d = r.extra_discount_type === 'percent'
      ? Math.round(subtotal * (r.extra_discount_value / 100))
      : Math.min(subtotal, r.extra_discount_value);
    if (d > best.discount) best = { rule: r, discount: d };
  }
  return best;
}

/**
 * Mini combo builder that lives on the PDP. The current product is locked-in
 * as item #1. Customer picks 1+ extra items to unlock the auto-applied combo
 * discount. Compact version of /combo, designed to fit inside the product page.
 */
export default function MiniComboBuilder({ currentProductId, currentProduct }: {
  currentProductId: string;
  currentProduct: { name: string; price: number; image?: string; category?: string; slug?: string };
}) {
  const [others, setOthers] = useState<P[]>([]);
  const [rules, setRules] = useState<ComboRule[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const addItem = useCartStore(s => s.addItem);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [pr, rl] = await Promise.all([
        supabase
          .from('products')
          .select('id,name,slug,price,compare_price,category,images,stock_count')
          .eq('is_active', true)
          .neq('id', currentProductId)
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('combo_rules')
          .select('*')
          .eq('active', true)
          .order('sort_order', { ascending: true }),
      ]);
      if (!alive) return;
      setOthers((pr.data || []) as any);
      setRules((rl.data || []) as any);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [currentProductId]);

  const currentAsP: P = {
    id: currentProductId,
    name: currentProduct.name,
    slug: currentProduct.slug || '',
    price: Number(currentProduct.price),
    category: currentProduct.category || '',
    images: currentProduct.image ? [currentProduct.image] : [],
    stock_count: 1,
  };

  const pickedList = useMemo(
    () => [currentAsP, ...others.filter(p => picked[p.id])],
    [picked, others, currentAsP]
  );

  const subtotal = pickedList.reduce((s, p) => s + Number(p.price), 0);
  const { rule, discount } = bestRule(rules, pickedList);
  const total = Math.max(0, subtotal - discount);

  // The next-best rule preview to nudge the user
  const nextRulePreview = useMemo(() => {
    if (rule) return null;
    const candidates = rules
      .map(r => ({ r, need: r.min_items - pickedList.length }))
      .filter(x => x.need > 0)
      .sort((a, b) => a.need - b.need);
    return candidates[0]?.r || null;
  }, [rules, rule, pickedList.length]);

  const toggle = (id: string) => setPicked(p => ({ ...p, [id]: !p[id] }));

  const addAll = () => {
    if (pickedList.length < 2) return;
    setBusy(true);
    try {
      for (const p of pickedList) {
        addItem({
          id: p.id,
          name: p.name,
          price: Number(p.price),
          image: Array.isArray(p.images) ? p.images[0] : '',
          flavor: '', size: '', quantity: 1,
          category: p.category,
        } as any);
      }
      if (discount > 0) {
        if (typeof window !== 'undefined') {
          window.location.href = '/cart';
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5 animate-pulse h-44" />
    );
  }
  if (others.length === 0 || rules.length === 0) return null;

  const selectedCount = pickedList.length;
  const slotsToShow = Math.min(others.length, 6);

  return (
    <section className="rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-amber-50/40 to-white p-4 sm:p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 bg-white border border-orange-200 rounded-full px-2.5 py-1">
            <Sparkles size={11} /> Combo Builder
          </div>
          <h3 className="mt-2 text-lg sm:text-xl font-black tracking-tight text-gray-900 leading-tight">
            Pair it. <span className="text-orange-600">Save more.</span>
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Add 1+ item to unlock extra combo discount — auto-applied at checkout.
          </p>
        </div>
        <Link to="/combo"
          className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 shrink-0 mt-1">
          Full builder <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-none" style={{ scrollbarWidth: 'none' }}>
        <div className="snap-start shrink-0 w-[112px] sm:w-[124px] rounded-2xl bg-gray-900 text-white p-2.5 relative">
          <div className="aspect-square w-full rounded-xl bg-white/10 overflow-hidden mb-2">
            {currentProduct.image && (
              <img src={currentProduct.image} alt={currentProduct.name}
                loading="lazy" width={120} height={120}
                className="w-full h-full object-cover" />
            )}
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-orange-300 flex items-center gap-1">
            <Lock size={10} /> This item
          </p>
          <p className="text-[11px] font-bold leading-tight line-clamp-2 mt-0.5">{currentProduct.name}</p>
          <p className="text-xs font-black text-orange-300 mt-1">{formatPrice(Number(currentProduct.price))}</p>
        </div>

        {others.slice(0, slotsToShow).map(p => {
          const on = !!picked[p.id];
          const img = Array.isArray(p.images) ? p.images[0] : '';
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              aria-pressed={on}
              className={`snap-start shrink-0 w-[112px] sm:w-[124px] rounded-2xl border-2 p-2.5 text-left transition relative ${
                on
                  ? 'border-orange-500 bg-white shadow-md'
                  : 'border-dashed border-orange-200 bg-white/70 hover:border-orange-400'
              }`}
            >
              <div className="aspect-square w-full rounded-xl bg-gray-100 overflow-hidden mb-2 relative">
                {img && (
                  <img src={img} alt={p.name}
                    loading="lazy" width={120} height={120}
                    className={`w-full h-full object-cover transition ${on ? '' : 'opacity-80'}`} />
                )}
                <span className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition ${
                  on ? 'bg-orange-500 text-white' : 'bg-white/95 text-gray-700 border border-gray-200'
                }`}>
                  {on ? <Check size={13} strokeWidth={3} /> : <Plus size={13} strokeWidth={3} />}
                </span>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{p.category}</p>
              <p className="text-[11px] font-bold text-gray-900 leading-tight line-clamp-2 mt-0.5">{p.name}</p>
              <p className="text-xs font-black text-gray-900 mt-1">{formatPrice(Number(p.price))}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-white border border-orange-100 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Layers size={14} className="text-orange-500" />
            <span><b className="text-gray-900">{selectedCount}</b> item{selectedCount === 1 ? '' : 's'} in combo</span>
          </div>
          <div className="text-right">
            {discount > 0 ? (
              <p className="text-[10px] font-black uppercase tracking-wider text-green-600">
                You save {formatPrice(discount)}
              </p>
            ) : nextRulePreview ? (
              <p className="text-[10px] font-bold text-orange-600">
                Add {nextRulePreview.min_items - selectedCount} more to unlock {' '}
                {nextRulePreview.extra_discount_type === 'percent'
                  ? `${nextRulePreview.extra_discount_value}% off`
                  : `${formatPrice(nextRulePreview.extra_discount_value)} off`}
              </p>
            ) : (
              <p className="text-[10px] font-bold text-gray-400">Pick a peer to start</p>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Combo total</p>
            <div className="flex items-baseline gap-2">
              {discount > 0 && (
                <span className="text-xs text-gray-400 line-through">{formatPrice(subtotal)}</span>
              )}
              <span className="text-xl sm:text-2xl font-black text-gray-900">{formatPrice(total)}</span>
            </div>
          </div>
          <button
            onClick={addAll}
            disabled={selectedCount < 2 || busy}
            className="h-11 px-4 sm:px-5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-black inline-flex items-center gap-2 transition shrink-0"
          >
            <ShoppingCart size={14} />
            {selectedCount < 2 ? 'Pick 1+ to add' : 'Add combo'}
          </button>
        </div>
      </div>

      <Link to="/combo"
        className="sm:hidden mt-3 flex items-center justify-center gap-1.5 text-[11px] font-bold text-orange-600">
        Open full combo builder <ArrowRight size={12} />
      </Link>
    </section>
  );
}
