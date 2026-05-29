// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type CheckStatus = "pass" | "warn" | "fail";
export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
};
export type FeatureReport = {
  key: string;
  label: string;
  flagEnabled: boolean;
  overall: CheckStatus;
  checks: Check[];
};

// Admin-gated diagnostic — read-only end-to-end verification of feature pipelines.
export const runVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };

    // Admin-only: check via user_roles table directly
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r: any) => r.role));
    if (!roleSet.has("admin") && !roleSet.has("super_admin")) {
      throw new Error("Forbidden: admin role required");
    }

    // Load all flags once
    const { data: flagsRaw } = await supabaseAdmin
      .from("feature_flags")
      .select("key, enabled, config");
    const flagMap = new Map((flagsRaw ?? []).map((f: any) => [f.key, f]));

    const report: FeatureReport[] = [];

    // ── WhatsApp Channels ─────────────────────────────────────
    {
      const flag = flagMap.get("whatsapp_header");
      const enabled = !!flag?.enabled;
      const { data: channels, count } = await supabaseAdmin
        .from("whatsapp_channels")
        .select("id, label, phone, is_active", { count: "exact" });
      const active = (channels ?? []).filter((c: any) => c.is_active);
      const checks: Check[] = [
        {
          id: "flag", label: "Master flag",
          status: enabled ? "pass" : "warn",
          detail: enabled ? "ON — header icon active" : "OFF — header icon hidden site-wide",
        },
        {
          id: "data", label: "Numbers configured",
          status: (count ?? 0) > 0 ? "pass" : "fail",
          detail: `${count ?? 0} total · ${active.length} active`,
        },
        {
          id: "phone-format", label: "Phone format (E.164 wa.me)",
          status: (channels ?? []).every((c: any) => /^\+?\d{10,15}$/.test(String(c.phone || "").replace(/\s|-/g, "")))
            ? "pass" : "warn",
          detail: "Numbers should be digits-only with country code for wa.me",
        },
      ];
      report.push({
        key: "whatsapp_header", label: "WhatsApp Channels",
        flagEnabled: enabled,
        overall: worst(checks),
        checks,
      });
    }

    // ── Urgency Widgets ────────────────────────────────────────
    {
      const flag = flagMap.get("urgency_stack");
      const enabled = !!flag?.enabled;
      const { data: widgets, count } = await supabaseAdmin
        .from("urgency_widgets")
        .select("id, type, is_active", { count: "exact" });
      const active = (widgets ?? []).filter((w: any) => w.is_active);
      const types = new Set(active.map((w: any) => w.type));
      const checks: Check[] = [
        {
          id: "flag", label: "Master flag",
          status: enabled ? "pass" : "warn",
          detail: enabled ? "ON — widgets render on PDP" : "OFF — no urgency widgets shown",
        },
        {
          id: "data", label: "Widgets configured",
          status: (count ?? 0) > 0 ? "pass" : "fail",
          detail: `${count ?? 0} total · ${active.length} active · types: ${[...types].join(", ") || "none"}`,
        },
      ];
      report.push({
        key: "urgency_stack", label: "PDP Urgency Stack",
        flagEnabled: enabled,
        overall: worst(checks),
        checks,
      });
    }

    // ── Quick Checkout UPI ─────────────────────────────────────
    {
      const flag = flagMap.get("quick_checkout");
      const enabled = !!flag?.enabled;
      const { data: methods, count } = await supabaseAdmin
        .from("quick_checkout_methods")
        .select("id, provider, is_active, upi_id", { count: "exact" });
      const active = (methods ?? []).filter((m: any) => m.is_active);
      const haveUpi = active.filter((m: any) => m.upi_id && String(m.upi_id).includes("@"));
      const checks: Check[] = [
        {
          id: "flag", label: "Master flag",
          status: enabled ? "pass" : "warn",
          detail: enabled ? "ON — Quick Checkout bar live in cart" : "OFF — bar hidden",
        },
        {
          id: "data", label: "UPI methods configured",
          status: active.length > 0 ? "pass" : "fail",
          detail: `${count ?? 0} total · ${active.length} active · providers: ${[...new Set(active.map((m: any) => m.provider))].join(", ") || "none"}`,
        },
        {
          id: "upi-id", label: "Valid UPI IDs",
          status: haveUpi.length === active.length && active.length > 0 ? "pass" : active.length === 0 ? "fail" : "warn",
          detail: `${haveUpi.length}/${active.length} active methods have a UPI ID with '@'`,
        },
      ];
      report.push({
        key: "quick_checkout", label: "Quick Checkout (UPI)",
        flagEnabled: enabled,
        overall: worst(checks),
        checks,
      });
    }

    // ── Variants Pro ───────────────────────────────────────────
    {
      const flag = flagMap.get("variants_pro");
      const enabled = !!flag?.enabled;
      const { count: totalProducts } = await supabaseAdmin
        .from("products").select("id", { count: "exact", head: true });
      const { data: configured } = await supabaseAdmin
        .from("products")
        .select("id, name, variants_pro_config")
        .not("variants_pro_config", "is", null)
        .limit(50);
      const proCount = (configured ?? []).length;
      const checks: Check[] = [
        {
          id: "flag", label: "Master flag",
          status: enabled ? "pass" : "warn",
          detail: enabled ? "ON — Pro picker active on configured products" : "OFF — legacy selectors used",
        },
        {
          id: "data", label: "Products with Pro config",
          status: proCount > 0 ? "pass" : "warn",
          detail: `${proCount}/${totalProducts ?? 0} products have variants_pro_config set`,
        },
      ];
      report.push({
        key: "variants_pro", label: "Variants Pro Picker",
        flagEnabled: enabled,
        overall: worst(checks),
        checks,
      });
    }

    // ── Role gating sanity (counts by role) ────────────────────
    let roleSummary: { role: string; count: number }[] = [];
    {
      const { data } = await supabaseAdmin
        .from("user_roles")
        .select("role");
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => map.set(r.role, (map.get(r.role) ?? 0) + 1));
      roleSummary = [...map.entries()].map(([role, count]) => ({ role, count }));
    }

    return {
      ranAt: new Date().toISOString(),
      report,
      roleSummary,
    };
  });

function worst(checks: Check[]): CheckStatus {
  if (checks.some(c => c.status === "fail")) return "fail";
  if (checks.some(c => c.status === "warn")) return "warn";
  return "pass";
}
