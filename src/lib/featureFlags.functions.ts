// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public — anyone can read flags (used by frontend to gate features)
export const listFeatureFlags = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("key, enabled, data, description, rollout_percent, updated_at");
    if (error) throw new Error(error.message);
    return {
      flags: (data ?? []).map((row: any) => ({
        key: row.key,
        enabled: !!row.enabled,
        config: row.data && typeof row.data === "object" ? row.data : {},
        description: row.description ?? null,
        rollout_percent: row.rollout_percent ?? 100,
        updated_at: row.updated_at ?? null,
      })),
    };
  });

// Admin-only — toggle a flag
export const setFeatureFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      key: z.string().min(1).max(100),
      enabled: z.boolean().optional(),
      config: z.record(z.string(), z.unknown()).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { data: ok } = await supabaseAdmin.rpc("has_permission", {
      _user_id: userId, _code: "feature_flags.manage",
    });
    if (!ok) throw new Error("Forbidden: feature_flags.manage required");

    const patch: any = { key: data.key, updated_at: new Date().toISOString() };
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (data.config) patch.data = data.config;

    const { error } = await supabaseAdmin
      .from("feature_flags")
      .upsert(patch, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
