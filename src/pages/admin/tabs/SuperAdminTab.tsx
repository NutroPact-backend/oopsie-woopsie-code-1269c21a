// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
  listPermissionCatalog,
  getRoleDefaults,
  setRoleDefault,
  listSuperAdmins,
  promoteToSuperAdmin,
  demoteSuperAdmin,
  listPermissionAuditLog,
} from "@/lib/permissions.functions";
import { NoAccess } from "@/pages/admin/components/PermissionGate";
import { Shield, ShieldCheck, Crown, Trash2, Plus, History } from "lucide-react";

type RoleKey = "admin" | "moderator" | "customer";

export default function SuperAdminTab() {
  const { isSuperAdmin, isLoading } = useAdminPermissions();
  if (isLoading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;
  if (!isSuperAdmin) return <NoAccess perm="super_admin.manage" />;

  const [section, setSection] = useState<"roles" | "supers" | "audit">("roles");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <Crown size={20} className="text-amber-500" />
          <h2 className="text-xl font-black">Super Admin Console</h2>
        </div>
        <p className="text-sm text-gray-500">Control role defaults, manage super-admins, and audit every permission change.</p>
      </div>

      <div className="flex gap-2 border-b">
        {[
          { id: "roles", label: "Role Defaults", icon: <Shield size={14} /> },
          { id: "supers", label: "Super Admins", icon: <ShieldCheck size={14} /> },
          { id: "audit", label: "Audit Log", icon: <History size={14} /> },
        ].map((s) => (
          <button key={s.id} onClick={() => setSection(s.id as any)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition ${
              section === s.id ? "border-orange-500 text-orange-600" : "border-transparent text-gray-500 hover:text-gray-800"
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {section === "roles" && <RoleDefaultsMatrix />}
      {section === "supers" && <SuperAdminsList />}
      {section === "audit" && <PermissionAuditLog />}
    </div>
  );
}

function RoleDefaultsMatrix() {
  const qc = useQueryClient();
  const fnCat = useServerFn(listPermissionCatalog);
  const fnGet = useServerFn(getRoleDefaults);
  const fnSet = useServerFn(setRoleDefault);
  const [role, setRole] = useState<RoleKey>("admin");
  const [search, setSearch] = useState("");

  const cat = useQuery({ queryKey: ["perm-catalog"], queryFn: () => fnCat({}) });
  const defs = useQuery({ queryKey: ["role-defaults", role], queryFn: () => fnGet({ data: { role } }) });

  const defMap = useMemo(() => {
    const m = new Map<string, boolean>();
    defs.data?.defaults.forEach((d: any) => m.set(d.permission_code, d.granted));
    return m;
  }, [defs.data]);

  const grouped = useMemo(() => {
    const filtered = (cat.data?.permissions ?? []).filter((p: any) =>
      !search || p.code.includes(search) || p.label.toLowerCase().includes(search.toLowerCase()),
    );
    const g: Record<string, any[]> = {};
    filtered.forEach((p: any) => { (g[p.category] ||= []).push(p); });
    return g;
  }, [cat.data, search]);

  const handleSet = async (code: string, val: boolean | null) => {
    await fnSet({ data: { role, code, granted: val } });
    await qc.invalidateQueries({ queryKey: ["role-defaults", role] });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex rounded-lg border overflow-hidden">
          {(["admin", "moderator", "customer"] as RoleKey[]).map((r) => (
            <button key={r} onClick={() => setRole(r)}
              className={`px-4 py-2 text-xs font-bold uppercase ${role === r ? "bg-orange-500 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}>
              {r}
            </button>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border rounded-lg" />
        <p className="text-xs text-gray-500">Set <em>Inherit</em> to remove the default (falls to deny).</p>
      </div>

      <div className="space-y-3 max-h-[60vh] overflow-y-auto">
        {Object.entries(grouped).map(([category, perms]) => (
          <div key={category} className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-bold text-xs uppercase text-gray-600">{category}</div>
            <div className="divide-y">
              {perms.map((p: any) => {
                const cur = defMap.get(p.code);
                const tri: "inherit" | "allow" | "deny" = cur === undefined ? "inherit" : cur ? "allow" : "deny";
                return (
                  <div key={p.code} className={`flex items-center gap-3 px-4 py-2 ${p.is_dangerous ? "bg-red-50/30" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{p.label} {p.is_dangerous && <span className="text-[9px] font-black text-red-700 ml-1">⚠ DANGER</span>}</div>
                      <div className="text-[11px] text-gray-500"><code>{p.code}</code></div>
                    </div>
                    <div className="flex rounded-lg border overflow-hidden shrink-0">
                      {(["inherit", "allow", "deny"] as const).map((opt) => (
                        <button key={opt} onClick={() => handleSet(p.code, opt === "inherit" ? null : opt === "allow")}
                          className={`px-3 py-1 text-xs font-bold ${
                            tri === opt
                              ? opt === "allow" ? "bg-green-500 text-white"
                                : opt === "deny" ? "bg-red-500 text-white"
                                : "bg-gray-700 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuperAdminsList() {
  const qc = useQueryClient();
  const fnList = useServerFn(listSuperAdmins);
  const fnPromote = useServerFn(promoteToSuperAdmin);
  const fnDemote = useServerFn(demoteSuperAdmin);
  const [newId, setNewId] = useState("");
  const list = useQuery({ queryKey: ["super-admins"], queryFn: () => fnList({}) });

  const promote = async () => {
    if (!newId) return;
    if (!confirm("Promote this user to super-admin? They will get every permission.")) return;
    await fnPromote({ data: { userId: newId } });
    setNewId("");
    await qc.invalidateQueries({ queryKey: ["super-admins"] });
  };

  const demote = async (id: string, email: string) => {
    if (!confirm(`Demote ${email} from super-admin?`)) return;
    try {
      await fnDemote({ data: { userId: id } });
      await qc.invalidateQueries({ queryKey: ["super-admins"] });
    } catch (e: any) {
      alert(e.message || "Demotion failed");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
      <div className="flex gap-2">
        <input value={newId} onChange={(e) => setNewId(e.target.value)} placeholder="User UUID to promote"
          className="flex-1 px-3 py-2 text-sm border rounded-lg" />
        <button onClick={promote} disabled={!newId} className="px-4 py-2 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1">
          <Plus size={14} /> Promote
        </button>
      </div>
      <div className="divide-y border rounded-xl">
        {list.data?.superAdmins.map((s: any) => (
          <div key={s.userId} className="flex items-center gap-3 px-4 py-3">
            <Crown size={16} className="text-amber-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{s.name || s.email || s.userId}</div>
              <div className="text-xs text-gray-500">{s.email} · since {new Date(s.since).toLocaleDateString()}</div>
            </div>
            <button onClick={() => demote(s.userId, s.email)} className="px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1">
              <Trash2 size={12} /> Demote
            </button>
          </div>
        ))}
        {(!list.data?.superAdmins.length) && <div className="p-6 text-center text-sm text-gray-500">No super admins.</div>}
      </div>
    </div>
  );
}

function PermissionAuditLog() {
  const fn = useServerFn(listPermissionAuditLog);
  const q = useQuery({ queryKey: ["perm-audit"], queryFn: () => fn({ data: { limit: 200 } }) });
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="text-left px-4 py-2">When</th>
            <th className="text-left px-4 py-2">Action</th>
            <th className="text-left px-4 py-2">Target</th>
            <th className="text-left px-4 py-2">Permission</th>
            <th className="text-left px-4 py-2">Value</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {q.data?.entries.map((e: any) => (
            <tr key={e.id}>
              <td className="px-4 py-2 text-xs text-gray-500">{new Date(e.created_at).toLocaleString()}</td>
              <td className="px-4 py-2 font-bold text-xs">{e.action}</td>
              <td className="px-4 py-2 text-xs">{e.target_user_id?.slice(0, 8) || e.target_role || "—"}</td>
              <td className="px-4 py-2 text-xs"><code>{e.permission_code || "—"}</code></td>
              <td className="px-4 py-2 text-xs">{e.new_value ? JSON.stringify(e.new_value) : "—"}</td>
            </tr>
          ))}
          {!q.data?.entries.length && <tr><td colSpan={5} className="text-center p-6 text-gray-500 text-sm">No entries</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
