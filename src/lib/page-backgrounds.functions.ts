// @ts-nocheck
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ── helpers ──
async function userHasPerm(userId: string, code: string): Promise<boolean> {
  // super_admin shortcut
  const { data: sa } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle();
  if (sa) return true;
  const { data, error } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (error) return false;
  return !!data;
}

const requirePerm = (code: string) =>
  createMiddleware({ type: "function" })
    .middleware([requireSupabaseAuth])
    .server(async ({ next, context }) => {
      const { userId } = context as { userId: string };
      if (!(await userHasPerm(userId, code))) {
        throw new Error(`Forbidden: missing permission ${code}`);
      }
      return next({ context: { ...(context as any) } });
    });

// ── Public read (anyone can read — needed to render backgrounds on every page) ──
export const listPageBackgrounds = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("page_backgrounds")
      .select("page_key, image_url, opacity, enabled, position, size, repeat, blend_mode");
    if (error) throw new Error(error.message);
    return { backgrounds: data ?? [] };
  });

// ── Admin list (includes everything) ──
export const adminListPageBackgrounds = createServerFn({ method: "GET" })
  .middleware([requirePerm("backgrounds.view")])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("page_backgrounds")
      .select("*")
      .order("page_key");
    if (error) throw new Error(error.message);
    return { backgrounds: data ?? [] };
  });

// ── Upsert one ──
export const upsertPageBackground = createServerFn({ method: "POST" })
  .middleware([requirePerm("backgrounds.edit")])
  .inputValidator((i) =>
    z.object({
      pageKey: z.string().min(1).max(64).regex(/^[a-z0-9_-]+$/),
      imageUrl: z.string().url().max(1000).nullable(),
      opacity: z.number().min(0).max(1),
      enabled: z.boolean(),
      position: z.enum(["center", "top", "bottom", "left", "right", "top left", "top right", "bottom left", "bottom right"]).default("center"),
      size: z.enum(["cover", "contain", "auto"]).default("cover"),
      repeat: z.enum(["no-repeat", "repeat", "repeat-x", "repeat-y"]).default("no-repeat"),
      blendMode: z.enum(["normal", "multiply", "overlay", "soft-light", "screen", "darken", "lighten"]).default("normal"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    const { error } = await supabaseAdmin.from("page_backgrounds").upsert({
      page_key: data.pageKey,
      image_url: data.imageUrl,
      opacity: data.opacity,
      enabled: data.enabled,
      position: data.position,
      size: data.size,
      repeat: data.repeat,
      blend_mode: data.blendMode,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ── Delete one ──
export const deletePageBackground = createServerFn({ method: "POST" })
  .middleware([requirePerm("backgrounds.edit")])
  .inputValidator((i) => z.object({ pageKey: z.string().min(1).max(64) }).parse(i))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin.from("page_backgrounds").delete().eq("page_key", data.pageKey);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
