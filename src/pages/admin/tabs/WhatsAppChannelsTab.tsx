// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Edit2, Save, X, MessageCircle, Power } from "lucide-react";
import {
  listAllWhatsAppChannels,
  upsertWhatsAppChannel,
  deleteWhatsAppChannel,
} from "@/lib/whatsappChannels.functions";
import { listFeatureFlags, setFeatureFlag } from "@/lib/featureFlags.functions";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { PAGE_OPTIONS } from "@/lib/page-keys";

const POSITIONS = [
  { value: "float",        label: "Floating Bubble (bottom-right)" },
  { value: "header-right", label: "Header — Right" },
  { value: "header-left",  label: "Header — Left" },
  { value: "before-cart",  label: "Before Cart Icon" },
];
const ICON_STYLES = [
  { value: "brand-green",  label: "Brand Green (filled)" },
  { value: "filled",       label: "Filled" },
  { value: "outline",      label: "Outline" },
  { value: "custom-color", label: "Custom Color" },
  { value: "custom-svg",   label: "Custom SVG/Image" },
];

const empty = () => ({
  id: undefined as string | undefined,
  label: "Customer Support",
  phone_e164: "+91",
  message_template: "Hi, I have a question about {page}.",
  business_hours: {} as any,
  offline_message: "" as string | null,
  position: "header-right",
  icon_style: "brand-green",
  icon_color: "" as string | null,
  custom_icon_url: "" as string | null,
  show_on_pages: ["global"] as string[],
  hide_on_mobile: false,
  hide_on_desktop: false,
  sort_order: 0,
  enabled: true,
});

export default function WhatsAppChannelsTab() {
  const perms = useAdminPermissions();
  const qc = useQueryClient();
  const list = useServerFn(listAllWhatsAppChannels);
  const upsert = useServerFn(upsertWhatsAppChannel);
  const del = useServerFn(deleteWhatsAppChannel);
  const listFlags = useServerFn(listFeatureFlags);
  const flipFlag = useServerFn(setFeatureFlag);

  const flagsQ = useQuery({ queryKey: ["feature-flags"], queryFn: () => listFlags({}) });
  const masterOn = !!(flagsQ.data?.flags ?? []).find((f: any) => f.key === "whatsapp_header")?.enabled;

  const q = useQuery({
    queryKey: ["whatsapp-channels"],
    queryFn: () => list({}),
    enabled: perms.has("whatsapp_channels.view"),
  });
  const [editing, setEditing] = useState<any | null>(null);

  const save = useMutation({
    mutationFn: (row: any) => upsert({ data: row }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whatsapp-channels"] }); qc.invalidateQueries({ queryKey: ["whatsapp-channels-public"] }); setEditing(null); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-channels"] }),
  });
  const toggleMaster = useMutation({
    mutationFn: (enabled: boolean) => flipFlag({ data: { key: "whatsapp_header", enabled } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["feature-flags"] }),
  });

  if (!perms.has("whatsapp_channels.view")) {
    return <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-sm text-yellow-800">You don't have permission to view WhatsApp channels.</div>;
  }
  const canEdit = perms.has("whatsapp_channels.edit");
  const canToggle = perms.has("whatsapp_channels.toggle");
  const channels = (q.data?.channels ?? []) as any[];

  return (
    <div className="space-y-5">
      {/* Master toggle */}
      <div className="bg-white border rounded-2xl p-5 flex items-center gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${masterOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
          <Power size={22} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-black">Header WhatsApp Icon — Master Toggle</p>
          <p className="text-xs text-gray-500 mt-0.5">When OFF, the icon is hidden site-wide regardless of channel settings.</p>
        </div>
        <button disabled={!canToggle || toggleMaster.isPending}
          onClick={() => toggleMaster.mutate(!masterOn)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition ${masterOn ? "bg-green-500 text-white hover:bg-green-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"} ${!canToggle ? "opacity-50 cursor-not-allowed" : ""}`}>
          {masterOn ? "ON" : "OFF"}
        </button>
      </div>

      {/* Channels list */}
      <div className="bg-white border rounded-2xl">
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <div>
            <p className="text-sm font-black flex items-center gap-2"><MessageCircle size={16} className="text-green-600" /> WhatsApp Channels</p>
            <p className="text-xs text-gray-500 mt-0.5">Add multiple numbers (Sales / Support / Wholesale) — users see a dropdown when more than one exists.</p>
          </div>
          {canEdit && (
            <button onClick={() => setEditing(empty())}
              className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-orange-600">
              <Plus size={14} /> Add Channel
            </button>
          )}
        </div>
        {q.isLoading ? <div className="p-8 text-center text-sm text-gray-400">Loading…</div>
          : channels.length === 0 ? <div className="p-8 text-center text-sm text-gray-400">No channels yet. Add one to start.</div>
          : (
          <div className="divide-y">
            {channels.map((c: any) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${c.enabled ? "bg-green-500" : "bg-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{c.label} <span className="text-xs font-normal text-gray-400 ml-1">{c.phone_e164}</span></p>
                  <p className="text-[11px] text-gray-500 truncate">
                    {c.position} · {c.icon_style} · {(c.show_on_pages || []).join(", ")}
                    {c.hide_on_mobile && " · hidden on mobile"}
                    {c.hide_on_desktop && " · hidden on desktop"}
                  </p>
                </div>
                {canEdit && (
                  <>
                    <button onClick={() => setEditing(c)} className="p-2 hover:bg-gray-100 rounded-lg" title="Edit"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm(`Delete "${c.label}"?`)) remove.mutate(c.id); }} className="p-2 hover:bg-red-50 text-red-600 rounded-lg" title="Delete"><Trash2 size={14} /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <p className="font-black">{editing.id ? "Edit Channel" : "New Channel"}</p>
              <button onClick={() => setEditing(null)} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Label *">
                  <input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Phone (E.164) *">
                  <input value={editing.phone_e164} onChange={(e) => setEditing({ ...editing, phone_e164: e.target.value })} placeholder="+919876543210" className={inputCls} />
                </Field>
              </div>
              <Field label="Message Template (use {page} for current page key)">
                <textarea value={editing.message_template} onChange={(e) => setEditing({ ...editing, message_template: e.target.value })} rows={2} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Business Hours Start (24h, e.g. 09:00)">
                  <input value={editing.business_hours?.start || ""} onChange={(e) => setEditing({ ...editing, business_hours: { ...editing.business_hours, start: e.target.value } })} placeholder="09:00" className={inputCls} />
                </Field>
                <Field label="Business Hours End">
                  <input value={editing.business_hours?.end || ""} onChange={(e) => setEditing({ ...editing, business_hours: { ...editing.business_hours, end: e.target.value } })} placeholder="20:00" className={inputCls} />
                </Field>
              </div>
              <Field label="Offline Message (shown outside hours)">
                <input value={editing.offline_message || ""} onChange={(e) => setEditing({ ...editing, offline_message: e.target.value })} placeholder="We'll reply by morning. Leave a message!" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Position">
                  <select value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} className={inputCls}>
                    {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
                <Field label="Icon Style">
                  <select value={editing.icon_style} onChange={(e) => setEditing({ ...editing, icon_style: e.target.value })} className={inputCls}>
                    {ICON_STYLES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </Field>
              </div>
              {editing.icon_style === "custom-color" && (
                <Field label="Custom Color (hex/css)">
                  <input value={editing.icon_color || ""} onChange={(e) => setEditing({ ...editing, icon_color: e.target.value })} placeholder="#25D366" className={inputCls} />
                </Field>
              )}
              {editing.icon_style === "custom-svg" && (
                <Field label="Custom Icon URL">
                  <input value={editing.custom_icon_url || ""} onChange={(e) => setEditing({ ...editing, custom_icon_url: e.target.value })} placeholder="https://..." className={inputCls} />
                </Field>
              )}
              <Field label="Show on Pages">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 border rounded-lg">
                  {PAGE_OPTIONS.map((p) => {
                    const checked = (editing.show_on_pages || []).includes(p.key);
                    return (
                      <label key={p.key} className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={checked} onChange={(e) => {
                          const cur = new Set(editing.show_on_pages || []);
                          if (e.target.checked) cur.add(p.key); else cur.delete(p.key);
                          setEditing({ ...editing, show_on_pages: Array.from(cur) });
                        }} />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.hide_on_mobile} onChange={(e) => setEditing({ ...editing, hide_on_mobile: e.target.checked })} /> Hide on mobile</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.hide_on_desktop} onChange={(e) => setEditing({ ...editing, hide_on_desktop: e.target.checked })} /> Hide on desktop</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.enabled} onChange={(e) => setEditing({ ...editing, enabled: e.target.checked })} /> Enabled</label>
              </div>
              <Field label="Sort Order">
                <input type="number" value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })} className={inputCls} />
              </Field>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
              <button onClick={() => setEditing(null)} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button disabled={save.isPending} onClick={() => save.mutate(editing)} className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-lg flex items-center gap-1.5 hover:bg-orange-600 disabled:opacity-50">
                <Save size={14} /> {save.isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>{children}</div>;
}
