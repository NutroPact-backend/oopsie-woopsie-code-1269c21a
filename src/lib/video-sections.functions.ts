// @ts-nocheck
/**
 * Video Sections — shoppable Reel-style video carousels.
 * Admin manages from one tab; renderer fetches per-placement and stacks.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireAdmin } from "./users.functions";

// types.ts is regenerated post-migration; until then, address the table via an untyped handle.
const db = supabaseAdmin as unknown as {
  from: (table: string) => any;
};

const VideoItem = z.object({
  id: z.string(),
  src: z.string().min(1),
  type: z.enum(["mp4", "youtube", "instagram"]).default("mp4"),
  thumbnail: z.string().optional().default(""),
  title: z.string().optional().default(""),
  views: z.union([z.number(), z.string()]).optional().default(0),
  productId: z.string().optional().default(""),
  cta: z.object({
    text: z.string().optional().default(""),
    href: z.string().optional().default(""),
  }).optional().default({ text: "", href: "" }),
});

const Placement = z.object({
  type: z.enum(["home", "product", "category", "page", "blog", "blog-index"]),
  scope: z.enum(["all", "specific"]).default("all"),
  ids: z.array(z.string()).optional().default([]),
  position: z.number().int().optional().default(0),
});

const Visibility = z.object({
  desktop: z.boolean().default(true),
  mobile: z.boolean().default(true),
  startAt: z.string().optional().nullable(),
  endAt: z.string().optional().nullable(),
});

const SectionInput = z.object({
  id: z.string().optional().nullable(),
  heading: z.string().min(1).max(200),
  subheading: z.string().max(500).optional().nullable(),
  layout: z.enum(["reel-carousel", "grid", "single-feature"]).default("reel-carousel"),
  enabled: z.boolean().default(true),
  videos: z.array(VideoItem).default([]),
  placements: z.array(Placement).default([]),
  visibility: Visibility.default({ desktop: true, mobile: true }),
  sortOrder: z.number().int().default(0),
});

function rowToSection(row: any) {
  return {
    id: row.id,
    heading: row.heading,
    subheading: row.subheading || "",
    layout: row.layout || "reel-carousel",
    enabled: !!row.enabled,
    videos: Array.isArray(row.videos) ? row.videos : [],
    placements: Array.isArray(row.placements) ? row.placements : [],
    visibility: row.visibility || { desktop: true, mobile: true },
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function matchesPlacement(
  placements: any[],
  filter: { type: string; id?: string },
): { match: boolean; position: number } {
  for (const p of placements || []) {
    if (p?.type !== filter.type) continue;
    if (p.scope === "all") return { match: true, position: p.position ?? 0 };
    if (p.scope === "specific" && filter.id && Array.isArray(p.ids) && p.ids.includes(filter.id)) {
      return { match: true, position: p.position ?? 0 };
    }
  }
  return { match: false, position: 0 };
}

// ───────────── Public: list sections for a placement ─────────────
export const listVideoSectionsForPlacement = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      placement: z.enum(["home", "product", "category", "page", "blog", "blog-index"]),
      id: z.string().optional(),
      position: z.string().optional(), // optional slot label: "top" | "bottom" | "after-products" etc.
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await db
      .from("video_sections")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const now = Date.now();
    const out: any[] = [];
    for (const row of rows || []) {
      const sec = rowToSection(row);
      const vis = sec.visibility || {};
      if (vis.startAt && new Date(vis.startAt).getTime() > now) continue;
      if (vis.endAt && new Date(vis.endAt).getTime() < now) continue;
      const m = matchesPlacement(sec.placements, { type: data.placement, id: data.id });
      if (!m.match) continue;
      out.push({ ...sec, _matchPosition: m.position });
    }
    out.sort((a, b) => (a._matchPosition || 0) - (b._matchPosition || 0) || (a.sortOrder - b.sortOrder));
    return out;
  });

// ───────────── Admin: list all ─────────────
export const adminListVideoSections = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data, error } = await db
      .from("video_sections")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(rowToSection);
  });

// ───────────── Admin: upsert ─────────────
export const upsertVideoSection = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => SectionInput.parse(input))
  .handler(async ({ data }) => {
    const payload = {
      heading: data.heading,
      subheading: data.subheading ?? null,
      layout: data.layout,
      enabled: data.enabled,
      videos: data.videos,
      placements: data.placements,
      visibility: data.visibility,
      sort_order: data.sortOrder,
      updated_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: row, error } = await db
        .from("video_sections")
        .update(payload)
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return rowToSection(row);
    } else {
      const { data: row, error } = await db
        .from("video_sections")
        .insert(payload)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return rowToSection(row);
    }
  });

// ───────────── Admin: delete ─────────────
export const deleteVideoSection = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { error } = await db.from("video_sections").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });