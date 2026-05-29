// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Trash2, ShoppingBag, Heart, Tag, Truck, ShieldCheck, RotateCcw,
  Sparkles, X, Check, MapPin, Loader2,
} from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useSEO } from '@/lib/useSEO';
import { supabase } from '@/integrations/supabase/client';
import API from '@/lib/api';
import QuickCheckoutBar from '@/components/cart/QuickCheckoutBar';
import EmptyCartUpsell from '@/components/cart/EmptyCartUpsell';
import { T } from '@/lib/useContentT';

const FREE_SHIPPING_THRESHOLD = 999;
const SHIPPING_FEE = 99;

type Coupon = {
  code: string;
  type: 'percent' | 'flat' | string;
  value: number;
  label?: string;
  min_order_value?: number;
  max_discount?: number;
};

function calcDiscount(subtotal: number, c: Coupon | null): number {
  if (!c) return 0;
  if (subtotal < (c.min_order_value || 0)) return 0;
  const raw = c.type === 'percent' ? Math.round((subtotal * c.value) / 100) : c.value;
  return c.max_discount ? Math.min(raw, c.max_discount) : raw;
}

// ─── Free-shipping milestone bar ──────────────────────────────────────────
function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const reached = subtotal >= FREE_SHIPPING_THRESHOLD;
  const pct = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));
  return (
    <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
        <Truck size={16} className="text-orange-500" />
        {reached ? (
          <span className="text-green-700">🎉 You unlocked <span className="font-black">FREE delivery</span>!</span>
        ) : (
          <span>Add <span className="text-orange-600 font-black">{formatPrice(FREE_SHIPPING_THRESHOLD - subtotal)}</span> more for <span className="font-black">FREE delivery</span></span>
        )}
      </div>
      <div className="h-2 bg-white rounded-full overflow-hidden border border-orange-100">
        <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Coupon panel ─────────────────────────────────────────────────────────
function CouponPanel({ subtotal, applied, onApply, onRemove }: {
  subtotal: number; applied: Coupon | null;
  onApply: (c: Coupon) => void; onRemove: () => void;
}) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [suggest, setSuggest] = useState<Coupon[]>([]);

  useEffect(() => {
    supabase.from('coupons').select('code,type,value,label,min_order_value,max_discount,expires_at')
      .eq('active', true).eq('is_public', true).limit(5)
      .then(({ data }) => {
        const now = new Date();
        const valid = (data || []).filter((c: any) => !c.expires_at || new Date(c.expires_at) > now) as Coupon[];
        // sort by best savings for current subtotal
        valid.sort((a, b) => calcDiscount(subtotal, b) - calcDiscount(subtotal, a));
        setSuggest(valid);
      });
  }, [subtotal]);

  const apply = async (input?: string) => {
    const c = (input ?? code).trim().toUpperCase();
    if (!c) return;
    setBusy(true); setErr('');
    const { data, error } = await supabase.from('coupons')
      .select('code,type,value,label,min_order_value,max_discount,expires_at,active')
      .ilike('code', c).maybeSingle();
    setBusy(false);
    if (error || !data || !data.active) { setErr('Invalid coupon code'); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setErr('This coupon has expired'); return; }
    if (subtotal < (data.min_order_value || 0)) {
      setErr(`Min order ${formatPrice(data.min_order_value || 0)} required for this coupon`); return;
    }
    onApply(data as Coupon); setCode(''); setErr('');
  };

  if (applied) {
    const saved = calcDiscount(subtotal, applied);
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-3">
        <div className="bg-green-500 rounded-full p-1.5 text-white shrink-0"><Check size={14} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-green-800">{applied.code} applied</p>
          <p className="text-xs text-green-700">You're saving {formatPrice(saved)} 🎉</p>
        </div>
        <button onClick={onRemove} aria-label="Remove coupon" className="text-green-700 hover:text-green-900"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Tag size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter coupon code"
            className="w-full pl-9 pr-3 h-10 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400 uppercase" />
        </div>
        <button onClick={() => apply()} disabled={busy || !code.trim()}
          className="h-10 px-4 bg-gray-900 text-white text-xs font-black rounded-xl hover:bg-gray-700 transition disabled:opacity-40 inline-flex items-center gap-1">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'APPLY'}
        </button>
      </div>
      {err && <p className="text-xs text-red-500 font-semibold">{err}</p>}
      {suggest.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {suggest.slice(0, 3).map((c) => {
            const save = calcDiscount(subtotal, c);
            const ok = save > 0;
            return (
              <button key={c.code} onClick={() => apply(c.code)} disabled={!ok}
                className={`group text-[11px] font-bold px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 transition ${ok ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100' : 'border-gray-200 bg-gray-50 text-gray-400'}`}
                title={c.label || ''}>
                <Sparkles size={10} /> {c.code}
                {ok && <span className="text-green-600">-{formatPrice(save)}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Delivery estimator ───────────────────────────────────────────────────
function DeliveryEstimator() {
  const [pin, setPin] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('np-pin') || '' : ''));
  const [info, setInfo] = useState<{ label: string; days: string; cod: boolean } | null>(null);

  useEffect(() => {
    if (pin.length !== 6) { setInfo(null); return; }
    if (typeof window !== 'undefined') localStorage.setItem('np-pin', pin);
    // Quick zone heuristic by first 2 digits — extended delivery for himalayas / NE
    const p2 = pin.slice(0, 2);
    const ext = ['17', '18', '19', '74', '77', '78', '79', '89', '90', '91', '92', '93'].includes(p2);
    const tier1 = ['11', '10', '12', '13', '40', '41', '42', '56', '60', '50', '70', '38'].includes(p2);
    if (ext) setInfo({ label: 'Extended zone', days: '5–8 business days', cod: false });
    else if (tier1) setInfo({ label: 'Express delivery', days: '1–2 business days', cod: true });
    else setInfo({ label: 'Standard delivery', days: '2–4 business days', cod: true });
  }, [pin]);

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4">
      <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5"><MapPin size={14} className="text-orange-500" /> Check delivery</p>
      <div className="flex gap-2">
        <input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="6-digit pincode"
          className="flex-1 h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-orange-400" />
      </div>
      {info && (
        <div className="mt-2 text-xs">
          <p className="font-bold text-green-700">✓ Delivers to {pin}</p>
          <p className="text-gray-500 mt-0.5">{info.label} · {info.days} {info.cod && <span className="ml-1 text-green-600 font-semibold">• COD available</span>}</p>
        </div>
      )}
    </div>
  );
}

// ─── Recommended add-ons (frequently bought together) ─────────────────────
function Recommendations({ excludeIds }: { excludeIds: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  useEffect(() => {
    if (!excludeIds.length) { setItems([]); return; }
    let alive = true;
    import('@/lib/recommendations.functions').then(({ getFrequentlyBoughtTogether, getTrendingProducts }) => {
      getFrequentlyBoughtTogether({ data: { productIds: excludeIds, limit: 6 } } as any)
        .then((r: any) => alive && setItems(r?.items || []))
        .catch(async () => {
          try {
            const t = await getTrendingProducts({ data: { limit: 6 } } as any);
            if (alive) setItems((t?.items || []).filter((p: any) => !excludeIds.includes(p.id)));
          } catch { if (alive) setItems([]); }
        });
    });
    return () => { alive = false; };
  }, [excludeIds.join(',')]);
  if (!items.length) return null;
  return (
    <div className="mt-10">
      <h2 className="text-lg sm:text-xl font-black mb-4">Frequently bought together</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {items.map((p: any) => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-2 hover:shadow-md transition flex flex-col">
            <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-1.5">
                {p.images?.[0] ? <img src={p.images[0]} alt={p.name} width={160} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-2xl text-gray-200 font-black">NP</div>}
              </div>
              <p className="text-[11px] font-semibold line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
              <p className="text-xs font-black mt-0.5">{formatPrice(p.price)}</p>
            </Link>
            <button onClick={() => addItem({ id: p.id, name: p.name, price: p.price, image: p.images?.[0] || '', flavor: '', size: '', quantity: 1, category: p.category, pixels: p.pixels })}
              className="mt-1.5 h-7 text-[11px] font-black rounded-lg border-2 border-gray-900 hover:bg-gray-900 hover:text-white transition">
              + Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Saved-for-later strip ────────────────────────────────────────────────
function SavedForLater() {
  const { items, remove } = useWishlistStore();
  const addItem = useCartStore((s) => s.addItem);
  if (!items.length) return null;
  return (
    <div className="mt-8">
      <h2 className="text-base font-black mb-3 flex items-center gap-2"><Heart size={16} className="text-red-500 fill-red-500" /> <T>Saved for later</T> ({items.length})</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.id} className="bg-white border border-gray-100 rounded-xl p-3 flex gap-3">
            <Link to="/products/$slug" params={{ slug: it.slug }} className="shrink-0">
              <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden">
                {it.image ? <img src={it.image} alt={it.name} width={64} height={64} loading="lazy" decoding="async" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-xs font-black text-gray-300">NP</div>}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold line-clamp-2">{it.name}</p>
              <p className="text-xs font-black mt-1">{formatPrice(it.price)}</p>
              <div className="flex gap-1 mt-1.5">
                <button onClick={() => { addItem({ id: it.id, name: it.name, price: it.price, image: it.image, flavor: '', size: '', quantity: 1, category: it.category, pixels: it.pixels }); remove(it.id); }}
                  className="text-[10px] font-black px-2 py-1 rounded-md bg-gray-900 text-white hover:bg-gray-700 transition">Move to cart</button>
                <button onClick={() => remove(it.id)} aria-label="Remove from saved" className="text-gray-400 hover:text-red-500"><X size={12} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main CartPage ────────────────────────────────────────────────────────
export default function CartPage() {
  const { items, removeItem, updateQuantity, total, count, clearCart, addItem } = useCartStore();
  const wishlist = useWishlistStore();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [recovered, setRecovered] = useState<{ count: number } | null>(null);

  useSEO({
    title: 'Your Cart',
    description: 'Review items in your NutroPact cart and proceed to secure checkout. Free delivery above ₹999.',
  });

  // ── Abandoned-cart recovery: /cart?recover=<token> ──────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('recover');
    const couponParam = params.get('coupon');

    // Auto-apply incoming coupon from recovery link (even if no token)
    if (couponParam && !coupon) {
      (async () => {
        const { data } = await supabase.from('coupons')
          .select('code,type,value,label,min_order_value,max_discount,expires_at,active')
          .eq('code', couponParam.toUpperCase())
          .maybeSingle();
        if (data && data.active && (!data.expires_at || new Date(data.expires_at) > new Date())) {
          setCoupon({
            code: data.code, type: data.type as any, value: Number(data.value),
            label: data.label || '', min_order_value: Number(data.min_order_value || 0),
            max_discount: data.max_discount != null ? Number(data.max_discount) : undefined,
          });
        }
      })();
    }

    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('abandoned_carts')
          .select('id, items, status')
          .eq('recovery_token', token)
          .maybeSingle();
        if (cancelled || error || !data) return;
        const cartItems: any[] = Array.isArray(data.items) ? data.items : [];
        if (!cartItems.length) return;

        let added = 0;
        for (const it of cartItems) {
          addItem({
            id: it.id || it.productId || '',
            name: it.name || 'Product',
            price: Number(it.price) || 0,
            image: it.image || '',
            flavor: it.flavor || '',
            size: it.size || '',
            quantity: Math.max(1, Number(it.quantity) || 1),
            category: it.category,
          });
          added += 1;
        }

        await supabase
          .from('abandoned_carts')
          .update({ status: 'recovered', recovered_at: new Date().toISOString() })
          .eq('id', data.id);

        if (!cancelled) setRecovered({ count: added });

        const url = new URL(window.location.href);
        url.searchParams.delete('recover');
        url.searchParams.delete('coupon');
        window.history.replaceState({}, '', url.toString());
      } catch {
        // silent — recovery is best-effort
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const subtotal = total();
  const discount = calcDiscount(subtotal, coupon);
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const grandTotal = afterDiscount + shipping;

  const itemIds = useMemo(() => items.map((i) => i.id), [items]);

  // ── Empty cart ─────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 mx-auto bg-orange-50 rounded-full grid place-items-center mb-4">
            <ShoppingBag size={36} className="text-orange-500" />
          </div>
          <h1 className="text-2xl font-black mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Looks like you haven't added anything yet. Explore our bestsellers!</p>
          <Link to="/products" className="inline-block bg-orange-500 text-white px-8 py-3 rounded-full font-black hover:bg-orange-600 transition">
            Shop Now
          </Link>
        </div>
        <EmptyCartUpsell />
        <SavedForLater />
        <Recommendations excludeIds={[]} />
      </div>
    );
  }

  const moveToWishlist = (item: typeof items[number]) => {
    wishlist.add({ id: item.id, name: item.name, price: item.price, image: item.image, slug: '', category: item.category, pixels: item.pixels });
    removeItem(item.id, item.flavor, item.size);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-10 pb-32 md:pb-10">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight"><T>Your Cart</T></h1>
          <p className="text-sm text-gray-500 mt-0.5">{count()} item{count() !== 1 ? 's' : ''} • Review before checkout</p>
        </div>
        <button onClick={clearCart} className="text-xs text-gray-400 hover:text-red-500 font-semibold hidden sm:inline"><T>Clear cart</T></button>
      </div>

      {recovered && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-900 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm">
          <Check size={16} className="text-green-600 shrink-0" />
          <span className="font-semibold">Welcome back! We restored {recovered.count} item{recovered.count !== 1 ? 's' : ''} from your last visit.</span>
        </div>
      )}

      <FreeShippingBar subtotal={afterDiscount} />

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 mt-6">
        {/* ── Items list ───────────────────────────────────────────── */}
        <div className="space-y-3">
          {items.map((item, i) => {
            const lineTotal = item.price * item.quantity;
            return (
              <div key={`${item.id}-${item.flavor}-${item.size}-${i}`} className="bg-white rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-100 flex gap-3 sm:gap-4">
                <Link to="/products" className="shrink-0">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-xl overflow-hidden">
                    {item.image
                      ? <img src={item.image} alt={item.name} width={96} height={96} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                      : <div className="w-full h-full grid place-items-center text-2xl">🥛</div>}
                  </div>
                </Link>
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-bold text-sm sm:text-base line-clamp-2 leading-snug">{item.name}</h3>
                  {(item.flavor || item.size) && (
                    <p className="text-gray-500 text-xs mt-0.5">{[item.flavor, item.size].filter(Boolean).join(' • ')}</p>
                  )}
                  <p className="font-black text-sm sm:text-base mt-1">{formatPrice(item.price)} <span className="text-xs text-gray-400 font-normal">each</span></p>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-auto pt-2">
                    <div className="inline-flex items-center border border-gray-200 rounded-full overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, item.flavor, item.size, Math.max(1, item.quantity - 1))}
                        aria-label="Decrease quantity"
                        className="w-7 h-7 sm:w-8 sm:h-8 grid place-items-center font-black text-gray-700 hover:bg-gray-100 disabled:opacity-30" disabled={item.quantity <= 1}>−</button>
                      <span className="w-7 sm:w-8 text-center text-sm font-black">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.flavor, item.size, item.quantity + 1)}
                        aria-label="Increase quantity"
                        className="w-7 h-7 sm:w-8 sm:h-8 grid place-items-center font-black text-gray-700 hover:bg-gray-100">+</button>
                    </div>
                    <button onClick={() => moveToWishlist(item)}
                      className="text-[11px] sm:text-xs font-bold text-gray-600 hover:text-red-500 inline-flex items-center gap-1">
                      <Heart size={12} /> <T>Save for later</T>
                    </button>
                    <button onClick={() => removeItem(item.id, item.flavor, item.size)}
                      className="text-[11px] sm:text-xs font-bold text-gray-400 hover:text-red-500 inline-flex items-center gap-1">
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm sm:text-base font-black">{formatPrice(lineTotal)}</p>
                </div>
              </div>
            );
          })}

          <DeliveryEstimator />

          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-2">
            {[
              { icon: ShieldCheck, label: '100% Secure', sub: 'SSL checkout' },
              { icon: RotateCcw, label: 'Easy Returns', sub: '7-day window' },
              { icon: Truck, label: 'Fast Delivery', sub: 'Pan-India' },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl p-2 sm:p-3 text-center">
                <Icon size={16} className="mx-auto text-orange-500" />
                <p className="text-[11px] sm:text-xs font-black mt-1">{label}</p>
                <p className="text-[10px] text-gray-400 hidden sm:block">{sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Order summary ────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-24 h-fit space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-black">Order Summary</h2>

            <CouponPanel subtotal={subtotal} applied={coupon} onApply={setCoupon} onRemove={() => setCoupon(null)} />

            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-600">Subtotal ({count()} items)</span><span className="font-semibold">{formatPrice(subtotal)}</span></div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Coupon ({coupon?.code})</span><span className="font-semibold">−{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className={shipping === 0 ? 'text-green-600 font-black' : 'font-semibold'}>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between text-base sm:text-lg font-black border-t border-gray-100 pt-3">
                <span>Total</span><span>{formatPrice(grandTotal)}</span>
              </div>
              <p className="text-[11px] text-gray-400 text-right">Inclusive of all taxes</p>
              {discount > 0 && (
                <p className="text-xs text-green-700 font-bold bg-green-50 rounded-lg px-2 py-1 text-center">You saved {formatPrice(discount)} on this order 🎉</p>
              )}
            </div>

            <QuickCheckoutBar amount={grandTotal} coupon={coupon?.code} />

            <button onClick={() => navigate({ to: '/checkout', search: coupon ? { coupon: coupon.code } as any : undefined })}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-center py-3.5 rounded-full font-black text-base transition shadow-sm shadow-orange-200">
              Proceed to Checkout →
            </button>
            <Link to="/products" className="block text-center text-xs font-bold text-gray-500 hover:text-gray-800">Continue shopping</Link>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3 text-[11px] text-gray-500 text-center">
            We accept UPI, Cards, Net Banking & COD. <br />Need help? <Link to="/contact" className="text-orange-600 font-bold underline">Contact us</Link>
          </div>
        </aside>
      </div>

      <SavedForLater />
      <Recommendations excludeIds={itemIds} />

      {/* ── Mobile sticky checkout bar ─────────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex-1">
          <p className="text-[11px] text-gray-500 leading-none">Total</p>
          <p className="text-lg font-black leading-tight">{formatPrice(grandTotal)}</p>
          {discount > 0 && <p className="text-[10px] text-green-700 font-bold leading-none">Saved {formatPrice(discount)}</p>}
        </div>
        <button onClick={() => navigate({ to: '/checkout', search: coupon ? { coupon: coupon.code } as any : undefined })}
          className="flex-[1.2] bg-orange-500 text-white py-3 rounded-full font-black text-sm hover:bg-orange-600 transition">
          Checkout →
        </button>
      </div>
    </div>
  );
}
