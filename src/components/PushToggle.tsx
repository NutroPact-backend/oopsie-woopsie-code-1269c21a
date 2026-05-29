// @ts-nocheck
import { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { pushSupported, enablePushNotifications, disablePushNotifications } from '@/lib/push-client';

export default function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  useEffect(() => {
    (async () => {
      const ok = await pushSupported();
      setSupported(ok);
      if (!ok) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw-push.js');
        const sub = await reg?.pushManager.getSubscription();
        setEnabled(!!sub);
      } catch { /* ignore */ }
    })();
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    setBusy(true); setMsg('');
    try {
      if (enabled) {
        await disablePushNotifications();
        setEnabled(false);
      } else {
        const r = await enablePushNotifications();
        if (r.ok) { setEnabled(true); setMsg('Notifications on'); }
        else {
          setMsg(
            r.reason === 'denied' ? 'Permission denied in browser' :
            r.reason === 'not_configured' ? 'Not configured yet' :
            r.reason === 'unsupported' ? 'Not supported' :
            'Could not enable'
          );
        }
      }
    } catch (e: any) {
      setMsg(e?.message || 'Failed');
    }
    setBusy(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`w-full mb-4 flex items-center justify-between gap-3 p-4 rounded-2xl border-2 transition text-left ${
        enabled ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-white hover:border-orange-400'
      } disabled:opacity-50`}
    >
      <div className="flex items-center gap-3">
        {enabled ? <Bell size={18} className="text-green-600" /> : <BellOff size={18} className="text-gray-500" />}
        <div>
          <div className="font-bold text-sm">{enabled ? 'Order notifications on' : 'Get order updates'}</div>
          <div className="text-xs text-gray-500">{msg || (enabled ? 'Tap to turn off' : 'Push alerts for shipping, delivery & offers')}</div>
        </div>
      </div>
      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${enabled ? 'bg-green-600 text-white' : 'bg-orange-500 text-white'}`}>
        {busy ? '…' : enabled ? 'ON' : 'TURN ON'}
      </span>
    </button>
  );
}
