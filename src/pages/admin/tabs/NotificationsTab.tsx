// @ts-nocheck
import { useState, useEffect } from 'react';
import { Save, Bell, Trash2, ExternalLink, RefreshCw, MessageCircle, Mail } from 'lucide-react';
import { TabHelp } from "./_TabHelp";

import API from '@/lib/api';
const AdminAPI = API;
const DEFAULT_TEMPLATE = "🛍️ New Order #{orderNumber}\nCustomer: {customerName}\nTotal: ₹{total}\nItems: {items}\nTime: {time}";

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div onClick={() => onChange(!value)} className={`w-11 h-6 rounded-full cursor-pointer transition-colors flex items-center px-1 ${value ? 'bg-green-500' : 'bg-gray-300'}`}>
      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </div>
  );
}

function Inp({ label, value, onChange, placeholder, type = 'text', help, rows }: any) {
  return (
    <div>
      {label && <label className="text-xs font-bold text-gray-500 block mb-1">{label}</label>}
      {rows ? (
        <textarea rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition resize-none font-mono" />
      ) : (
        <input type={type} value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
      )}
      {help && <p className="text-xs text-gray-400 mt-0.5">{help}</p>}
    </div>
  );
}

export default function NotificationsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [log, setLog] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadingLog, setLoadingLog] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadSettings = () =>
    AdminAPI.get('/admin/settings').then(r => setSettings(r.data)).catch(() => {});

  const loadLog = () => {
    setLoadingLog(true);
    AdminAPI.get('/admin/notifications').then(r => setLog(r.data)).catch(() => {}).finally(() => setLoadingLog(false));
  };

  useEffect(() => { loadSettings(); loadLog(); }, []);

  const set = (k: string, v: any) => setSettings((s: any) => ({ ...s, [k]: v }));

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await AdminAPI.put('/admin/settings', {
        notifyEnabled: settings.notifyEnabled,
        notifyOwnerWhatsapp: settings.notifyOwnerWhatsapp,
        notifyOwnerEmail: settings.notifyOwnerEmail,
        notifyTemplate: settings.notifyTemplate,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { } finally { setSaving(false); }
  };

  const clearLog = async () => {
    if (!confirm('Clear all notification history?')) return;
    setClearing(true);
    await AdminAPI.delete('/admin/notifications').catch(() => {});
    setLog([]);
    setClearing(false);
  };

  const previewMessage = (settings?.notifyTemplate || DEFAULT_TEMPLATE)
    .replace('{orderNumber}', 'NP1234567890')
    .replace('{customerName}', 'Rahul Sharma')
    .replace('{total}', '2499')
    .replace('{items}', 'Whey Protein x1, Creatine x2')
    .replace('{time}', '9 May 2026, 11:30 AM');

  if (!settings) return <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <TabHelp topic="notifications" />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Order Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">Get notified on WhatsApp or email when a new order is placed</p>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600 transition disabled:opacity-50">
          <Save size={15} />{saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-800">Enable Order Notifications</p>
            <p className="text-xs text-gray-500 mt-0.5">Log a notification entry every time a new order is placed</p>
          </div>
          <Toggle value={!!settings.notifyEnabled} onChange={v => set('notifyEnabled', v)} />
        </div>

        <div className="border-t border-gray-50 pt-5 grid grid-cols-1 gap-4" style={{ opacity: settings.notifyEnabled ? 1 : 0.4, pointerEvents: settings.notifyEnabled ? 'auto' : 'none' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center gap-1"><MessageCircle size={12} /> WhatsApp (Owner's Number)</label>
              <input type="tel" value={settings.notifyOwnerWhatsapp ?? ''} onChange={e => set('notifyOwnerWhatsapp', e.target.value)}
                placeholder="91XXXXXXXXXX (with country code, no +)"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
              <p className="text-xs text-gray-400 mt-0.5">Each new order generates a ready-to-send WhatsApp link for this number</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1 flex items-center gap-1"><Mail size={12} /> Owner Email</label>
              <input type="email" value={settings.notifyOwnerEmail ?? ''} onChange={e => set('notifyOwnerEmail', e.target.value)}
                placeholder="owner@yourstore.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition" />
              <p className="text-xs text-gray-400 mt-0.5">Displayed in notification log (email sending requires integration)</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1">Message Template</label>
            <textarea rows={5} value={settings.notifyTemplate ?? DEFAULT_TEMPLATE}
              onChange={e => set('notifyTemplate', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 transition resize-none font-mono" />
            <p className="text-xs text-gray-400 mt-0.5">
              Available variables: <code className="bg-gray-100 px-1 rounded">{'{orderNumber}'}</code> <code className="bg-gray-100 px-1 rounded">{'{customerName}'}</code> <code className="bg-gray-100 px-1 rounded">{'{total}'}</code> <code className="bg-gray-100 px-1 rounded">{'{items}'}</code> <code className="bg-gray-100 px-1 rounded">{'{time}'}</code>
            </p>
          </div>

          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <p className="text-xs font-bold text-green-700 mb-2 flex items-center gap-1"><MessageCircle size={12} /> Message Preview</p>
            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{previewMessage}</pre>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-black text-gray-800">Notification History</h3>
            <p className="text-xs text-gray-500 mt-0.5">{log.length} notifications logged (last 100 kept)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadLog} disabled={loadingLog}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition">
              <RefreshCw size={15} className={loadingLog ? 'animate-spin' : ''} />
            </button>
            {log.length > 0 && (
              <button onClick={clearLog} disabled={clearing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-xl transition font-semibold disabled:opacity-40">
                <Trash2 size={13} /> Clear All
              </button>
            )}
          </div>
        </div>

        {loadingLog ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : log.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <Bell size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-sm">No notifications yet</p>
            <p className="text-xs mt-1">Notifications appear here when customers place orders</p>
          </div>
        ) : (
          <div className="space-y-2">
            {log.map((n: any) => (
              <div key={n.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">#{n.orderNumber}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs text-gray-500">{n.customerName}</span>
                    <span className="text-xs text-gray-500">·</span>
                    <span className="text-xs font-semibold text-green-600">₹{n.total}</span>
                  </div>
                  <p className="text-xs text-gray-400 truncate">{n.items}</p>
                  <p className="text-xs text-gray-400">{new Date(n.sentAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {n.whatsappLink && (
                    <a href={n.whatsappLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition">
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                  {n.email && (
                    <a href={`mailto:${n.email}?subject=New Order ${n.orderNumber}&body=${encodeURIComponent(n.message)}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition">
                      <Mail size={12} /> Email
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 rounded-2xl p-4 text-xs text-blue-700 space-y-1 border border-blue-100">
        <p className="font-bold text-blue-800 mb-2">How it works</p>
        <p>• Every new order automatically creates a notification entry in the log above</p>
        <p>• If a WhatsApp number is set, each entry shows a "WhatsApp" button — click it to send the order details directly to that number</p>
        <p>• If an email is set, each entry shows an "Email" button — click it to open your email client with the message pre-filled</p>
        <p>• For fully automatic sending (without clicking), a real WhatsApp Business API or email SMTP integration is needed</p>
      </div>
    </div>
  );
}
