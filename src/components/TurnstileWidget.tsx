// @ts-nocheck
import { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget. Renders nothing if VITE_TURNSTILE_SITE_KEY is unset
 * (so dev / un-keyed deployments stay frictionless). Loads script on demand.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: any) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

let scriptPromise: Promise<boolean> | null = null;
function loadScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.turnstile) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true; s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return scriptPromise;
}

interface Props {
  onToken: (token: string | null) => void;
  action?: string;
}

export default function TurnstileWidget({ onToken, action }: Props) {
  const siteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) || '';
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    loadScript().then((ok) => {
      if (!ok || cancelled || !ref.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        action,
        callback: (token: string) => onToken(token),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
        theme: 'light',
        size: 'flexible',
      });
      setReady(true);
    });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey]);

  if (!siteKey) return null;
  return (
    <div className="my-3">
      <div ref={ref} />
      {!ready && <div className="h-[65px] bg-gray-50 border border-gray-100 rounded animate-pulse" />}
    </div>
  );
}
