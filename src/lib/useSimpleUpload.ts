// @ts-nocheck
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSimpleUpload(opts: { onSuccess?: (url: string) => void; onError?: (e: Error) => void; bucket?: string } = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const bucket = opts.bucket || "product-images";

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    setIsUploading(true);
    setProgress(20);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (error) throw error;
      setProgress(80);
      // Bucket is private — use long-lived signed URL (10 years)
      const { data: signed, error: signErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr) throw signErr;
      setProgress(100);
      opts.onSuccess?.(signed.signedUrl);
      return signed.signedUrl;
    } catch (e) {
      const err = e instanceof Error ? e : new Error("Upload failed");
      opts.onError?.(err);
      alert(`Upload failed: ${err.message}`);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 1500);
    }
  }, [bucket, opts]);

  return { uploadFile, isUploading, progress };
}
