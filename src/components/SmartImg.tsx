// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves Supabase Storage URLs that were saved as `/object/public/<bucket>/<path>`
 * on a now-private bucket. On error (or when URL matches the broken public pattern),
 * automatically requests a long-lived signed URL and swaps it in.
 * Caches resolutions in-memory to avoid redundant signing requests.
 */
const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string | null>>();

function parsePublic(url: string): { bucket: string; path: string } | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|$)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
}

async function sign(url: string): Promise<string | null> {
  if (cache.has(url)) return cache.get(url)!;
  if (inflight.has(url)) return inflight.get(url)!;
  const parsed = parsePublic(url);
  if (!parsed) return null;
  const p = (async () => {
    const { data, error } = await supabase.storage
      .from(parsed.bucket)
      .createSignedUrl(parsed.path, 60 * 60 * 24 * 365 * 10);
    if (error || !data?.signedUrl) return null;
    cache.set(url, data.signedUrl);
    return data.signedUrl;
  })();
  inflight.set(url, p);
  try { return await p; } finally { inflight.delete(url); }
}

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string | null;
  fallback?: React.ReactNode;
}

export default function SmartImg({ src, fallback, onError, ...rest }: Props) {
  const initial = src && cache.has(src) ? cache.get(src)! : src || '';
  const [resolved, setResolved] = useState<string>(initial);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    setBroken(false);
    if (!src) { setResolved(''); return; }
    if (cache.has(src)) { setResolved(cache.get(src)!); return; }
    setResolved(src);
    // Pre-resolve if URL matches the broken pattern so first paint is correct
    if (parsePublic(src)) {
      sign(src).then(u => { if (u) setResolved(u); });
    }
  }, [src]);

  if (!resolved || broken) return <>{fallback ?? null}</>;

  return (
    <img
      {...rest}
      src={resolved}
      onError={async (e) => {
        // Try signed-url recovery once
        if (src && !cache.has(src + ':tried')) {
          cache.set(src + ':tried', '1');
          const signed = await sign(src);
          if (signed) { setResolved(signed); return; }
        }
        setBroken(true);
        onError?.(e);
      }}
    />
  );
}