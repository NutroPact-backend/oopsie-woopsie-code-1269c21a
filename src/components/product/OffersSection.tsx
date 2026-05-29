// @ts-nocheck
import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronDown, Tag, CreditCard, Layers, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/lib/utils';

type Offer = {
  id: string;
  title: string;
  badge_label: string;
  description: string;
  terms: string;
  type: 'percent' | 'fixed' | 'free_product';
  value: number;
  free_product_name: string;
  scope_type: string;
  scope_values: any;
  min_order_value: number;
  max_order_value: number;
  applies_to_flavors: string[];
  applies_to_sizes: string[];
  active: boolean;
  priority: number;
  starts_at?: string;
  expires_at?: string;
};

type PaymentOffer = {
  id: string; title: string; provider: string; description: string;
  code: string; max_cashback: number; logo: string; link: string;
};

type Props = {
  product: {
    _id?: string; id?: string; category?: string; price?: number;
    tags?: string[]; flavors?: string[]; sizes?: string[];
  };
  selectedFlavor?: string;
  selectedSize?: string;
};

function offerApplies(o: Offer, p: Props['product'], flavor?: string, size?: string): boolean {
  const now = new Date();
  if (o.starts_at && new Date(o.starts_at) > now) return false;
  if (o.expires_at && new Date(o.expires_at) < now) return false;

  const pid = p._id || p.id || '';
  const vals = Array.isArray(o.scope_values) ? o.scope_values : [];

  switch (o.scope_type) {
    case 'all': break;
    case 'product': if (!vals.includes(pid)) return false; break;
    case 'category': if (!vals.includes(p.category || '')) return false; break;
    case 'tag': {
      const tags = Array.isArray(p.tags) ? p.tags : [];
      if (!vals.some((v: string) => tags.includes(v))) return false;
      break;
    }
    case 'min_order': if ((p.price || 0) < (o.min_order_value || 0)) return false; break;
    case 'max_order': if ((p.price || 0) > (o.max_order_value || 0)) return false; break;
    default: return false;
  }

  const af = Array.isArray(o.applies_to_flavors) ? o.applies_to_flavors : [];
  if (af.length && flavor && !af.includes(flavor)) return false;
  const az = Array.isArray(o.applies_to_sizes) ? o.applies_to_sizes : [];
  if (az.length && size && !az.includes(size)) return false;

  return true;
}

function offerBadge(o: Offer): string {
  if (o.badge_label) return o.badge_label;
  if (o.type === 'percent') return `${o.value}% OFF`;
  if (o.type === 'fixed') return `${formatPrice(o.value)} OFF`;
  if (o.type === 'free_product') return 'FREE';
  return 'OFFER';
}

export default function OffersSection({ product, selectedFlavor, selectedSize }: Props) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [payOffers, setPayOffers] = useState<PaymentOffer[]>([]);
  const [hasCombo, setHasCombo] = useState(false);
  const [open, setOpen] = useState(true);
  const [openPay, setOpenPay] = useState(true);
  const [copied, setCopied] = useState<string>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [a, b, c] = await Promise.all([
        supabase.from('offers').select('*').eq('active', true).order('priority', { ascending: false }).limit(50),
        supabase.from('payment_offers').select('*').eq('active', true).order('sort_order', { ascending: true }).limit(20),
        supabase.from('combo_rules').select('id').eq('active', true).limit(1),
      ]);
      if (!alive) return;
      setOffers((a.data || []) as unknown as Offer[]);
      setPayOffers((b.data || []) as unknown as PaymentOffer[]);
      setHasCombo((c.data || []).length > 0);
    })();
    return () => { alive = false; };
  }, []);

  const matched = offers.filter(o => offerApplies(o, product, selectedFlavor, selectedSize));

  if (matched.length === 0 && payOffers.length === 0 && !hasCombo) return null;

  const copy = (code: string) => {
    if (!code) return;
    navigator.clipboard?.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(''), 1500);
  };

  return (
    <div className="space-y-3">
      {/* OFFERS */}
      {matched.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <button onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2.5">
              <Tag size={18} className="text-orange-500" />
              <span className="font-black text-sm text-gray-900">Offers & Benefits</span>
              <span className="text-xs text-orange-500 font-semibold">(Avail at cart)</span>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (
            <div className="px-4 pb-4 space-y-2.5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Offer</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {matched.map(o => (
                  <div key={o.id} className="flex items-start gap-2.5 rounded-xl border border-gray-200 px-3 py-2.5 hover:border-orange-300 transition group">
                    <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                      <Tag size={14} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">{o.title}</p>
                        <span className="shrink-0 text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                          {offerBadge(o)}
                        </span>
                      </div>
                      {o.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{o.description}</p>}
                      {o.terms && (
                        <details className="mt-1">
                          <summary className="text-[10px] font-bold text-gray-400 cursor-pointer hover:text-gray-600">T &amp; C</summary>
                          <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{o.terms}</p>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAYMENT OFFERS */}
      {payOffers.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <button onClick={() => setOpenPay(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2.5">
              <CreditCard size={18} className="text-blue-500" />
              <span className="font-black text-sm text-gray-900">Payment Offers</span>
            </div>
            <ChevronDown size={18} className={`text-gray-400 transition-transform ${openPay ? 'rotate-180' : ''}`} />
          </button>
          {openPay && (
            <div className="px-4 pb-4 space-y-2">
              {payOffers.map(po => {
                const card = (
                  <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/30 px-3 py-2.5 hover:bg-blue-50 transition">
                    {po.logo ? (
                      <img src={po.logo} alt={po.provider} loading="lazy" width={32} height={32} className="w-8 h-8 rounded object-contain shrink-0 bg-white" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-blue-100 flex items-center justify-center shrink-0">
                        <CreditCard size={14} className="text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 leading-tight">{po.title}</p>
                      {po.description && <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{po.description}</p>}
                    </div>
                    {po.code ? (
                      <button onClick={(e) => { e.preventDefault(); copy(po.code); }}
                        className="shrink-0 flex items-center gap-1 text-[11px] font-black text-blue-600 border border-blue-300 border-dashed rounded-md px-2 py-1 hover:bg-blue-100">
                        {copied === po.code ? <><Check size={11} /> COPIED</> : <><Copy size={11} /> {po.code}</>}
                      </button>
                    ) : null}
                  </div>
                );
                return po.link ? (
                  <a key={po.id} href={po.link} target="_blank" rel="noopener noreferrer" className="block">{card}</a>
                ) : (
                  <div key={po.id}>{card}</div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* COMBO CTA */}
      {hasCombo && (
        <Link to="/combo" className="block group">
          <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-orange-300 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-4 py-4 hover:border-orange-500 transition">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                <Layers size={20} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-gray-900 leading-tight">
                  Create your own combo <span className="ml-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black align-middle">EXTRA OFF</span>
                </p>
                <p className="text-xs text-gray-600 mt-0.5 leading-snug">Pick 2 or more products and unlock extra discount automatically.</p>
              </div>
              <span className="shrink-0 text-orange-500 font-black text-lg group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </div>
        </Link>
      )}
    </div>
  );
}
