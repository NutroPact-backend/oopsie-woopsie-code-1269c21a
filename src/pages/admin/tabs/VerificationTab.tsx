// @ts-nocheck
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { runVerification, type FeatureReport, type CheckStatus } from "@/lib/verification.functions";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Shield, Smartphone } from "lucide-react";

const statusStyle: Record<CheckStatus, { icon: any; chip: string; ring: string }> = {
  pass: { icon: CheckCircle2, chip: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "border-l-emerald-500" },
  warn: { icon: AlertTriangle, chip: "bg-amber-50 text-amber-700 border-amber-200", ring: "border-l-amber-500" },
  fail: { icon: XCircle, chip: "bg-rose-50 text-rose-700 border-rose-200", ring: "border-l-rose-500" },
};

export default function VerificationTab() {
  const fn = useServerFn(runVerification);
  const [data, setData] = useState<{ ranAt: string; report: FeatureReport[]; roleSummary: { role: string; count: number }[] } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const m = useMutation({
    mutationFn: () => fn({}),
    onSuccess: (d) => { setData(d as any); setErr(null); },
    onError: (e: any) => setErr(e?.message || "Failed"),
  });

  const totals = data ? data.report.reduce(
    (a, r) => { a[r.overall]++; return a; },
    { pass: 0, warn: 0, fail: 0 } as Record<CheckStatus, number>,
  ) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="text-indigo-600" size={20} />
              <h2 className="text-lg font-semibold">Feature Verification</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              End-to-end check: master flag · backend data · format sanity. Run this after toggling flags or editing config.
            </p>
          </div>
          <button
            onClick={() => m.mutate()}
            disabled={m.isPending}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl disabled:opacity-60"
          >
            <RefreshCw size={16} className={m.isPending ? "animate-spin" : ""} />
            {m.isPending ? "Running checks…" : data ? "Re-run checks" : "Run verification"}
          </button>
        </div>

        {totals && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <SummaryPill label="Pass" count={totals.pass} status="pass" />
            <SummaryPill label="Warn" count={totals.warn} status="warn" />
            <SummaryPill label="Fail" count={totals.fail} status="fail" />
          </div>
        )}

        {data && (
          <p className="text-xs text-gray-400 mt-3">
            Last run: {new Date(data.ranAt).toLocaleString()}
          </p>
        )}
      </div>

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-sm">
          {err}
        </div>
      )}

      {!data && !m.isPending && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center text-gray-500">
          <Shield className="mx-auto text-gray-300" size={40} />
          <p className="mt-3 text-sm">Click <b>Run verification</b> to check every feature pipeline live.</p>
        </div>
      )}

      {/* Feature cards */}
      {data && (
        <div className="grid gap-4 md:grid-cols-2">
          {data.report.map(r => <FeatureCard key={r.key} report={r} />)}
        </div>
      )}

      {/* Role summary */}
      {data && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Role distribution</h3>
          <div className="flex flex-wrap gap-2">
            {data.roleSummary.length === 0 && <span className="text-xs text-gray-400">No roles assigned yet</span>}
            {data.roleSummary.map(r => (
              <span key={r.role} className="text-xs px-3 py-1.5 rounded-full bg-gray-50 border border-gray-200 text-gray-700">
                <b className="text-gray-900">{r.count}</b> · {r.role}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Tab visibility is gated per-permission — non-admin roles will only see tabs in their grant list.
          </p>
        </div>
      )}

      {/* Mobile reminder */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Smartphone className="text-emerald-600 shrink-0" size={20} />
          <div className="text-sm">
            <div className="font-semibold text-gray-900">Mobile 375px sanity</div>
            <p className="text-gray-500 mt-0.5">
              Switch the preview to mobile (375×812) and open: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/</code>, a PDP, and <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/cart</code>. Confirm WhatsApp float, urgency widgets, Quick Checkout bar, and Pro picker don't overlap or overflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, count, status }: { label: string; count: number; status: CheckStatus }) {
  const s = statusStyle[status];
  const Icon = s.icon;
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s.chip}`}>
      <Icon size={18} />
      <div>
        <div className="text-2xl font-bold leading-none">{count}</div>
        <div className="text-xs opacity-80 mt-1">{label}</div>
      </div>
    </div>
  );
}

function FeatureCard({ report }: { report: FeatureReport }) {
  const s = statusStyle[report.overall];
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 border-l-4 ${s.ring} p-5 shadow-sm`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900">{report.label}</h3>
          <code className="text-[11px] text-gray-400">{report.key}</code>
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${s.chip}`}>
          {report.overall}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {report.checks.map(c => {
          const cs = statusStyle[c.status];
          const Icon = cs.icon;
          return (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              <Icon size={16} className={
                c.status === "pass" ? "text-emerald-500 mt-0.5 shrink-0"
                  : c.status === "warn" ? "text-amber-500 mt-0.5 shrink-0"
                    : "text-rose-500 mt-0.5 shrink-0"
              } />
              <div className="min-w-0">
                <div className="font-medium text-gray-800">{c.label}</div>
                <div className="text-xs text-gray-500 break-words">{c.detail}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
