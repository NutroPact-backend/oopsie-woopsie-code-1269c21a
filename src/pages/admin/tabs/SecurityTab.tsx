// @ts-nocheck
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  get2FAStatus, startTotpEnrollment, confirmTotpEnrollment, enableEmailOtp,
  disable2FA, regenerateBackupCodes, revoke2FASession,
  listIpAllowlist, addIpAllowlistEntry, toggleIpAllowlistEntry, deleteIpAllowlistEntry,
  listLoginAttempts, getMyIp,
} from "@/lib/security.functions";
import { getProductAuthSecretStatus, rotateProductAuthSecret } from "@/lib/admin-secrets.functions";
import { Shield, Smartphone, Mail, Key, Globe, Activity, Trash2, Plus, Loader2, Check, X, Copy, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { TabHelp } from './_TabHelp';

export default function SecurityTab() {
  const [status, setStatus] = useState<any>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [ipList, setIpList] = useState<any[]>([]);
  const [myIp, setMyIp] = useState("");
  const [loading, setLoading] = useState(true);

  const f = {
    status: useServerFn(get2FAStatus),
    startTotp: useServerFn(startTotpEnrollment),
    confirmTotp: useServerFn(confirmTotpEnrollment),
    enableEmail: useServerFn(enableEmailOtp),
    disable: useServerFn(disable2FA),
    regen: useServerFn(regenerateBackupCodes),
    revoke: useServerFn(revoke2FASession),
    ipList: useServerFn(listIpAllowlist),
    ipAdd: useServerFn(addIpAllowlistEntry),
    ipToggle: useServerFn(toggleIpAllowlistEntry),
    ipDel: useServerFn(deleteIpAllowlistEntry),
    attempts: useServerFn(listLoginAttempts),
    myIp: useServerFn(getMyIp),
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const [s, a, i, m] = await Promise.all([
        f.status(), f.attempts({ data: { limit: 50 } }), f.ipList(), f.myIp(),
      ]);
      setStatus(s); setAttempts(a.rows); setIpList(i.rows); setMyIp(m.ip);
    } catch (e: any) { toast.error(e?.message || "Failed to load"); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  if (loading) return <div className="p-8 text-center text-gray-500"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <TabHelp topic="security" />
      <TwoFactorCard status={status} fns={f} onRefresh={refresh} />
      <BackupCodesCard status={status} fns={f} onRefresh={refresh} />
      <SessionsCard status={status} fns={f} onRefresh={refresh} />
      <IpAllowlistCard rows={ipList} fns={f} myIp={myIp} onRefresh={refresh} />
      <ProductAuthSecretCard />
      <AttemptsCard rows={attempts} />
    </div>
  );
}

function Card({ title, icon, children, action }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
        <div className="flex items-center gap-2"><span className="text-orange-500">{icon}</span>
          <h3 className="font-black text-gray-900">{title}</h3></div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function TwoFactorCard({ status, fns, onRefresh }: any) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const startTotp = async () => {
    setBusy(true);
    try { const r = await fns.startTotp(); setSetup({ qr: r.qrDataUrl, secret: r.secret }); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };
  const confirmTotp = async () => {
    setBusy(true);
    try { await fns.confirmTotp({ data: { code } }); toast.success("TOTP enabled"); setSetup(null); setCode(""); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };
  const enableEmail = async () => {
    setBusy(true);
    try { await fns.enableEmail(); toast.success("Email OTP enabled"); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };
  const disable = async () => {
    if (!confirm("Disable 2FA? This removes backup codes and active sessions.")) return;
    setBusy(true);
    try { await fns.disable(); toast.success("2FA disabled"); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };

  return (
    <Card title="Two-Factor Authentication" icon={<Shield size={18} />}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600">
            Status: {status.enabled
              ? <span className="text-green-600 font-bold">✓ Enabled ({status.method?.toUpperCase()})</span>
              : <span className="text-amber-600 font-bold">⚠ Not configured</span>}
          </p>
          {status.lastVerifiedAt && <p className="text-xs text-gray-400 mt-1">Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}</p>}
        </div>
        {status.enabled && <button onClick={disable} disabled={busy}
          className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Disable</button>}
      </div>

      {!status.enabled && !setup && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button onClick={startTotp} disabled={busy}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 text-left">
            <Smartphone className="text-orange-500 mb-2" />
            <div className="font-bold text-sm">Authenticator app</div>
            <div className="text-xs text-gray-500">Google Authenticator, Authy — offline, recommended</div>
          </button>
          <button onClick={enableEmail} disabled={busy}
            className="p-4 border-2 border-gray-200 rounded-xl hover:border-orange-400 text-left">
            <Mail className="text-orange-500 mb-2" />
            <div className="font-bold text-sm">Email OTP</div>
            <div className="text-xs text-gray-500">6-digit code sent to your email each login</div>
          </button>
        </div>
      )}

      {setup && (
        <div className="space-y-3 p-4 bg-orange-50 rounded-xl border border-orange-200">
          <p className="text-sm font-bold">Scan with Google Authenticator / Authy:</p>
          <img src={setup.qr} alt="QR" className="w-48 h-48 mx-auto bg-white p-2 rounded-lg" />
          <p className="text-xs text-center text-gray-600">Or enter secret manually: <code className="font-mono bg-white px-2 py-0.5 rounded">{setup.secret}</code></p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit code from app" maxLength={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-lg tracking-widest" />
          <div className="flex gap-2">
            <button onClick={confirmTotp} disabled={busy || code.length < 6}
              className="flex-1 bg-orange-500 text-white py-2 rounded-lg font-bold disabled:opacity-50">
              {busy ? <Loader2 className="animate-spin mx-auto" size={16} /> : "Verify & enable"}
            </button>
            <button onClick={() => setSetup(null)} className="px-4 border border-gray-300 rounded-lg">Cancel</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BackupCodesCard({ status, fns, onRefresh }: any) {
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const regen = async () => {
    if (!confirm("Generate new codes? Old ones become invalid.")) return;
    setBusy(true);
    try { const r = await fns.regen(); setCodes(r.codes); toast.success("New codes generated — save them now!"); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
    setBusy(false);
  };

  return (
    <Card title="Backup Recovery Codes" icon={<Key size={18} />}
      action={<button onClick={regen} disabled={busy || !status.enabled}
        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded-lg disabled:opacity-50">Regenerate</button>}>
      {!status.enabled
        ? <p className="text-sm text-gray-500">Enable 2FA first to generate backup codes.</p>
        : <p className="text-sm text-gray-600">
            Unused codes: <span className="font-bold text-green-600">{status.backupCodesUnused}</span> / {status.backupCodesTotal}.
            Use a code if you lose access to your authenticator.
          </p>}
      {codes && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-xl">
          <p className="text-xs font-bold text-yellow-900 mb-2">⚠ Save these now — they won't be shown again:</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {codes.map((c) => <div key={c} className="bg-white px-3 py-1.5 rounded border border-yellow-200">{c}</div>)}
          </div>
          <button onClick={() => { navigator.clipboard.writeText(codes.join("\n")); toast.success("Copied"); }}
            className="mt-3 text-xs flex items-center gap-1 text-yellow-900 font-bold"><Copy size={12} /> Copy all</button>
        </div>
      )}
    </Card>
  );
}

function SessionsCard({ status, fns, onRefresh }: any) {
  const revoke = async (id: string) => {
    try { await fns.revoke({ data: { sessionId: id } }); toast.success("Revoked"); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
  };
  return (
    <Card title="Active 2FA Sessions" icon={<Activity size={18} />}>
      {(!status.sessions || status.sessions.length === 0)
        ? <p className="text-sm text-gray-500">No active sessions.</p>
        : <div className="space-y-2">
            {status.sessions.map((s: any) => {
              const expired = new Date(s.expires_at).getTime() < Date.now();
              return (
                <div key={s.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg text-sm">
                  <div>
                    <div className="font-bold">{s.ip || "Unknown IP"} {s.trusted_device && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">TRUSTED</span>}</div>
                    <div className="text-xs text-gray-500 truncate max-w-md">{s.user_agent}</div>
                    <div className="text-[10px] text-gray-400">Expires: {new Date(s.expires_at).toLocaleString()} {expired && "(expired)"} {s.revoked_at && "(revoked)"}</div>
                  </div>
                  {!s.revoked_at && !expired && <button onClick={() => revoke(s.id)} className="text-xs text-red-600 hover:underline">Revoke</button>}
                </div>
              );
            })}
          </div>}
    </Card>
  );
}

function IpAllowlistCard({ rows, fns, myIp, onRefresh }: any) {
  const [cidr, setCidr] = useState("");
  const [label, setLabel] = useState("");
  const add = async () => {
    try { await fns.ipAdd({ data: { cidr, label } }); toast.success("Added"); setCidr(""); setLabel(""); onRefresh(); }
    catch (e: any) { toast.error(e?.message); }
  };
  return (
    <Card title="Admin IP Allowlist" icon={<Globe size={18} />}>
      <p className="text-xs text-gray-500 mb-3">
        If empty, all IPs allowed. Add entries to restrict admin access. Your IP: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{myIp || "unknown"}</code>
        {myIp && <button onClick={() => setCidr(myIp + "/32")} className="ml-2 text-orange-600 font-bold hover:underline">Use mine</button>}
      </p>
      <div className="flex gap-2 mb-4">
        <input value={cidr} onChange={(e) => setCidr(e.target.value)} placeholder="e.g. 1.2.3.4/32 or 10.0.0.0/24"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (office, home...)"
          className="w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <button onClick={add} disabled={!cidr} className="px-4 bg-orange-500 text-white rounded-lg disabled:opacity-50">
          <Plus size={16} />
        </button>
      </div>
      {rows.length === 0
        ? <p className="text-sm text-gray-500 italic">No restrictions (all IPs allowed)</p>
        : <div className="space-y-1">
            {rows.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  <code className="font-mono font-bold">{r.cidr}</code>
                  <span className="text-gray-500">{r.label}</span>
                  {!r.active && <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded">DISABLED</span>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={async () => { await fns.ipToggle({ data: { id: r.id, active: !r.active } }); onRefresh(); }}
                    className="text-xs text-gray-600 hover:underline">{r.active ? "Disable" : "Enable"}</button>
                  <button onClick={async () => { if (confirm("Delete?")) { await fns.ipDel({ data: { id: r.id } }); onRefresh(); } }}
                    className="text-red-500 hover:text-red-700"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>}
    </Card>
  );
}

function AttemptsCard({ rows }: any) {
  return (
    <Card title="Recent Admin Login Attempts" icon={<Activity size={18} />}>
      {rows.length === 0
        ? <p className="text-sm text-gray-500">No attempts logged yet.</p>
        : <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600 sticky top-0">
                <tr><th className="text-left p-2">When</th><th className="text-left p-2">Email</th><th className="text-left p-2">IP</th>
                  <th className="text-left p-2">Stage</th><th className="text-left p-2">Result</th><th className="text-left p-2">Reason</th></tr>
              </thead>
              <tbody>
                {rows.map((r: any) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2">{r.email || "—"}</td>
                    <td className="p-2 font-mono">{r.ip || "—"}</td>
                    <td className="p-2"><span className="bg-gray-100 px-1.5 py-0.5 rounded">{r.stage}</span></td>
                    <td className="p-2">{r.success ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-red-500" />}</td>
                    <td className="p-2 text-gray-500">{r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
    </Card>
  );
}

function ProductAuthSecretCard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const getStatus = useServerFn(getProductAuthSecretStatus);
  const rotate = useServerFn(rotateProductAuthSecret);

  const refresh = async () => {
    setLoading(true);
    try { setStatus(await getStatus()); }
    catch (e: any) { toast.error(e?.message || "Failed to load secret status"); }
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const doRotate = async (action: "rotate" | "set_custom" | "clear_previous") => {
    if (action !== "clear_previous" && confirmText.trim().toUpperCase() !== "ROTATE") {
      toast.error('Type "ROTATE" to confirm');
      return;
    }
    setBusy(true);
    try {
      await rotate({ data: { action, customSecret: action === "set_custom" ? custom : undefined, keepPrevious: true } });
      toast.success(action === "clear_previous" ? "Previous secret cleared" : "Secret rotated — new codes will use the new secret. Old codes still work during grace period.");
      setCustom(""); setShowCustom(false); setConfirmText("");
      await refresh();
    } catch (e: any) { toast.error(e?.message || "Rotation failed"); }
    setBusy(false);
  };

  return (
    <Card title="Product Auth Signing Secret" icon={<Key size={18} />}>
      {loading ? <div className="text-center py-6"><Loader2 className="animate-spin mx-auto text-gray-400" /></div> : (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            <div>
              Ye secret QR codes ko sign karta hai. <strong>Rotate karne ke baad purane codes "previous" secret se grace period me verify hote rahenge</strong> — jab tak tu "Clear previous" na kare. Custom secret kam se kam 32 chars ka hona chahiye (sirf A–Z, a–z, 0–9, _ , -).
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Current secret ({status?.source})</div>
              <div className="font-mono text-gray-900">{status?.currentMasked || "—"}</div>
              {status?.updatedAt && <div className="text-[10px] text-gray-400 mt-1">Updated: {new Date(status.updatedAt).toLocaleString()}</div>}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs text-gray-500 mb-1">Previous (grace period)</div>
              <div className="font-mono text-gray-900">{status?.previousMasked || "— none —"}</div>
              {status?.hasPrevious && (
                <button onClick={() => doRotate("clear_previous")} disabled={busy} className="text-xs text-red-600 hover:underline mt-1">Clear previous</button>
              )}
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <label className="block text-xs text-gray-600">
              Type <span className="font-mono bg-gray-100 px-1">ROTATE</span> to confirm:
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                placeholder="ROTATE"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => doRotate("rotate")}
                disabled={busy || confirmText.trim().toUpperCase() !== "ROTATE"}
                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
              >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Generate & rotate
              </button>
              <button
                onClick={() => setShowCustom((v) => !v)}
                className="border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
              >
                {showCustom ? "Cancel custom" : "Set custom secret"}
              </button>
            </div>

            {showCustom && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  placeholder="Paste your 32+ char secret (A–Z, a–z, 0–9, _, -)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
                <button
                  onClick={() => doRotate("set_custom")}
                  disabled={busy || custom.length < 32 || confirmText.trim().toUpperCase() !== "ROTATE"}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  Save custom secret
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
