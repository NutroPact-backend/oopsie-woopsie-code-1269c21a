import { supabase } from "@/integrations/supabase/client";

/**
 * Append a row to admin_audit_log via the SECURITY DEFINER RPC.
 * Safe to fire-and-forget — never throws to the UI.
 *
 *   logAdminAction("user.ban", { target_user: "uuid", details: { reason } })
 */
export async function logAdminAction(
  action: string,
  opts: { target_user?: string; target_email?: string; details?: Record<string, any> } = {},
): Promise<void> {
  try {
    await (supabase as any).rpc("log_admin_action", {
      p_action: action,
      p_target_user: opts.target_user ?? null,
      p_target_email: opts.target_email ?? "",
      p_details: opts.details ?? {},
    });
  } catch (e) {
    // never block admin UI on audit failure
    console.warn("[audit] log failed", action, e);
  }
}