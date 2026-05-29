import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShoppingCart, Sparkles } from "lucide-react";

/**
 * Subscribes to realtime site_events INSERTs and pops a toast for every new
 * purchase. Mount once inside <AdminPage />. Self-cleans on unmount.
 */
export default function LiveOrderToaster() {
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const channel = (supabase as any)
      .channel("admin-live-orders")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "site_events",
          filter: "event_type=in.(purchase,order_placed)",
        },
        (payload: any) => {
          if (!mounted.current) return;
          const row = payload.new || {};
          const amount = Number(row.value || 0);
          toast.success(
            row.product_name
              ? `New order: ${row.product_name}`
              : "New order received",
            {
              description: amount
                ? `₹${amount.toFixed(0)}${row.quantity ? ` · qty ${row.quantity}` : ""}`
                : "Tap Orders tab to view",
              icon: <ShoppingCart size={16} />,
              duration: 6000,
            },
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notification_queue",
          filter: "template=eq.daily_sales_digest",
        },
        (payload: any) => {
          if (!mounted.current) return;
          const p = payload.new?.payload || {};
          toast(
            `Daily digest: ₹${Number(p.revenue || 0).toFixed(0)} · ${p.orders || 0} orders`,
            {
              description: `AOV ₹${p.aov || 0} · ${p.visitors || 0} visitors · ${p.conversion_pct || 0}% conv`,
              icon: <Sparkles size={16} />,
              duration: 10000,
            },
          );
        },
      )
      .subscribe();

    return () => {
      mounted.current = false;
      try { (supabase as any).removeChannel(channel); } catch { /* noop */ }
    };
  }, []);

  return null;
}