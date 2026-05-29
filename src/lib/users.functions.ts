// @ts-nocheck
import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Admin guard built on top of requireSupabaseAuth
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { userId } = context as { userId: string };
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error || !data) throw new Error("Forbidden: admin only");
    return next({ context: { ...(context as any) } });
  });

async function logAudit(
  actorId: string | undefined,
  targetUserId: string | null,
  targetEmail: string | null,
  action: string,
  details: Record<string, any> = {},
) {
  try {
    let actorEmail = "";
    if (actorId) {
      const { data: a } = await supabaseAdmin.auth.admin.getUserById(actorId);
      actorEmail = a?.user?.email ?? "";
    }
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_user_id: actorId ?? null,
      actor_email: actorEmail,
      target_user_id: targetUserId,
      target_email: targetEmail ?? "",
      action,
      details,
    });
  } catch {
    /* don't block the action */
  }
}

// ───────────────────────────── list users ─────────────────────────────
export const listUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        page: z.number().int().min(1).max(500).optional(),
        perPage: z.number().int().min(1).max(200).optional(),
        search: z.string().max(200).optional(),
        role: z.enum(["admin", "moderator", "customer", "any"]).optional(),
        verified: z.enum(["yes", "no", "any"]).optional(),
        banned: z.enum(["yes", "no", "any"]).optional(),
        hasOrders: z.enum(["yes", "no", "any"]).optional(),
        tag: z.string().max(60).optional(),
        sort: z.enum(["recent", "spend_desc", "orders_desc", "name_asc"]).optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const page = data.page ?? 1;
    const perPage = data.perPage ?? 200;
    const { data: authRes, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const users = authRes.users ?? [];
    const ids = users.map((u) => u.id);

    const [{ data: profiles }, { data: roles }, { data: orders }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id,name,email,phone,admin_notes,tags,vip")
        .in("id", ids.length ? ids : ["__none__"]),
      supabaseAdmin.from("user_roles").select("user_id,role").in("user_id", ids.length ? ids : ["__none__"]),
      supabaseAdmin
        .from("orders")
        .select("user_id,total,created_at")
        .in("user_id", ids.length ? ids : ["__none__"]),
    ]);

    const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    const rmap = new Map<string, string[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = rmap.get(r.user_id) ?? [];
      arr.push(r.role);
      rmap.set(r.user_id, arr);
    });
    const omap = new Map<string, { count: number; total: number; lastAt: string | null }>();
    (orders ?? []).forEach((o: any) => {
      const cur = omap.get(o.user_id) ?? { count: 0, total: 0, lastAt: null };
      cur.count += 1;
      cur.total += Number(o.total) || 0;
      if (!cur.lastAt || o.created_at > cur.lastAt) cur.lastAt = o.created_at;
      omap.set(o.user_id, cur);
    });

    const q = (data.search ?? "").trim().toLowerCase();
    let enriched = users.map((u) => {
      const p: any = pmap.get(u.id) ?? {};
      const stats = omap.get(u.id) ?? { count: 0, total: 0, lastAt: null };
      const bannedUntil = (u as any).banned_until ?? null;
      const isBanned = bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false;
      return {
        id: u.id,
        email: u.email ?? p.email ?? "",
        name: p.name || (u.user_metadata as any)?.name || "",
        phone: p.phone || "",
        roles: rmap.get(u.id) ?? [],
        emailConfirmed: !!u.email_confirmed_at,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        provider: (u.app_metadata as any)?.provider || "email",
        ordersCount: stats.count,
        ordersTotal: stats.total,
        lastOrderAt: stats.lastAt,
        aov: stats.count ? stats.total / stats.count : 0,
        tags: p.tags ?? [],
        vip: !!p.vip,
        adminNotes: p.admin_notes ?? "",
        bannedUntil,
        isBanned,
      };
    });

    if (q) {
      enriched = enriched.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.name || "").toLowerCase().includes(q) ||
          (u.phone || "").toLowerCase().includes(q),
      );
    }
    if (data.role && data.role !== "any") {
      enriched = enriched.filter((u) => u.roles.includes(data.role!));
    }
    if (data.verified && data.verified !== "any") {
      enriched = enriched.filter((u) => u.emailConfirmed === (data.verified === "yes"));
    }
    if (data.banned && data.banned !== "any") {
      enriched = enriched.filter((u) => u.isBanned === (data.banned === "yes"));
    }
    if (data.hasOrders && data.hasOrders !== "any") {
      enriched = enriched.filter((u) => (u.ordersCount > 0) === (data.hasOrders === "yes"));
    }
    if (data.tag) {
      const t = data.tag.toLowerCase();
      enriched = enriched.filter((u) => (u.tags || []).some((x: string) => x.toLowerCase() === t));
    }

    switch (data.sort) {
      case "spend_desc": enriched.sort((a, b) => b.ordersTotal - a.ordersTotal); break;
      case "orders_desc": enriched.sort((a, b) => b.ordersCount - a.ordersCount); break;
      case "name_asc": enriched.sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email)); break;
      default: enriched.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }

    return { users: enriched, page, perPage, total: enriched.length };
  });

// ───────────────────────────── user details ─────────────────────────────
export const getUserDetails = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { data: ures, error } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (error) throw new Error(error.message);
    const u = ures.user;
    const [{ data: profile }, { data: roles }, { data: orders }, { data: audit }] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
      supabaseAdmin
        .from("orders")
        .select("id,order_number,total,order_status,payment_status,created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from("admin_audit_log")
        .select("*")
        .eq("target_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const ordersList = orders ?? [];
    const totalSpend = ordersList.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const aov = ordersList.length ? totalSpend / ordersList.length : 0;
    const bannedUntil = (u as any)?.banned_until ?? null;

    return {
      user: {
        id: u?.id,
        email: u?.email,
        createdAt: u?.created_at,
        lastSignInAt: u?.last_sign_in_at,
        emailConfirmed: !!u?.email_confirmed_at,
        provider: (u?.app_metadata as any)?.provider || "email",
        bannedUntil,
        isBanned: bannedUntil ? new Date(bannedUntil).getTime() > Date.now() : false,
      },
      profile,
      roles: (roles ?? []).map((r: any) => r.role),
      orders: ordersList,
      stats: { totalSpend, aov, count: ordersList.length, lastOrderAt: ordersList[0]?.created_at ?? null },
      audit: audit ?? [],
    };
  });

// ───────────────────────────── role mgmt ─────────────────────────────
export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "customer", "moderator"]),
        action: z.enum(["add", "remove"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.action === "add") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: data.role as any });
      if (error && !String(error.message).includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role as any);
      if (error) throw new Error(error.message);
    }
    await logAudit((context as any).userId, data.userId, null, `role.${data.action}`, { role: data.role });
    return { ok: true };
  });

// ───────────────────────────── delete user ─────────────────────────────
export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    if ((context as any).userId === data.userId) {
      throw new Error("Cannot delete your own account from here");
    }
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, u?.user?.email ?? null, "user.delete");
    return { ok: true };
  });

// ───────────────────────────── bulk delete ─────────────────────────────
export const bulkDeleteUsers = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ userIds: z.array(z.string().uuid()).min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const me = (context as any).userId as string;
    const results: { id: string; ok: boolean; error?: string }[] = [];
    for (const id of data.userIds) {
      if (id === me) { results.push({ id, ok: false, error: "Cannot delete yourself" }); continue; }
      try {
        const { data: u } = await supabaseAdmin.auth.admin.getUserById(id);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw new Error(error.message);
        await logAudit(me, id, u?.user?.email ?? null, "user.delete", { bulk: true });
        results.push({ id, ok: true });
      } catch (e: any) {
        results.push({ id, ok: false, error: e?.message || "Failed" });
      }
    }
    return { results };
  });

// ───────────────────────────── ban / unban ─────────────────────────────
export const banUserAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        hours: z.number().int().min(1).max(8760 * 10).optional(), // omit => permanent
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if ((context as any).userId === data.userId) throw new Error("Cannot ban yourself");
    // permanent => ~100 years
    const dur = `${data.hours ?? 8760 * 100}h`;
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: dur,
    } as any);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, null, "user.ban", {
      hours: data.hours ?? "permanent",
      reason: data.reason ?? "",
    });
    return { ok: true };
  });

export const unbanUserAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: "none",
    } as any);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, null, "user.unban");
    return { ok: true };
  });

// ───────────────────────────── force logout ─────────────────────────────
export const forceLogoutUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.auth.admin.signOut(data.userId, "global");
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, null, "user.force_logout");
    return { ok: true };
  });

// ───────────────────────────── send password reset ─────────────────────────────
export const sendPasswordResetForUser = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = u?.user?.email;
    if (!email) throw new Error("User has no email");
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    } as any);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, email, "user.password_reset_sent");
    return { ok: true, email };
  });

// ───────────────────────────── resend invite ─────────────────────────────
export const resendUserInvite = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.userId);
    const email = u?.user?.email;
    if (!email) throw new Error("User has no email");
    const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, email, "user.invite_resent");
    return { ok: true };
  });

// ───────────────────────────── update profile (name / phone / vip) ─────────────────────────────
export const updateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        name: z.string().max(120).optional(),
        phone: z.string().max(30).optional(),
        vip: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.vip !== undefined) patch.vip = data.vip;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, null, "user.profile_update", patch);
    return { ok: true };
  });

// ───────────────────────────── set notes / tags ─────────────────────────────
export const setUserNotesAndTags = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        adminNotes: z.string().max(5000).optional(),
        tags: z.array(z.string().min(1).max(40).regex(/^[a-zA-Z0-9 _-]+$/)).max(20).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const patch: any = {};
    if (data.adminNotes !== undefined) patch.admin_notes = data.adminNotes;
    if (data.tags !== undefined) patch.tags = data.tags;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logAudit((context as any).userId, data.userId, null, "user.notes_tags_update", patch);
    return { ok: true };
  });

// ───────────────────────────── audit log feed ─────────────────────────────
export const getAuditLog = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { data: rows, error } = await supabaseAdmin
      .from("admin_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

// ───────────────────────────── create / invite ─────────────────────────────
export const createUserAccount = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        email: z.string().email(),
        password: z.string().min(8).max(128).optional(),
        name: z.string().max(120).optional(),
        phone: z.string().max(30).optional(),
        role: z.enum(["admin", "customer", "moderator"]).default("customer"),
        sendInvite: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    let userId: string | undefined;
    if (data.sendInvite || !data.password) {
      const { data: res, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
        data: { name: data.name ?? "", phone: data.phone ?? "" },
      });
      if (error) throw new Error(error.message);
      userId = res.user?.id;
    } else {
      const { data: res, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name ?? "", phone: data.phone ?? "" },
      });
      if (error) throw new Error(error.message);
      userId = res.user?.id;
    }
    if (userId && data.role !== "customer") {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: data.role as any })
        .then(() => {});
    }
    await logAudit((context as any).userId, userId ?? null, data.email, "user.create", {
      role: data.role,
      invited: data.sendInvite || !data.password,
    });
    return { ok: true, userId };
  });

// ───────────────────────────── auth settings (soft) ─────────────────────────────
const AuthSettingsSchema = z.object({
  // General
  signupEnabled: z.boolean().default(true),
  googleEnabled: z.boolean().default(true),
  appleEnabled: z.boolean().default(false),

  // Email provider
  emailLoginEnabled: z.boolean().default(true),
  emailMagicLinkEnabled: z.boolean().default(false),
  requireEmailConfirm: z.boolean().default(true),
  secureEmailChange: z.boolean().default(true),
  emailOtpLength: z.number().int().min(6).max(10).default(6),
  emailOtpExpirySec: z.number().int().min(60).max(86400).default(3600),
  emailRateLimitPerHour: z.number().int().min(1).max(1000).default(30),
  emailSenderName: z.string().max(120).default(""),
  emailReplyTo: z.string().max(200).default(""),

  // Phone provider
  phoneLoginEnabled: z.boolean().default(false),
  phoneOtpEnabled: z.boolean().default(false),
  requirePhoneConfirm: z.boolean().default(true),
  phoneOtpLength: z.number().int().min(4).max(10).default(6),
  phoneOtpExpirySec: z.number().int().min(30).max(3600).default(300),
  phoneSmsProvider: z.enum(["twilio", "messagebird", "textlocal", "msg91", "custom", "none"]).default("none"),
  phoneSmsTemplate: z.string().max(300).default("Your OTP is {{code}}. Valid for 5 minutes."),
  phoneRateLimitPerHour: z.number().int().min(1).max(500).default(10),

  customHttpUrl: z.string().max(500).default(""),
  customHttpMethod: z.enum(["POST", "GET", "PUT"]).default("POST"),
  customHttpHeaders: z.string().max(2000).default(""),
  customHttpBodyTemplate: z.string().max(2000).default('{"to":"{{phone}}","message":"{{message}}"}'),

  devModeShowOtp: z.boolean().default(false),

  minPasswordLength: z.number().int().min(6).max(64).default(8),
  passwordRequireUpper: z.boolean().default(false),
  passwordRequireNumber: z.boolean().default(false),
  passwordRequireSymbol: z.boolean().default(false),
  hibpCheck: z.boolean().default(false),
  sessionTimeoutHours: z.number().int().min(1).max(720).default(168),
  refreshTokenRotation: z.boolean().default(true),
});

export const getAuthSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("settings")
      .eq("key", "default")
      .maybeSingle();
    const s: any = data?.settings ?? {};
    return AuthSettingsSchema.parse(s.auth ?? {});
  });

export const updateAuthSettings = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => AuthSettingsSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("site_settings")
      .select("settings")
      .eq("key", "default")
      .maybeSingle();
    const merged = { ...((existing?.settings as any) ?? {}), auth: data };
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "default", settings: merged });
    if (error) throw new Error(error.message);
    return data;
  });
