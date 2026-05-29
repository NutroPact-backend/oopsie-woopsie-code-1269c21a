// @ts-nocheck
/**
 * Server-side rate limiter — uses Supabase admin client to call the
 * SECURITY DEFINER `check_rate_limit` RPC. Returns whether the action
 * is allowed, plus an optional `blockedUntil` timestamp.
 *
 * Usage inside a server fn:
 *   const { allowed } = await rateLimit('login', email, 5, 60, 600);
 *   if (!allowed) throw new Error('Too many attempts. Try later.');
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type RateLimitResult = {
  allowed: boolean;
  hits: number;
  blockedUntil: string | null;
};

export async function rateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
  blockSeconds?: number,
): Promise<RateLimitResult> {
  const safeKey = String(key || "anon").slice(0, 200);
  const { data, error } = await supabaseAdmin.rpc("check_rate_limit" as any, {
    _bucket: bucket,
    _key: safeKey,
    _limit: limit,
    _window_seconds: windowSeconds,
    _block_seconds: blockSeconds ?? null,
  });
  if (error) {
    // Fail-open on infra error to avoid locking everyone out — log it.
    console.warn("[rateLimit] rpc error", error.message);
    return { allowed: true, hits: 0, blockedUntil: null };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: !!row?.allowed,
    hits: Number(row?.hits ?? 0),
    blockedUntil: row?.blocked_until ?? null,
  };
}

/** Log a security event for the admin Health dashboard. Best-effort. */
export async function logSecurityEvent(opts: {
  kind: string;
  severity?: "info" | "warn" | "critical";
  sourceIp?: string | null;
  userId?: string | null;
  route?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin.from("security_events" as any).insert({
      kind: opts.kind.slice(0, 64),
      severity: opts.severity ?? "info",
      source_ip: opts.sourceIp ?? null,
      user_id: opts.userId ?? null,
      route: opts.route?.slice(0, 256) ?? null,
      detail: opts.detail ?? {},
    });
  } catch (e) {
    console.warn("[logSecurityEvent] failed", e);
  }
}
