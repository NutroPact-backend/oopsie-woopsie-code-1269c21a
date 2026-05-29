// @ts-nocheck
import { ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { trackAddToCart } from '@/lib/analytics';

interface QuickBuyProduct {
  _id: string;
  name: string;
  price: number;
  slug?: string;
  images?: string[];
  category?: string;
  stock?: number;
  pixels?: any;
}

/**
 * Compact Add-to-Cart + Buy-Now action row used on every product card across the site
 * (home featured, search, related, etc). Stops link propagation so it never opens the PDP.
 */
export default function QuickBuyButtons({
  product,
  size = 'md',
  className = '',
}: { product: QuickBuyProduct; size?: 'sm' | 'md'; className?: string }) {
  const addItem = useCartStore(s => s.addItem);
  const oos = (product.stock ?? 1) === 0;

  const add = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (oos) return;
    addItem({
      id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || '',
      flavor: '',
      size: '',
      quantity: 1,
      category: product.category,
      pixels: product.pixels,
    });
    trackAddToCart({
      id: product._id,
      name: product.name,
      price: product.price,
      category: product.category,
      pixels: product.pixels,
    });
  };
  const buy = (e: React.MouseEvent) => {
    add(e);
    if (typeof window !== 'undefined') window.location.href = '/checkout';
  };

  const h = size === 'sm' ? 'h-8 text-[11px]' : 'h-9 text-xs';
  const ic = size === 'sm' ? 12 : 13;

  return (
    <div className={`flex gap-2 ${className}`}>
      <button onClick={add} disabled={oos} aria-label="Add to cart"
        className={`flex-1 ${h} inline-flex items-center justify-center gap-1 rounded-xl border-2 border-gray-900 text-gray-900 font-black hover:bg-gray-900 hover:text-white transition disabled:opacity-40 disabled:cursor-not-allowed`}>
        <ShoppingCart size={ic} /> Add
      </button>
      <button onClick={buy} disabled={oos} aria-label="Buy now"
        className={`flex-1 ${h} inline-flex items-center justify-center gap-1 rounded-xl bg-orange-500 text-white font-black hover:bg-orange-600 transition disabled:opacity-40 disabled:cursor-not-allowed`}>
        <Zap size={ic} /> Buy
      </button>
    </div>
  );
}
