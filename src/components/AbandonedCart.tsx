// @ts-nocheck
import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, X, ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCartStore } from '@/store/cartStore';
import API from '@/lib/api';

const STORAGE_KEY = 'np_abandoned_cart_shown';

const DEFAULT_SETTINGS = {
  abandonedCartEnabled: true,
  abandonedCartDelay: 120,
  abandonedCartTitle: 'Items in your cart are going fast!',
  abandonedCartMessage: 'Complete your order before they sell out.',
  abandonedCartBtnText: 'Complete Purchase',
};

export default function AbandonedCart() {
  const [show, setShow] = useState(false);
  const [cfg, setCfg] = useState<typeof DEFAULT_SETTINGS>(DEFAULT_SETTINGS);
  const [location] = useLocation();
  const items = useCartStore(s => s.items);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    API.get('/settings').then(r => {
      const s = r.data;
      setCfg({
        abandonedCartEnabled: s.abandonedCartEnabled !== false,
        abandonedCartDelay: typeof s.abandonedCartDelay === 'number' ? s.abandonedCartDelay : DEFAULT_SETTINGS.abandonedCartDelay,
        abandonedCartTitle: s.abandonedCartTitle || DEFAULT_SETTINGS.abandonedCartTitle,
        abandonedCartMessage: s.abandonedCartMessage || DEFAULT_SETTINGS.abandonedCartMessage,
        abandonedCartBtnText: s.abandonedCartBtnText || DEFAULT_SETTINGS.abandonedCartBtnText,
      });
    }).catch(() => {});
  }, []);

  const onCheckoutOrCart = location === '/checkout' || location === '/cart';

  useEffect(() => {
    if (!cfg.abandonedCartEnabled) return;
    if (onCheckoutOrCart) return;
    if (items.length === 0) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShow(true);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }, cfg.abandonedCartDelay * 1000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cfg, items.length, onCheckoutOrCart]);

  if (!show || items.length === 0) return null;

  const previewItems = items.slice(0, 2);
  const extra = items.length - 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => setShow(false)}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 px-6 pt-6 pb-5 text-white">
          <button
            onClick={() => setShow(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <ShoppingCart size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-black leading-tight">{cfg.abandonedCartTitle}</h2>
          </div>
          <p className="text-orange-100 text-sm">{cfg.abandonedCartMessage}</p>
        </div>

        <div className="px-6 py-5">
          <div className="space-y-3 mb-5">
            {previewItems.map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0"  loading="lazy" decoding="async"/>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400">{item.flavor && `${item.flavor} · `}{item.size} · Qty {item.quantity}</p>
                </div>
                <p className="text-sm font-black text-orange-600 flex-shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
              </div>
            ))}
            {extra > 0 && (
              <p className="text-xs text-gray-400 text-center">+{extra} more item{extra > 1 ? 's' : ''} in cart</p>
            )}
          </div>

          <Link
            href="/checkout"
            onClick={() => setShow(false)}
            className="flex items-center justify-center gap-2 w-full bg-orange-500 text-white font-black py-3.5 rounded-xl text-base hover:bg-orange-600 transition-colors"
          >
            {cfg.abandonedCartBtnText}
            <ArrowRight size={18} />
          </Link>

          <button
            onClick={() => setShow(false)}
            className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors underline"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
