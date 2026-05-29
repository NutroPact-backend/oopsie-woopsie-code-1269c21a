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
      .select("key, enabled, config, description, updated_at");
    if (error) throw new Error(error.message);
    return { flags: data ?? [] };
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

    const patch: any = { updated_by: userId, updated_at: new Date().toISOString() };
    if (typeof data.enabled === "boolean") patch.enabled = data.enabled;
    if (data.config) patch.config = data.config;

    const { error } = await supabaseAdmin
      .from("feature_flags")
      .update(patch)
      .eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
