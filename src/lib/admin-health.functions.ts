// @ts-nocheck
/**
 * Admin Health server functions — cron status, security events,
 * notification queue stats. Admin-only via has_role check in DB.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getCronHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("get_cron_health" as any);
    if (error) throw new Error(error.message);
    return { jobs: (data as any[]) || [] };
  });

export const getHealthOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [queue, queueFail, events, lockouts] = await Promise.all([
      supabase.from("notification_queue").select("status", { count: "exact", head: true }),
      supabase
        .from("notification_queue")
        .select("id,channel,template,recipient,error,updated_at", { count: "exact" })
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase
        .from("security_events" as any)
        .select("id,kind,severity,source_ip,route,detail,created_at")
        .gte("created_at", since24h)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("login_lockouts" as any)
        .select("id,email,ip,fails,locked_until,last_attempt")
        .gt("locked_until", new Date().toISOString())
        .order("last_attempt", { ascending: false })
        .limit(20),
    ]);

    return {
      queueTotal: queue.count ?? 0,
      queueFailures: queueFail.data ?? [],
      queueFailureCount: queueFail.count ?? 0,
      securityEvents: (events.data as any[]) ?? [],
      activeLockouts: (lockouts.data as any[]) ?? [],
    };
  });
