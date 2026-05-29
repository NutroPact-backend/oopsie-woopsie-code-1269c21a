// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/store/cartStore";
import { formatPrice } from "@/lib/utils";
import { getGrowthBoosters } from "@/lib/growthBoosters.functions";

export default function EmptyCartUpsell() {
  const get = useServerFn(getGrowthBoosters);
  const [cfg, setCfg] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    get({}).then(setCfg).catch(() => {});
  }, []);

  useEffect(() => {
    const ec = cfg?.emptyCart;
    if (!ec?.enabled) return;
    let alive = true;
    (async () => {
      if (ec.productIds?.length) {
        const { data } = await supabase.from("products")
          .select("id,name,slug,price,compare_price,images,category")
          .in("id", ec.productIds);
        if (alive) setProducts(data || []);
      } else {
        const { data } = await supabase.from("products")
          .select("id,name,slug,price,compare_price,images,category")
          .order("ratings", { ascending: false }).limit(6);
        if (alive) setProducts(data || []);
      }
    })();
    return () => { alive = false; };
  }, [cfg]);

  if (!cfg?.emptyCart?.enabled || !products.length) return null;
  const ec = cfg.emptyCart;

  return (
    <div className="mt-10">
      <div className="text-center mb-5">
        <h2 className="text-xl sm:text-2xl font-black inline-flex items-center gap-2">
          <Sparkles className="text-orange-500" size={20} /> {ec.heading}
        </h2>
        {ec.subheading && <p className="text-sm text-gray-500 mt-1">{ec.subheading}</p>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {products.map((p: any) => (
          <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-2 hover:shadow-md transition flex flex-col">
            <Link to="/products/$slug" params={{ slug: p.slug }} className="block">
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden mb-1.5">
                {p.images?.[0]
                  ? <img src={p.images[0]} alt={p.name} width={160} height={160} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  : <div className="w-full h-full grid place-items-center text-2xl text-gray-200 font-black">NP</div>}
              </div>
              <p className="text-[11px] font-semibold line-clamp-2 leading-tight min-h-[2rem]">{p.name}</p>
              <p className="text-xs font-black mt-0.5">{formatPrice(p.price)}</p>
            </Link>
            <button onClick={() => addItem({ id: p.id, name: p.name, price: p.price, image: p.images?.[0] || '', flavor: '', size: '', quantity: 1, category: p.category })}
              className="mt-1.5 h-8 text-[11px] font-black rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition inline-flex items-center justify-center gap-1">
              <ShoppingCart size={11} /> {ec.ctaLabel || "Add to cart"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
