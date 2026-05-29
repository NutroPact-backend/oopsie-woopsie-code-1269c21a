// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listFeatureFlags } from "@/lib/featureFlags.functions";

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  config: Record<string, unknown>;
  description?: string | null;
};

export function useFeatureFlags() {
  const fn = useServerFn(listFeatureFlags);
  const q = useQuery({
    queryKey: ["feature-flags"],
    queryFn: () => fn({}),
    staleTime: 5 * 60_000, // 5 min — flags rarely flip
  });
  const map = new Map<string, FeatureFlag>(
    (q.data?.flags ?? []).map((f: any) => [f.key, f as FeatureFlag]),
  );
  return {
    isLoading: q.isLoading,
    flags: q.data?.flags ?? [],
    isEnabled: (key: string) => !!map.get(key)?.enabled,
    getConfig: <T = Record<string, unknown>>(key: string): T =>
      (map.get(key)?.config ?? {}) as T,
    refetch: q.refetch,
  };
}
