// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { getCronHealth, getHealthOverview } from "@/lib/admin-health.functions";
import { Activity, AlertTriangle, CheckCircle2, Clock, ShieldAlert, XCircle } from "lucide-react";
import { TabHelp } from './_TabHelp';

function fmtTime(ts: string | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleString();
}

function statusBadge(status: string | null) {
  if (!status) return <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">never run</span>;
  const ok = status === "succeeded";
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      <TabHelp topic="adminHealth" />
      {ok ? "✓ " : "✗ "}
      {status}
    </span>
  );
}

export default function AdminHealthTab() {
  const cron = useQuery({
    queryKey: ["admin-cron-health"],
    queryFn: () => getCronHealth(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const overview = useQuery({
    queryKey: ["admin-health-overview"],
    queryFn: () => getHealthOverview(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const jobs = cron.data?.jobs || [];
  const totalJobs = jobs.length;
  const failed24 = jobs.filter((j: any) => (j.failures_24h ?? 0) > 0).length;
  const inactive = jobs.filter((j: any) => !j.active).length;

  const o = overview.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Activity size={20} className="text-orange-500" /> System Health
        </h2>
        <p className="text-sm text-gray-500">Live cron status, notification queue, and security events.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<CheckCircle2 size={16} />} label="Active cron jobs" value={`${totalJobs - inactive}/${totalJobs}`} tone={inactive === 0 ? "good" : "warn"} />
        <Stat icon={<XCircle size={16} />} label="Jobs failing (24h)" value={failed24} tone={failed24 === 0 ? "good" : "bad"} />
        <Stat icon={<AlertTriangle size={16} />} label="Queue failures" value={o?.queueFailureCount ?? "—"} tone={(o?.queueFailureCount ?? 0) === 0 ? "good" : "bad"} />
        <Stat icon={<ShieldAlert size={16} />} label="Security events (24h)" value={o?.securityEvents?.length ?? "—"} tone={(o?.securityEvents?.length ?? 0) === 0 ? "good" : "warn"} />
      </div>

      {/* Cron jobs */}
      <section className="bg-white border rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><Clock size={16} /> Cron jobs</h3>
          <button onClick={() => cron.refetch()} className="text-xs text-orange-600 hover:underline">Refresh</button>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Job</th>
                <th className="text-left px-4 py-2">Schedule</th>
                <th className="text-left px-4 py-2">Last run</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">24h runs</th>
                <th className="text-right px-4 py-2">24h fail</th>
              </tr>
            </thead>
            <tbody>
              {cron.isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading…</td></tr>}
              {!cron.isLoading && jobs.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No cron jobs scheduled.</td></tr>}
              {jobs.map((j: any) => (
                <tr key={j.jobid} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-xs">{j.jobname || `job-${j.jobid}`}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{j.schedule}</td>
                  <td className="px-4 py-2 text-xs">{fmtTime(j.last_start)}</td>
                  <td className="px-4 py-2">{statusBadge(j.last_status)}</td>
                  <td className="px-4 py-2 text-right">{j.runs_24h ?? 0}</td>
                  <td className={`px-4 py-2 text-right ${j.failures_24h > 0 ? "text-red-600 font-medium" : ""}`}>{j.failures_24h ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Failed notifications */}
      <section className="bg-white border rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><AlertTriangle size={16} /> Recent notification failures</h3>
          <span className="text-xs text-gray-500">{o?.queueFailureCount ?? 0} total</span>
        </header>
        {(o?.queueFailures?.length ?? 0) === 0 ? (
          <p className="px-4 py-6 text-center text-gray-500 text-sm">No failures — queue is healthy.</p>
        ) : (
          <ul className="divide-y text-sm">
            {o!.queueFailures.map((f: any) => (
              <li key={f.id} className="px-4 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{f.channel} · {f.template}</span>
                  <span className="text-xs text-gray-500">{fmtTime(f.updated_at)}</span>
                </div>
                <p className="text-xs text-gray-600 truncate">to {f.recipient}</p>
                {f.error && <p className="text-xs text-red-600 mt-1 line-clamp-2">{f.error}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Active lockouts */}
      <section className="bg-white border rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2"><ShieldAlert size={16} /> Active login lockouts</h3>
          <span className="text-xs text-gray-500">{o?.activeLockouts?.length ?? 0}</span>
        </header>
        {(o?.activeLockouts?.length ?? 0) === 0 ? (
          <p className="px-4 py-6 text-center text-gray-500 text-sm">No accounts currently locked.</p>
        ) : (
          <ul className="divide-y text-sm">
            {o!.activeLockouts.map((l: any) => (
              <li key={l.id} className="px-4 py-2 flex justify-between">
                <span>{l.email || "(no email)"} · <span className="text-gray-500 text-xs">{l.ip}</span></span>
                <span className="text-xs text-red-600">{l.fails} fails · until {fmtTime(l.locked_until)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Security events */}
      <section className="bg-white border rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2"><ShieldAlert size={16} /> Security events (last 24h)</h3>
        </header>
        {(o?.securityEvents?.length ?? 0) === 0 ? (
          <p className="px-4 py-6 text-center text-gray-500 text-sm">No security events logged.</p>
        ) : (
          <ul className="divide-y text-xs">
            {o!.securityEvents.map((e: any) => (
              <li key={e.id} className="px-4 py-2 flex justify-between gap-3">
                <div className="min-w-0">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mr-2 ${
                    e.severity === "critical" ? "bg-red-100 text-red-700" :
                    e.severity === "warn" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{e.severity}</span>
                  <span className="font-medium">{e.kind}</span>
                  {e.route && <span className="text-gray-500 ml-2">{e.route}</span>}
                  {e.source_ip && <span className="text-gray-400 ml-2">{e.source_ip}</span>}
                </div>
                <span className="text-gray-400 shrink-0">{fmtTime(e.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: any; tone: "good" | "warn" | "bad" }) {
  const ring = tone === "good" ? "border-green-200 bg-green-50" : tone === "warn" ? "border-amber-200 bg-amber-50" : "border-red-200 bg-red-50";
  const text = tone === "good" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-red-700";
  return (
    <div className={`border rounded-lg p-3 ${ring}`}>
      <div className={`flex items-center gap-1.5 text-xs ${text}`}>{icon}<span>{label}</span></div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
