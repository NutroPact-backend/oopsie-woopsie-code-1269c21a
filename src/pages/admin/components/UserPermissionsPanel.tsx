// @ts-nocheck
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getUserPermissions,
  setUserPermission,
  resetUserPermissions,
  copyUserPermissions,
  bulkSetUserPermissions,
} from "@/lib/permissions.functions";
import { AlertTriangle, Check, X, RotateCcw, Copy, Search } from "lucide-react";

type Tri = "inherit" | "allow" | "deny";

export function UserPermissionsPanel({ userId, userEmail }: { userId: string; userEmail: string }) {
  const qc = useQueryClient();
  const fnGet = useServerFn(getUserPermissions);
  const fnSet = useServerFn(setUserPermission);
  const fnReset = useServerFn(resetUserPermissions);
  const fnCopy = useServerFn(copyUserPermissions);
  const fnBulk = useServerFn(bulkSetUserPermissions);

  const q = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: () => fnGet({ data: { userId } }),
  });

  const [search, setSearch] = useState("");
  const [copyFromId, setCopyFromId] = useState("");
  const [confirmDangerous, setConfirmDangerous] = useState<{ code: string; granted: boolean } | null>(null);

  const catalog = q.data?.catalog ?? [];
  const overrides = q.data?.overrides ?? [];
  const effective = q.data?.effective ?? [];
  const roles = q.data?.roles ?? [];

  const overrideMap = useMemo(() => {
    const m = new Map<string, boolean>();
    overrides.forEach((o: any) => m.set(o.permission_code, o.granted));
    return m;
  }, [overrides]);

  const effectiveMap = useMemo(() => {
    const m = new Map<string, boolean>();
    effective.forEach((e: any) => m.set(e.permission_code, e.granted));
    return m;
  }, [effective]);

  const grouped = useMemo(() => {
    const filtered = catalog.filter((p: any) =>
      !search || p.code.includes(search.toLowerCase()) || p.label.toLowerCase().includes(search.toLowerCase()),
    );
    const g: Record<string, any[]> = {};
    filtered.forEach((p: any) => { (g[p.category] ||= []).push(p); });
    return g;
  }, [catalog, search]);

  const getTri = (code: string): Tri => {
    if (!overrideMap.has(code)) return "inherit";
    return overrideMap.get(code) ? "allow" : "deny";
  };

  const handleSet = async (code: string, tri: Tri, isDangerous: boolean) => {
    const granted = tri === "inherit" ? null : tri === "allow";
    if (isDangerous && granted === true && !confirmDangerous) {
      setConfirmDangerous({ code, granted: true });
      return;
    }
    await fnSet({ data: { userId, code, granted } });
    await qc.invalidateQueries({ queryKey: ["user-permissions", userId] });
  };

  const handleReset = async () => {
    if (!confirm(`Clear all permission overrides for ${userEmail}? They'll fall back to role defaults.`)) return;
    await fnReset({ data: { userId } });
    await qc.invalidateQueries({ queryKey: ["user-permissions", userId] });
  };

  const handleCopy = async () => {
    if (!copyFromId) return;
    if (!confirm(`Replace all permissions for ${userEmail} with permissions from selected user?`)) return;
    await fnCopy({ data: { fromUserId: copyFromId, toUserId: userId } });
    await qc.invalidateQueries({ queryKey: ["user-permissions", userId] });
  };

  if (q.isLoading) return <div className="p-6 text-sm text-gray-500">Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search permissions..."
            className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg" />
        </div>
        <div className="text-xs text-gray-500">
          Roles: <span className="font-bold">{roles.join(", ") || "none"}</span>
        </div>
        <input value={copyFromId} onChange={(e) => setCopyFromId(e.target.value)} placeholder="Copy from user ID..."
          className="px-3 py-2 text-xs border rounded-lg w-56" />
        <button onClick={handleCopy} disabled={!copyFromId} className="px-3 py-2 text-xs font-bold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 flex items-center gap-1">
          <Copy size={12} /> Copy
        </button>
        <button onClick={handleReset} className="px-3 py-2 text-xs font-bold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
          <RotateCcw size={12} /> Reset to role defaults
        </button>
      </div>

      {confirmDangerous && (
        <DangerousConfirm
          code={confirmDangerous.code}
          userEmail={userEmail}
          onCancel={() => setConfirmDangerous(null)}
          onConfirm={async () => {
            await fnSet({ data: { userId, code: confirmDangerous.code, granted: true } });
            setConfirmDangerous(null);
            await qc.invalidateQueries({ queryKey: ["user-permissions", userId] });
          }}
        />
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {Object.entries(grouped).map(([category, perms]) => (
          <div key={category} className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 font-bold text-xs uppercase tracking-wide text-gray-600">{category} ({perms.length})</div>
            <div className="divide-y">
              {perms.map((p: any) => {
                const tri = getTri(p.code);
                const eff = effectiveMap.get(p.code);
                return (
                  <div key={p.code} className={`flex items-center gap-3 px-4 py-2.5 ${p.is_dangerous ? "bg-red-50/30" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{p.label}</span>
                        {p.is_dangerous && (
                          <span className="text-[9px] font-black uppercase bg-red-100 text-red-700 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5">
                            <AlertTriangle size={9} /> Dangerous
                          </span>
                        )}
                        {eff !== undefined && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${eff ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {eff ? "EFFECTIVE: ALLOW" : "EFFECTIVE: DENY"}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5"><code>{p.code}</code> {p.description && `— ${p.description}`}</div>
                    </div>
                    <div className="flex rounded-lg border overflow-hidden shrink-0">
                      {(["inherit", "allow", "deny"] as Tri[]).map((opt) => (
                        <button key={opt} onClick={() => handleSet(p.code, opt, p.is_dangerous)}
                          className={`px-3 py-1.5 text-xs font-bold transition ${
                            tri === opt
                              ? opt === "allow" ? "bg-green-500 text-white"
                                : opt === "deny" ? "bg-red-500 text-white"
                                : "bg-gray-700 text-white"
                              : "bg-white text-gray-500 hover:bg-gray-50"
                          }`}>
                          {opt === "allow" ? <Check size={12} className="inline" /> : opt === "deny" ? <X size={12} className="inline" /> : "Inherit"}
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

function DangerousConfirm({ code, userEmail, onCancel, onConfirm }: { code: string; userEmail: string; onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState("");
  return (
    <div className="border-2 border-red-300 bg-red-50 rounded-xl p-4">
      <div className="flex items-start gap-2">
        <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={18} />
        <div className="flex-1">
          <p className="font-bold text-red-900 text-sm">Grant dangerous permission?</p>
          <p className="text-xs text-red-700 mt-1">
            You're about to grant <code className="bg-white px-1 rounded">{code}</code> to <strong>{userEmail}</strong>.
            Type their email to confirm.
          </p>
          <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={userEmail}
            className="mt-2 w-full px-3 py-2 text-sm border border-red-300 rounded-lg" />
          <div className="flex gap-2 mt-2">
            <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold bg-white border rounded-lg">Cancel</button>
            <button onClick={onConfirm} disabled={typed !== userEmail}
              className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg disabled:opacity-50">Confirm Grant</button>
          </div>
        </div>
      </div>
    </div>
  );
}
