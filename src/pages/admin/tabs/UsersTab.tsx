// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Search, Trash2, Shield, ShieldOff, UserPlus, X, Mail, Phone,
  Calendar, ShoppingBag, CheckCircle2, Save, Loader2, Star,
  Ban, KeyRound, LogOut, Download, Tag as TagIcon, NotebookPen,
  Crown, History, AlertTriangle, RefreshCcw,
} from "lucide-react";
import { TabHelp } from "./_TabHelp";
import {
  listUsers, getUserDetails, setUserRole, deleteUserAccount,
  createUserAccount, getAuthSettings, updateAuthSettings,
  banUserAccount, unbanUserAccount, forceLogoutUser,
  sendPasswordResetForUser, resendUserInvite,
  updateUserProfile, setUserNotesAndTags, bulkDeleteUsers, getAuditLog,
} from "@/lib/users.functions";
import { UserPermissionsPanel } from "@/pages/admin/components/UserPermissionsPanel";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

type Role = "admin" | "customer" | "moderator";

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  roles: string[];
  emailConfirmed: boolean;
  createdAt: string | null;
  lastSignInAt: string | null;
  provider: string;
  ordersCount: number;
  ordersTotal: number;
  lastOrderAt: string | null;
  aov: number;
  tags: string[];
  vip: boolean;
  adminNotes: string;
  bannedUntil: string | null;
  isBanned: boolean;
};

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return "—"; }
}
function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}
function tagColor(tag: string): string {
  const t = tag.toLowerCase();
  if (t.includes("vip") || t.includes("gold")) return "bg-amber-100 text-amber-800 border-amber-200";
  if (t.includes("fraud") || t.includes("risk") || t.includes("block")) return "bg-red-100 text-red-700 border-red-200";
  if (t.includes("wholesale") || t.includes("b2b")) return "bg-purple-100 text-purple-700 border-purple-200";
  if (t.includes("new")) return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-gray-100 text-gray-700 border-gray-200";
}

export default function UsersTab() {
  const [section, setSection] = useState<"users" | "audit" | "settings">("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [roleF, setRoleF] = useState<"any" | Role>("any");
  const [verifiedF, setVerifiedF] = useState<"any" | "yes" | "no">("any");
  const [bannedF, setBannedF] = useState<"any" | "yes" | "no">("any");
  const [ordersF, setOrdersF] = useState<"any" | "yes" | "no">("any");
  const [tagF, setTagF] = useState("");
  const [sort, setSort] = useState<"recent" | "spend_desc" | "orders_desc" | "name_asc">("recent");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fnList = useServerFn(listUsers);
  const fnBulkDel = useServerFn(bulkDeleteUsers);
  const fnSetRole = useServerFn(setUserRole);

  const refresh = async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await fnList({
        data: {
          search: search.trim() || undefined,
          perPage: 200,
          role: roleF,
          verified: verifiedF,
          banned: bannedF,
          hasOrders: ordersF,
          tag: tagF.trim() || undefined,
          sort,
        },
      });
      setUsers(res.users as UserRow[]);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load users");
    }
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => { refresh(); }, [roleF, verifiedF, bannedF, ordersF, sort]);

  const stats = useMemo(() => {
    const total = users.length;
    const banned = users.filter((u) => u.isBanned).length;
    const verified = users.filter((u) => u.emailConfirmed).length;
    const vip = users.filter((u) => u.vip || u.tags.some((t) => t.toLowerCase().includes("vip"))).length;
    const ltv = users.reduce((s, u) => s + u.ordersTotal, 0);
    return { total, banned, verified, vip, ltv };
  }, [users]);

  const toggleSel = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((s) => (s.size === users.length ? new Set() : new Set(users.map((u) => u.id))));
  };

  const exportCsv = () => {
    const cols = ["email", "name", "phone", "roles", "ordersCount", "ordersTotal", "aov", "tags", "vip", "verified", "banned", "createdAt", "lastSignInAt"];
    const rows = users.map((u) => [
      u.email, u.name, u.phone, u.roles.join("|"), u.ordersCount, u.ordersTotal.toFixed(2),
      u.aov.toFixed(2), u.tags.join("|"), u.vip ? "yes" : "no", u.emailConfirmed ? "yes" : "no",
      u.isBanned ? "yes" : "no", u.createdAt ?? "", u.lastSignInAt ?? "",
    ]);
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [cols.join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const bulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} user(s)? This cannot be undone.`)) return;
    try {
      const r: any = await fnBulkDel({ data: { userIds: [...selected] } });
      const ok = r.results.filter((x: any) => x.ok).length;
      const fail = r.results.length - ok;
      toast.success(`Deleted ${ok}${fail ? ` · ${fail} failed` : ""}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  const bulkRole = async (role: Role, action: "add" | "remove") => {
    if (selected.size === 0) return;
    try {
      for (const id of selected) await fnSetRole({ data: { userId: id, role, action } });
      toast.success(`${action === "add" ? "Added" : "Removed"} ${role} for ${selected.size}`);
      refresh();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
  };

  return (
    <div className="space-y-5">
      <TabHelp topic="users" />
      <div className="flex gap-2 border-b border-gray-200">
        {([["users", "Users"], ["audit", "Audit log"], ["settings", "Auth Settings"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setSection(k)}
            className={`px-4 py-2 text-sm font-bold border-b-2 transition ${section === k ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {section === "users" && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Total users" value={stats.total} />
            <StatCard label="Verified" value={stats.verified} />
            <StatCard label="VIP / tagged" value={stats.vip} accent="amber" />
            <StatCard label="Banned" value={stats.banned} accent="red" />
            <StatCard label="Lifetime ₹" value={`₹${stats.ltv.toFixed(0)}`} accent="green" />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 space-y-2.5">
            <div className="flex gap-2 items-center flex-wrap">
              <div className="relative flex-1 min-w-60">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && refresh()}
                  placeholder="Search email, name, phone…"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <button onClick={refresh} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-bold flex items-center gap-1.5">
                <RefreshCcw size={13} /> Refresh
              </button>
              <button onClick={exportCsv} className="px-3 py-2 bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-1.5">
                <Download size={13} /> CSV
              </button>
              <button onClick={() => setCreateOpen(true)}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5">
                <UserPlus size={14} /> Add user
              </button>
            </div>

            <div className="flex gap-2 flex-wrap text-xs">
              <FilterSelect label="Role" value={roleF} onChange={(v: any) => setRoleF(v)}
                options={[["any", "Any role"], ["admin", "Admin"], ["moderator", "Moderator"], ["customer", "Customer"]]} />
              <FilterSelect label="Verified" value={verifiedF} onChange={(v: any) => setVerifiedF(v)}
                options={[["any", "Any"], ["yes", "Verified"], ["no", "Unverified"]]} />
              <FilterSelect label="Banned" value={bannedF} onChange={(v: any) => setBannedF(v)}
                options={[["any", "Any"], ["yes", "Banned"], ["no", "Active"]]} />
              <FilterSelect label="Orders" value={ordersF} onChange={(v: any) => setOrdersF(v)}
                options={[["any", "Any"], ["yes", "Has orders"], ["no", "No orders"]]} />
              <input value={tagF} onChange={(e) => setTagF(e.target.value)} onKeyDown={(e) => e.key === "Enter" && refresh()}
                placeholder="Filter by tag…" className="border border-gray-200 rounded-lg px-2 py-1.5 w-36" />
              <FilterSelect label="Sort" value={sort} onChange={(v: any) => setSort(v)}
                options={[["recent", "Newest"], ["spend_desc", "Top spenders"], ["orders_desc", "Most orders"], ["name_asc", "Name A→Z"]]} />
            </div>

            {selected.size > 0 && (
              <div className="flex gap-2 items-center flex-wrap bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs">
                <span className="font-bold text-orange-800">{selected.size} selected</span>
                <button onClick={() => bulkRole("admin", "add")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg font-bold hover:border-orange-300">+ Admin</button>
                <button onClick={() => bulkRole("admin", "remove")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg font-bold hover:border-orange-300">− Admin</button>
                <button onClick={() => bulkRole("moderator", "add")} className="px-2 py-1 bg-white border border-gray-200 rounded-lg font-bold hover:border-orange-300">+ Moderator</button>
                <button onClick={bulkDelete} className="px-2 py-1 bg-red-500 text-white rounded-lg font-bold flex items-center gap-1"><Trash2 size={11} /> Delete</button>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-gray-500 hover:underline">Clear</button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <input type="checkbox" checked={selected.size > 0 && selected.size === users.length} onChange={toggleAll} />
                  </th>
                  <th className="text-left px-3 py-3">User</th>
                  <th className="text-left px-3 py-3">Roles & tags</th>
                  <th className="text-left px-3 py-3">Orders</th>
                  <th className="text-left px-3 py-3">Last sign-in</th>
                  <th className="text-left px-3 py-3">Joined</th>
                  <th className="text-right px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400"><Loader2 className="inline animate-spin" size={18} /></td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400">No users match these filters</td></tr>
                )}
                {!loading && users.map((u) => (
                  <tr key={u.id} className={`hover:bg-gray-50 cursor-pointer ${u.isBanned ? "bg-red-50/40" : ""}`} onClick={() => setDetailId(u.id)}>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggleSel(u.id)} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        {u.vip && <Crown size={13} className="text-amber-500" />}
                        {u.name || "—"}
                        {u.emailConfirmed && <CheckCircle2 size={13} className="text-green-500" />}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                      {u.phone && <div className="text-[11px] text-gray-400">{u.phone}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {u.roles.map((r) => (
                          <span key={r} className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${r === "admin" ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"}`}>{r}</span>
                        ))}
                        {u.tags.map((t) => (
                          <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${tagColor(t)}`}>{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-bold text-gray-900">{u.ordersCount}</div>
                      <div className="text-[11px] text-gray-500">₹{u.ordersTotal.toFixed(0)} · AOV ₹{u.aov.toFixed(0)}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-gray-600">{fmtDate(u.lastSignInAt)}</td>
                    <td className="px-3 py-3 text-xs text-gray-600">{fmtDate(u.createdAt)}</td>
                    <td className="px-3 py-3 text-right">
                      {u.isBanned ? (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 inline-flex items-center gap-1"><Ban size={10} /> banned</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {section === "audit" && <AuditLogView />}
      {section === "settings" && <AuthSettingsForm />}

      {detailId && <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} onChanged={refresh} />}
      {createOpen && <CreateUserModal onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refresh(); }} />}
    </div>
  );
}

// ───────────────────────────── Small UI helpers ─────────────────────────────
function StatCard({ label, value, accent }: { label: string; value: any; accent?: "amber" | "red" | "green" }) {
  const color =
    accent === "amber" ? "text-amber-600" :
    accent === "red" ? "text-red-600" :
    accent === "green" ? "text-green-600" : "text-gray-900";
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">{label}</div>
      <div className={`text-2xl font-black ${color} mt-0.5`}>{value}</div>
    </div>
  );
}
function FilterSelect({ label, value, onChange, options }: any) {
  return (
    <label className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
      <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-transparent text-xs font-bold outline-none">
        {options.map(([v, l]: any) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

// ───────────────────────────── Audit log section ─────────────────────────────
function AuditLogView() {
  const fn = useServerFn(getAuditLog);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async () => {
    setLoading(true);
    try { const r: any = await fn({ data: { limit: 200 } }); setRows(r.rows); }
    catch (e: any) { toast.error(e?.message); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100">
        <h3 className="font-black text-sm flex items-center gap-1.5"><History size={14} /> Recent admin actions</h3>
        <button onClick={load} className="text-xs font-bold text-gray-600 hover:text-orange-600 flex items-center gap-1"><RefreshCcw size={12} /> Reload</button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
          <tr>
            <th className="text-left px-3 py-2">When</th>
            <th className="text-left px-3 py-2">Actor</th>
            <th className="text-left px-3 py-2">Action</th>
            <th className="text-left px-3 py-2">Target</th>
            <th className="text-left px-3 py-2">Details</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400"><Loader2 className="inline animate-spin" /></td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">No actions yet</td></tr>}
          {!loading && rows.map((r) => (
            <tr key={r.id}>
              <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
              <td className="px-3 py-2 text-xs">{r.actor_email || "—"}</td>
              <td className="px-3 py-2"><span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{r.action}</span></td>
              <td className="px-3 py-2 text-xs">{r.target_email || r.target_user_id?.slice(0, 8) || "—"}</td>
              <td className="px-3 py-2 text-[11px] text-gray-500 font-mono truncate max-w-[280px]">{Object.keys(r.details || {}).length ? JSON.stringify(r.details) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────────── Auth Settings (unchanged) ─────────────────────────────
function AuthSettingsForm() {
  const fnGet = useServerFn(getAuthSettings);
  const fnSet = useServerFn(updateAuthSettings);
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fnGet({} as any).then((d: any) => setForm(d)).catch(() => setForm({})); }, []);
  if (!form) return <div className="text-gray-400 text-sm">Loading…</div>;
  const upd = (k: string, v: any) => setForm({ ...form, [k]: v });

  const save = async () => {
    setSaving(true);
    try { await fnSet({ data: form }); toast.success("Auth settings saved"); }
    catch (e: any) { toast.error(e?.message || "Failed to save"); }
    setSaving(false);
  };

  const Row = ({ label, hint, children }: any) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-gray-100">
      <div className="flex-1">
        <div className="font-bold text-sm text-gray-900">{label}</div>
        {hint && <div className="text-xs text-gray-500 mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
  const Toggle = ({ on, onChange }: any) => (
    <button onClick={() => onChange(!on)} type="button"
      className={`relative w-11 h-6 rounded-full transition ${on ? "bg-orange-500" : "bg-gray-300"}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
  const Section = ({ title, desc, children }: any) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="font-black text-base mb-1">{title}</h3>
      {desc && <p className="text-xs text-gray-500 mb-3">{desc}</p>}
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  );
  const NumInput = ({ value, onChange, min, max, suffix }: any) => (
    <div className="flex items-center gap-1.5">
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || min)))}
        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-sm text-center" />
      {suffix && <span className="text-xs text-gray-400">{suffix}</span>}
    </div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      <Section title="General">
        <Row label="Allow new sign-ups"><Toggle on={form.signupEnabled} onChange={(v: boolean) => upd("signupEnabled", v)} /></Row>
        <Row label="Google sign-in"><Toggle on={form.googleEnabled} onChange={(v: boolean) => upd("googleEnabled", v)} /></Row>
        <Row label="Apple sign-in"><Toggle on={form.appleEnabled} onChange={(v: boolean) => upd("appleEnabled", v)} /></Row>
      </Section>
      <Section title="Email Provider">
        <Row label="Email + password login"><Toggle on={form.emailLoginEnabled} onChange={(v: boolean) => upd("emailLoginEnabled", v)} /></Row>
        <Row label="Magic link login"><Toggle on={form.emailMagicLinkEnabled} onChange={(v: boolean) => upd("emailMagicLinkEnabled", v)} /></Row>
        <Row label="Require email confirmation"><Toggle on={form.requireEmailConfirm} onChange={(v: boolean) => upd("requireEmailConfirm", v)} /></Row>
        <Row label="Email OTP length"><NumInput value={form.emailOtpLength} onChange={(v: number) => upd("emailOtpLength", v)} min={6} max={10} suffix="digits" /></Row>
        <Row label="Email OTP expiry"><NumInput value={form.emailOtpExpirySec} onChange={(v: number) => upd("emailOtpExpirySec", v)} min={60} max={86400} suffix="s" /></Row>
      </Section>
      <Section title="Password & Security">
        <Row label="Minimum password length"><NumInput value={form.minPasswordLength} onChange={(v: number) => upd("minPasswordLength", v)} min={6} max={64} suffix="chars" /></Row>
        <Row label="Require uppercase"><Toggle on={form.passwordRequireUpper} onChange={(v: boolean) => upd("passwordRequireUpper", v)} /></Row>
        <Row label="Require number"><Toggle on={form.passwordRequireNumber} onChange={(v: boolean) => upd("passwordRequireNumber", v)} /></Row>
        <Row label="Require symbol"><Toggle on={form.passwordRequireSymbol} onChange={(v: boolean) => upd("passwordRequireSymbol", v)} /></Row>
        <Row label="Leaked password check (HIBP)"><Toggle on={form.hibpCheck} onChange={(v: boolean) => upd("hibpCheck", v)} /></Row>
        <Row label="Session timeout"><NumInput value={form.sessionTimeoutHours} onChange={(v: number) => upd("sessionTimeoutHours", v)} min={1} max={720} suffix="hours" /></Row>
      </Section>
      <button onClick={save} disabled={saving}
        className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 disabled:opacity-50">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save settings
      </button>
    </div>
  );
}

// ───────────────────────────── Detail Modal (tabs) ─────────────────────────────
function UserDetailModal({ userId, onClose, onChanged }: { userId: string; onClose: () => void; onChanged: () => void }) {
  const fnGet = useServerFn(getUserDetails);
  const fnRole = useServerFn(setUserRole);
  const fnDel = useServerFn(deleteUserAccount);
  const fnBan = useServerFn(banUserAccount);
  const fnUnban = useServerFn(unbanUserAccount);
  const fnLogout = useServerFn(forceLogoutUser);
  const fnReset = useServerFn(sendPasswordResetForUser);
  const fnInvite = useServerFn(resendUserInvite);
  const fnProf = useServerFn(updateUserProfile);
  const fnNotes = useServerFn(setUserNotesAndTags);

  const [d, setD] = useState<any>(null);
  const [tab, setTab] = useState<"overview" | "orders" | "notes" | "activity" | "security" | "permissions">("overview");
  const { isSuperAdmin } = useAdminPermissions();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const load = async () => {
    try {
      const r: any = await fnGet({ data: { userId } });
      setD(r);
      setNotes(r.profile?.admin_notes ?? "");
      setTags(r.profile?.tags ?? []);
      setEditName(r.profile?.name ?? "");
      setEditPhone(r.profile?.phone ?? "");
    } catch (e: any) { toast.error(e?.message || "Failed to load"); onClose(); }
  };
  useEffect(() => { load(); }, [userId]);

  const wrap = async (fn: () => Promise<any>, ok = "Done") => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); onChanged(); }
    catch (e: any) { toast.error(e?.message || "Failed"); }
    setBusy(false);
  };

  const toggleRole = (role: Role) => wrap(async () => {
    const has = d.roles.includes(role);
    await fnRole({ data: { userId, role, action: has ? "remove" : "add" } });
  }, "Role updated");

  const remove = () => {
    if (!confirm("Delete this user permanently?")) return;
    wrap(() => fnDel({ data: { userId } }).then(() => { onChanged(); onClose(); }), "User deleted");
  };

  const banFor = (hours?: number) => {
    const reason = prompt(hours ? `Ban for ${hours}h. Reason (optional):` : "Permanent ban. Reason (optional):") ?? "";
    wrap(() => fnBan({ data: { userId, hours, reason } }), "User banned");
  };

  const saveTagsNotes = () => wrap(() => fnNotes({ data: { userId, adminNotes: notes, tags } }), "Notes & tags saved");
  const saveProfile = () => wrap(() => fnProf({ data: { userId, name: editName, phone: editPhone } }), "Profile updated");
  const toggleVip = () => wrap(() => fnProf({ data: { userId, vip: !d.profile?.vip } }), d.profile?.vip ? "VIP removed" : "Marked VIP");

  if (!d) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl p-10"><Loader2 className="animate-spin" /></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {d.profile?.vip && <Crown size={16} className="text-amber-500" />}
            <h3 className="font-black text-lg">{d.profile?.name || d.user.email}</h3>
            {d.user.isBanned && <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1"><Ban size={10} /> banned</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="flex gap-1 px-4 border-b border-gray-100 text-xs">
          {([
            ["overview", "Overview"],
            ["orders", `Orders (${d.orders.length})`],
            ["notes", "Notes & Tags"],
            ["activity", `Activity (${d.audit.length})`],
            ["security", "Security"],
            ...(isSuperAdmin ? [["permissions", "Permissions"]] as const : []),
          ] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-3 py-2.5 font-bold border-b-2 ${tab === k ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
              {l}
            </button>
          ))}
        </div>

        <div className="overflow-auto p-6 space-y-5">
          {tab === "overview" && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard label="Lifetime ₹" value={`₹${d.stats.totalSpend.toFixed(0)}`} accent="green" />
                <StatCard label="Orders" value={d.stats.count} />
                <StatCard label="AOV" value={`₹${d.stats.aov.toFixed(0)}`} />
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-1.5 text-gray-700"><Mail size={13} /> {d.user.email} {d.user.emailConfirmed && <CheckCircle2 size={13} className="text-green-500" />}</div>
                {d.profile?.phone && <div className="flex items-center gap-1.5 text-gray-700"><Phone size={13} /> {d.profile.phone}</div>}
                <div className="text-xs text-gray-500 flex items-center gap-4 flex-wrap">
                  <span className="flex items-center gap-1"><Calendar size={12} /> Joined {fmtDate(d.user.createdAt)}</span>
                  <span>Last sign-in {fmtDateTime(d.user.lastSignInAt)}</span>
                  <span className="uppercase">{d.user.provider}</span>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Roles</div>
                <div className="flex gap-2 flex-wrap">
                  {(["admin", "moderator", "customer"] as Role[]).map((r) => {
                    const has = d.roles.includes(r);
                    return (
                      <button key={r} onClick={() => toggleRole(r)} disabled={busy}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${has ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-200 hover:border-orange-300"}`}>
                        {has ? <Shield size={12} /> : <ShieldOff size={12} />} {r}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="border border-gray-100 rounded-xl p-3 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500">Edit profile</div>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                <div className="flex gap-2">
                  <button onClick={saveProfile} disabled={busy} className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Save size={11} /> Save</button>
                  <button onClick={toggleVip} disabled={busy} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                    <Crown size={11} /> {d.profile?.vip ? "Remove VIP" : "Mark VIP"}
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === "orders" && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><ShoppingBag size={12} /> {d.orders.length} orders</div>
              {d.orders.length === 0 ? (
                <div className="text-sm text-gray-400">No orders yet.</div>
              ) : (
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-[11px] uppercase text-gray-500">
                      <tr><th className="text-left px-3 py-2">Order</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Payment</th><th className="text-left px-3 py-2">Total</th><th className="text-left px-3 py-2">Date</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {d.orders.map((o: any) => (
                        <tr key={o.id}>
                          <td className="px-3 py-2 font-bold">{o.order_number}</td>
                          <td className="px-3 py-2 text-xs">{o.order_status}</td>
                          <td className="px-3 py-2 text-xs">{o.payment_status}</td>
                          <td className="px-3 py-2">₹{Number(o.total).toFixed(0)}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{fmtDate(o.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><TagIcon size={12} /> Tags</div>
                <div className="flex gap-1 flex-wrap mb-2">
                  {tags.map((t) => (
                    <span key={t} className={`text-xs font-bold px-2 py-1 rounded-full border flex items-center gap-1 ${tagColor(t)}`}>
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-red-600"><X size={11} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newTag} onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && newTag.trim()) { setTags([...new Set([...tags, newTag.trim()])]); setNewTag(""); } }}
                    placeholder="Add tag (vip, wholesale, fraud…)" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  <button onClick={() => { if (newTag.trim()) { setTags([...new Set([...tags, newTag.trim()])]); setNewTag(""); } }}
                    className="px-3 py-2 bg-gray-100 rounded-lg text-xs font-bold">Add</button>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><NotebookPen size={12} /> Internal notes</div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
                  placeholder="Notes visible only to admins…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono" />
              </div>
              <button onClick={saveTagsNotes} disabled={busy}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5">
                <Save size={13} /> Save notes & tags
              </button>
            </div>
          )}

          {tab === "activity" && (
            <div className="space-y-1.5">
              {d.audit.length === 0 ? (
                <div className="text-sm text-gray-400">No admin actions logged yet.</div>
              ) : d.audit.map((r: any) => (
                <div key={r.id} className="border border-gray-100 rounded-lg px-3 py-2 text-xs flex justify-between gap-3">
                  <div>
                    <div className="font-bold text-gray-800">{r.action}</div>
                    <div className="text-gray-500">by {r.actor_email || "system"}</div>
                    {Object.keys(r.details || {}).length > 0 && (
                      <div className="font-mono text-[10px] text-gray-400 mt-1 truncate max-w-[400px]">{JSON.stringify(r.details)}</div>
                    )}
                  </div>
                  <div className="text-gray-400 whitespace-nowrap">{fmtDateTime(r.created_at)}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-3">
              {d.user.isBanned && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-bold text-red-800">User is banned</div>
                    <div className="text-xs text-red-600">Until {fmtDateTime(d.user.bannedUntil)}</div>
                  </div>
                  <button onClick={() => wrap(() => fnUnban({ data: { userId } }), "Unbanned")} disabled={busy}
                    className="px-3 py-1.5 bg-white border border-red-300 text-red-700 rounded-lg text-xs font-bold">Unban</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <SecBtn onClick={() => wrap(() => fnReset({ data: { userId } }), "Reset email sent")} disabled={busy}
                  icon={<KeyRound size={14} />} label="Send password reset" sub="Email recovery link" />
                <SecBtn onClick={() => wrap(() => fnInvite({ data: { userId } }), "Invite resent")} disabled={busy}
                  icon={<Mail size={14} />} label="Resend invite" sub="Re-send signup email" />
                <SecBtn onClick={() => wrap(() => fnLogout({ data: { userId } }), "All sessions ended")} disabled={busy}
                  icon={<LogOut size={14} />} label="Force logout" sub="End all active sessions" />
                {!d.user.isBanned && (
                  <>
                    <SecBtn onClick={() => banFor(24)} disabled={busy} danger
                      icon={<Ban size={14} />} label="Ban 24 hours" sub="Temporary suspension" />
                    <SecBtn onClick={() => banFor(24 * 7)} disabled={busy} danger
                      icon={<Ban size={14} />} label="Ban 7 days" sub="Week-long suspension" />
                    <SecBtn onClick={() => banFor(undefined)} disabled={busy} danger
                      icon={<Ban size={14} />} label="Ban permanently" sub="Block login forever" />
                  </>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button onClick={remove} disabled={busy}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-1.5">
                  <Trash2 size={14} /> Delete user permanently
                </button>
              </div>
            </div>
          )}
          {tab === "permissions" && isSuperAdmin && (
            <UserPermissionsPanel userId={userId} userEmail={d.user.email} />
          )}
        </div>
      </div>
    </div>
  );
}

function SecBtn({ icon, label, sub, onClick, disabled, danger }: any) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-left p-3 rounded-xl border transition disabled:opacity-50 ${danger ? "border-red-200 hover:bg-red-50" : "border-gray-200 hover:border-orange-300 hover:bg-orange-50"}`}>
      <div className={`flex items-center gap-1.5 font-bold text-sm ${danger ? "text-red-700" : "text-gray-900"}`}>{icon} {label}</div>
      <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div>
    </button>
  );
}

// ───────────────────────────── Create Modal ─────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const fn = useServerFn(createUserAccount);
  const [form, setForm] = useState({ email: "", name: "", phone: "", password: "", role: "customer" as Role, sendInvite: true });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await fn({ data: { ...form, password: form.password || undefined } });
      toast.success(form.sendInvite ? "Invite sent" : "User created");
      onCreated();
    } catch (e: any) { toast.error(e?.message || "Failed"); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4 flex justify-between items-center">
          <h3 className="font-black text-lg">Add user</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-3">
          <input placeholder="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          <input placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.sendInvite} onChange={(e) => setForm({ ...form, sendInvite: e.target.checked })} />
            Send invite email (user sets own password)
          </label>
          {!form.sendInvite && (
            <input placeholder="Password (min 8 chars)" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
          )}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm">
              <option value="customer">Customer</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button onClick={submit} disabled={busy || !form.email}
            className="w-full mt-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {form.sendInvite ? "Send invite" : "Create user"}
          </button>
        </div>
      </div>
    </div>
  );
}
