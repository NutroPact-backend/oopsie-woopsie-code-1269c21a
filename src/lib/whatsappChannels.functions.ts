// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ChannelSchema = z.object({
  id: z.string().uuid().optional(),
  label: z.string().min(1).max(80),
  phone_e164: z.string().min(8).max(20),
  message_template: z.string().max(500).default("Hi, I have a question."),
  business_hours: z.record(z.string(), z.unknown()).default({}),
  offline_message: z.string().max(500).nullable().optional(),
  position: z.enum(["header-right", "header-left", "before-cart", "float"]).default("header-right"),
  icon_style: z.enum(["brand-green", "filled", "outline", "custom-color", "custom-svg"]).default("brand-green"),
  icon_color: z.string().max(20).nullable().optional(),
  custom_icon_url: z.string().url().nullable().optional(),
  show_on_pages: z.array(z.string()).default(["global"]),
  hide_on_mobile: z.boolean().default(false),
  hide_on_desktop: z.boolean().default(false),
  sort_order: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

async function requirePerm(userId: string, code: string) {
  const { data } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (!data) throw new Error(`Forbidden: ${code} required`);
}

// Public — list ENABLED channels for site rendering
export const listPublicWhatsAppChannels = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("whatsapp_channels")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { channels: data ?? [] };
  });

// Admin — list all
export const listAllWhatsAppChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "whatsapp_channels.view");
    const { data, error } = await supabaseAdmin
      .from("whatsapp_channels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { channels: data ?? [] };
  });

export const upsertWhatsAppChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ChannelSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "whatsapp_channels.edit");
    const payload = data as any;
    if (data.id) {
      const { error } = await supabaseAdmin.from("whatsapp_channels").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    } else {
      const { data: row, error } = await supabaseAdmin.from("whatsapp_channels").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { ok: true, id: row!.id };
    }
  });

export const deleteWhatsAppChannel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "whatsapp_channels.edit");
    const { error } = await supabaseAdmin.from("whatsapp_channels").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
