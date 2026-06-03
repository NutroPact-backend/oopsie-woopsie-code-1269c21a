// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const Schema = z.object({
  session_id:   z.string().min(1).max(64),
  event_type:   z.string().min(1).max(40),
  path:         z.string().max(500).nullable().optional(),
  device:       z.enum(["mobile", "desktop", "tablet", "unknown"]).default("unknown"),
  product_id:   z.string().max(120).nullable().optional(),
  product_name: z.string().max(255).nullable().optional(),
  value:        z.number().finite().nullable().optional(),
  quantity:     z.number().int().nullable().optional(),
  meta:         z.record(z.string(), z.any()).optional().default({}),
});

export const Route = createFileRoute("/api/public/track-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const raw = await request.json().catch(() => null);
          const parsed = Schema.safeParse(raw);
          if (!parsed.success) return new Response("bad", { status: 400 });
          const country = request.headers.get("cf-ipcountry") || null;
          await (supabaseAdmin.from("site_events" as any) as any).insert({
            ...parsed.data,
            country,
          });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true });
        }
      },
      OPTIONS: () => new Response(null, { status: 200 }),
    },
  },
});