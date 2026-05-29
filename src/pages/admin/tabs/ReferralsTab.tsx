// @ts-nocheck
/**
 * Referrals admin tab — view all referrals, mark completed (credits both wallets),
 * cancel suspicious ones.
 */
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Share2, Check, X, RefreshCw } from "lucide-react";
import { adminListReferrals, adminCompleteReferral, adminCancelReferral } from "@/lib/referrals.functions";
import { TabHelp } from './_TabHelp';
import { useBulkSelection, BulkActionBar, SelectCheckbox } from '../components/BulkSelect';

type Status = "all" | "pending" | "completed" | "cancelled";

export default function ReferralsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<Status>("all");
  const [busy, setBusy] = useState(false);

  const listFn = useServerFn(adminListReferrals);
  const doneFn = useServerFn(adminCompleteReferral);
  const cancelFn = useServerFn(adminCancelReferral);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r: any = await listFn({ data: { status } });
      setRows(r.referrals || []);
    } finally { setBusy(false); }
  }, [listFn, status]);
  const bulk = useBulkSelection(rows, (r: any) => r.id);

  useEffect(() => { load(); }, [load]);

  async function complete(id: string) {
    if (!confirm("Mark this referral as completed and credit NutroPay rewards to both users?")) return;
    await doneFn({ data: { id } });
    load();
  }
  async function cancel(id: string) {
    if (!confirm("Cancel this referral? No rewards will be credited.")) return;
    await cancelFn({ data: { id } });
    load();
  }

  const counts = {
    pending: rows.filter(r => r.status === "pending").length,
    completed: rows.filter(r => r.status === "completed").length,
    earned: rows.filter(r => r.status === "completed")
      .reduce((s, r) => s + Number(r.referrer_reward || 0) + Number(r.referred_reward || 0), 0),
  };

  return (
    <div className="space-y-4">
      <TabHelp topic="referrals" />
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Share2 size={18} className="text-orange-600" />
          <h2 className="font-black text-lg">Referral Program</h2>
        </div>
        <p className="text-xs text-gray-600">
          Customers share their code. When friend signs up → pending entry. Mark <b>Completed</b> when their first paid order arrives — NutroPay credit goes to both. Default rewards: ₹150 referrer + ₹100 friend.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Stat label="Pending" v={counts.pending} />
          <Stat label="Completed" v={counts.completed} />
          <Stat label="NutroPay credited (₹)" v={counts.earned.toLocaleString("en-IN")} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {(["all", "pending", "completed", "cancelled"] as Status[]).map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${status === s ? "bg-orange-500 text-white" : "bg-gray-100 text-gray-700"}`}>
            {s}
          </button>
        ))}
        <button onClick={load} disabled={busy} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold disabled:opacity-50">
          <RefreshCw size={12} className={busy ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <BulkActionBar
        count={bulk.count}
        ids={Array.from(bulk.selected)}
        onClear={bulk.clear}
        actions={[
          { key: 'complete', label: 'Mark Completed', color: 'bg-emerald-600 hover:bg-emerald-700', confirm: 'Mark {n} referrals as completed and credit rewards to all parties?',
            run: async (ids) => { await Promise.all(ids.map(id => doneFn({ data: { id } }))); await load(); } },
          { key: 'cancel', label: 'Cancel', color: 'bg-red-600 hover:bg-red-700', confirm: 'Cancel {n} referrals? No rewards will be credited.',
            run: async (ids) => { await Promise.all(ids.map(id => cancelFn({ data: { id } }))); await load(); } },
        ]}
      />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-600 uppercase">
            <tr>
              <th className="px-3 py-2 w-8">
                <SelectCheckbox checked={bulk.allSelected} indeterminate={bulk.someSelected} onChange={bulk.toggleAll} title="Select all" />
              </th>
              <th className="px-3 py-2 text-left">Referrer</th>
              <th className="px-3 py-2 text-left">Friend</th>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-right">Rewards (₹)</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">
                  <SelectCheckbox checked={bulk.isSelected(r.id)} onChange={() => bulk.toggleOne(r.id)} />
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold text-xs">{r.referrer?.name || "—"}</p>
                  <p className="text-[10px] text-gray-500">{r.referrer?.email || r.referrer_user_id.slice(0, 8)}</p>
                </td>
                <td className="px-3 py-2">
                  <p className="font-bold text-xs">{r.referred?.name || "—"}</p>
                  <p className="text-[10px] text-gray-500">{r.referred?.email || r.referred_user_id.slice(0, 8)}</p>
                </td>
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {r.referrer_reward} + {r.referred_reward}
                </td>
                <td className="px-3 py-2">
                  <StatusPill s={r.status} />
                </td>
                <td className="px-3 py-2 text-[11px] text-gray-500">
                  {new Date(r.created_at).toLocaleDateString("en-IN")}
                </td>
                <td className="px-3 py-2">
                  {r.status === "pending" && (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => complete(r.id)} title="Complete"
                        className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded">
                        <Check size={12} />
                      </button>
                      <button onClick={() => cancel(r.id)} title="Cancel"
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded">
                        <X size={12} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-400">No referrals yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: any }) {
  return (
    <div className="bg-white/70 rounded-xl py-2">
      <p className="text-lg font-black text-gray-900">{v}</p>
      <p className="text-[10px] uppercase font-bold text-gray-500">{label}</p>
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-50 text-amber-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${map[s] || "bg-gray-100"}`}>{s}</span>;
}
