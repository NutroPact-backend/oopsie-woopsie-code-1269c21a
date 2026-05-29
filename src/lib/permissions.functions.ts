// @ts-nocheck
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type AppRole = "admin" | "super_admin" | "moderator" | "customer";

// ───── Helpers ─────
async function isSuperAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();
  return !!data;
}

async function isAdminOrSuper(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "super_admin"]);
  return !!data && data.length > 0;
}

async function logPermChange(
  actorId: string,
  payload: {
    target_user_id?: string | null;
    target_role?: AppRole | null;
    permission_code?: string | null;
    action: string;
    old_value?: any;
    new_value?: any;
    note?: string;
  },
) {
  try {
    await supabaseAdmin.from("permission_audit_log").insert({
      actor_id: actorId,
      target_user_id: payload.target_user_id ?? null,
      target_role: payload.target_role ?? null,
      permission_code: payload.permission_code ?? null,
      action: payload.action,
      old_value: payload.old_value ?? null,
      new_value: payload.new_value ?? null,
      note: payload.note ?? null,
    });
  } catch { /* never block */ }
}

// Middleware: must be super_admin
const requireSuperAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    if (!(await isSuperAdmin(userId))) {
      throw new Error("Forbidden: super_admin only");
    }
    return next({ context: { ...(context as any) } });
  });

// Middleware: admin OR super_admin (for read-only views like catalog)
const requireAdminish = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    if (!(await isAdminOrSuper(userId))) {
      throw new Error("Forbidden: admin only");
    }
    return next({ context: { ...(context as any) } });
  });

// ───── Catalog ─────
export const listPermissionCatalog = createServerFn({ method: "GET" })
  .middleware([requireAdminish])
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("permissions")
      .select("code, category, label, description, is_dangerous, sort_order")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });
    if (error) throw new Error(error.message);
    return { permissions: data ?? [] };
  });

// ───── Current user's effective permissions ─────
export const getMyPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    const [{ data: roles }, { data: superFlag }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "super_admin").maybeSingle(),
    ]);
    const isSuper = !!superFlag;
    const isAdmin = !!roles?.some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (isSuper) {
      // super_admin gets every permission code by default
      const { data: all } = await supabaseAdmin.from("permissions").select("code");
      return {
        isSuperAdmin: true,
        isAdmin: true,
        permissions: (all ?? []).map((p: any) => p.code) as string[],
      };
    }
    const { data, error } = await supabaseAdmin.rpc("list_user_effective_permissions", { _user_id: userId });
    if (error) throw new Error(error.message);
    const granted = ((data ?? []) as any[])
      .filter((r) => r.granted)
      .map((r) => r.permission_code as string);
    return { isSuperAdmin: false, isAdmin, permissions: granted };
  });

// ───── Get effective permissions for any user (super_admin only) ─────
export const getUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const [catalog, overrides, effective, roles] = await Promise.all([
      supabaseAdmin.from("permissions").select("code, category, label, description, is_dangerous, sort_order").order("category").order("sort_order"),
      supabaseAdmin.from("user_permissions").select("permission_code, granted, expires_at, reason").eq("user_id", data.userId),
      supabaseAdmin.rpc("list_user_effective_permissions", { _user_id: data.userId }),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
    ]);
    return {
      catalog: catalog.data ?? [],
      overrides: overrides.data ?? [],
      effective: effective.data ?? [],
      roles: (roles.data ?? []).map((r: any) => r.role as string),
    };
  });

// ───── Set / unset a single user permission override ─────
export const setUserPermission = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      code: z.string().min(1).max(100),
      granted: z.boolean().nullable(), // null = clear override
      reason: z.string().max(500).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    const { data: old } = await supabaseAdmin
      .from("user_permissions").select("granted").eq("user_id", data.userId).eq("permission_code", data.code).maybeSingle();
    if (data.granted === null) {
      await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId).eq("permission_code", data.code);
    } else {
      await supabaseAdmin.from("user_permissions").upsert({
        user_id: data.userId,
        permission_code: data.code,
        granted: data.granted,
        granted_by: actorId,
        granted_at: new Date().toISOString(),
        reason: data.reason ?? null,
      });
    }
    await logPermChange(actorId, {
      target_user_id: data.userId,
      permission_code: data.code,
      action: data.granted === null ? "clear_override" : (data.granted ? "grant" : "deny"),
      old_value: old ?? null,
      new_value: data.granted === null ? null : { granted: data.granted },
      note: data.reason,
    });
    return { ok: true };
  });

// ───── Bulk set user permissions ─────
export const bulkSetUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) =>
    z.object({
      userId: z.string().uuid(),
      changes: z.array(z.object({
        code: z.string().min(1).max(100),
        granted: z.boolean().nullable(),
      })).min(1).max(200),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    const toClear = data.changes.filter(c => c.granted === null).map(c => c.code);
    const toUpsert = data.changes.filter(c => c.granted !== null).map(c => ({
      user_id: data.userId,
      permission_code: c.code,
      granted: c.granted as boolean,
      granted_by: actorId,
      granted_at: new Date().toISOString(),
    }));
    if (toClear.length) {
      await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId).in("permission_code", toClear);
    }
    if (toUpsert.length) {
      await supabaseAdmin.from("user_permissions").upsert(toUpsert);
    }
    await logPermChange(actorId, {
      target_user_id: data.userId,
      action: "bulk_update",
      new_value: { changes: data.changes.length },
    });
    return { ok: true, applied: data.changes.length };
  });

// ───── Reset a user's overrides ─────
export const resetUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.userId);
    await logPermChange(actorId, { target_user_id: data.userId, action: "reset_all" });
    return { ok: true };
  });

// ───── Copy permissions from one user to another ─────
export const copyUserPermissions = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) =>
    z.object({
      fromUserId: z.string().uuid(),
      toUserId: z.string().uuid(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    const { data: src } = await supabaseAdmin
      .from("user_permissions").select("permission_code, granted").eq("user_id", data.fromUserId);
    await supabaseAdmin.from("user_permissions").delete().eq("user_id", data.toUserId);
    if (src && src.length) {
      await supabaseAdmin.from("user_permissions").insert(src.map((r: any) => ({
        user_id: data.toUserId,
        permission_code: r.permission_code,
        granted: r.granted,
        granted_by: actorId,
        granted_at: new Date().toISOString(),
      })));
    }
    await logPermChange(actorId, {
      target_user_id: data.toUserId,
      action: "copy_from_user",
      new_value: { fromUserId: data.fromUserId, count: src?.length ?? 0 },
    });
    return { ok: true, copied: src?.length ?? 0 };
  });

// ───── Role defaults ─────
export const getRoleDefaults = createServerFn({ method: "POST" })
  .middleware([requireAdminish])
  .inputValidator((i) => z.object({ role: z.enum(["admin", "moderator", "customer"]) }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("role_default_permissions").select("permission_code, granted").eq("role", data.role);
    return { defaults: rows ?? [] };
  });

export const setRoleDefault = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) =>
    z.object({
      role: z.enum(["admin", "moderator", "customer"]),
      code: z.string().min(1).max(100),
      granted: z.boolean().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    const { data: old } = await supabaseAdmin
      .from("role_default_permissions").select("granted").eq("role", data.role).eq("permission_code", data.code).maybeSingle();
    if (data.granted === null) {
      await supabaseAdmin.from("role_default_permissions").delete().eq("role", data.role).eq("permission_code", data.code);
    } else {
      await supabaseAdmin.from("role_default_permissions").upsert({
        role: data.role,
        permission_code: data.code,
        granted: data.granted,
        updated_at: new Date().toISOString(),
        updated_by: actorId,
      });
    }
    await logPermChange(actorId, {
      target_role: data.role,
      permission_code: data.code,
      action: data.granted === null ? "role_default_clear" : "role_default_set",
      old_value: old ?? null,
      new_value: data.granted === null ? null : { granted: data.granted },
    });
    return { ok: true };
  });

// ───── Super admins ─────
export const listSuperAdmins = createServerFn({ method: "GET" })
  .middleware([requireAdminish])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("user_roles").select("user_id, created_at").eq("role", "super_admin");
    const ids = (data ?? []).map((r: any) => r.user_id);
    if (!ids.length) return { superAdmins: [] };
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, name, email").in("id", ids);
    return {
      superAdmins: (data ?? []).map((r: any) => {
        const p = profiles?.find((p: any) => p.id === r.user_id);
        return { userId: r.user_id, email: p?.email ?? "", name: p?.name ?? "", since: r.created_at };
      }),
    };
  });

export const promoteToSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "super_admin" as any }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    // also ensure they have admin role for backward compat
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: data.userId, role: "admin" as any }, { onConflict: "user_id,role" });
    await logPermChange(actorId, { target_user_id: data.userId, action: "promote_super_admin" });
    return { ok: true };
  });

export const demoteSuperAdmin = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) => z.object({ userId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId: actorId } = context as { userId: string };
    if (data.userId === actorId) {
      throw new Error("You cannot demote yourself");
    }
    const { data: all } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "super_admin");
    if ((all?.length ?? 0) <= 1) {
      throw new Error("Cannot demote the last super_admin");
    }
    const { error } = await supabaseAdmin
      .from("user_roles").delete().eq("user_id", data.userId).eq("role", "super_admin");
    if (error) throw new Error(error.message);
    await logPermChange(actorId, { target_user_id: data.userId, action: "demote_super_admin" });
    return { ok: true };
  });

// ───── Audit log ─────
export const listPermissionAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSuperAdmin])
  .inputValidator((i) =>
    z.object({
      limit: z.number().int().min(1).max(500).optional(),
      targetUserId: z.string().uuid().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin.from("permission_audit_log").select("*").order("created_at", { ascending: false }).limit(data.limit ?? 100);
    if (data.targetUserId) q = q.eq("target_user_id", data.targetUserId);
    const { data: rows } = await q;
    return { entries: rows ?? [] };
  });

// ───── Self-healing: auto-register sidebar tab permissions ─────
// Called by AdminPage on super-admin mount. Any code referenced by the
// sidebar but missing from public.permissions is inserted with a sensible
// category/label, and granted to the admin role by default.
export const syncTabPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z.object({
      entries: z.array(z.object({
        code: z.string().min(1).max(100).regex(/^[a-z0-9_.]+$/i),
        category: z.string().min(1).max(50),
        label: z.string().min(1).max(120),
        description: z.string().max(500).optional(),
        sort_order: z.number().int().min(0).max(9999).optional(),
      })).max(500),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    if (!userId || !(await isSuperAdmin(userId))) {
      return { inserted: 0, skipped: true };
    }
    const { data: result, error } = await supabaseAdmin.rpc("sync_tab_permissions", {
      _entries: data.entries as any,
    });
    if (error) throw new Error(error.message);
    return { inserted: (result as number) ?? 0, skipped: false };
  });
