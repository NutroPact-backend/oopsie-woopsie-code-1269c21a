// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { Flame, Eye, ShoppingCart, TrendingUp } from "lucide-react";
import { listPublicUrgencyWidgets, getProductUrgencyStats } from "@/lib/urgencyWidgets.functions";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

type Widget = {
  id: string;
  widget_type: "low_stock" | "recent_purchase" | "live_viewers" | "cart_urgency";
  label_template: string;
  icon?: string | null;
  color?: string | null;
  bg_color?: string | null;
  animation: "none" | "pulse" | "shake" | "fade";
  threshold?: number | null;
  min_to_show: number;
  window_hours: number;
  exclude_product_ids: string[];
  include_product_ids: string[];
};

function isLite() {
  if (typeof navigator === "undefined") return false;
  const c = (navigator as any).connection;
  return !!(c?.saveData || /(^|-)2g$/.test(c?.effectiveType ?? ""));
}

function renderTemplate(tpl: string, vars: Record<string, string | number>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const ICONS: Record<string, any> = { flame: Flame, eye: Eye, cart: ShoppingCart, trend: TrendingUp };

export default function UrgencyStack({ productId, stock }: { productId: string; stock: number }) {
  const { isEnabled } = useFeatureFlags();
  const listFn = useServerFn(listPublicUrgencyWidgets);
  const statsFn = useServerFn(getProductUrgencyStats);
  const flagOn = isEnabled("urgency_stack");

  const { data: widgetsRes } = useQuery({
    queryKey: ["urgency-widgets"],
    queryFn: () => listFn({}),
    staleTime: 5 * 60_000,
    enabled: flagOn,
  });

  const widgets = (widgetsRes?.widgets ?? []) as unknown as Widget[];

  const needsStats = widgets.some((w) => w.widget_type === "recent_purchase" || w.widget_type === "cart_urgency");
  const windowHours = Math.max(...widgets.map((w) => w.window_hours), 24);

  const { data: stats } = useQuery({
    queryKey: ["urgency-stats", productId, windowHours],
    queryFn: () => statsFn({ data: { product_id: productId, window_hours: windowHours } }),
    staleTime: 60_000,
    enabled: flagOn && needsStats && !isLite(),
  });

  const visible = useMemo(() => {
    return widgets.filter((w) => {
      if (w.exclude_product_ids.includes(productId)) return false;
      if (w.include_product_ids.length > 0 && !w.include_product_ids.includes(productId)) return false;
      if (w.widget_type === "low_stock") {
        const t = w.threshold ?? 10;
        return stock > 0 && stock <= t;
      }
      if (w.widget_type === "recent_purchase") {
        return (stats?.purchase_count ?? 0) >= w.min_to_show;
      }
      if (w.widget_type === "cart_urgency") return false; // future hook
      if (w.widget_type === "live_viewers") return false; // realtime opt-in (future)
      return false;
    });
  }, [widgets, productId, stock, stats]);

  if (!flagOn || visible.length === 0) return null;

  return (
    <div className="space-y-2 my-3">
      {visible.map((w) => {
        const vars: Record<string, string | number> = {
          stock,
          count: stats?.purchase_count ?? 0,
          hours: w.window_hours,
        };
        const text = renderTemplate(
          w.label_template ||
            (w.widget_type === "low_stock"
              ? "🔥 Only {stock} left in stock!"
              : "🛒 {count} people bought this in last {hours}h"),
          vars,
        );
        const Icon = ICONS[w.icon ?? ""] ?? Flame;
        const anim =
          w.animation === "pulse" && !isLite() ? "animate-pulse" :
          w.animation === "fade" && !isLite() ? "animate-fade-in" : "";
        const color = w.color ?? "#dc2626";
        const bg = w.bg_color ?? "#fef2f2";
        return (
          <div
            key={w.id}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-bold ${anim}`}
            style={{ backgroundColor: bg, color, border: `1px solid ${color}33` }}
          >
            <Icon size={16} className="shrink-0" />
            <span>{text}</span>
            {w.widget_type === "low_stock" && w.threshold ? (
              <div className="ml-auto h-1.5 w-20 rounded-full bg-white/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (stock / w.threshold) * 100)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
