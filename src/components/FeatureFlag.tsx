// @ts-nocheck
import { type ReactNode } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

/** Renders children ONLY if the feature flag is enabled in backend. */
export function FeatureFlag({
  flag,
  children,
  fallback = null,
}: {
  flag: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isEnabled, isLoading } = useFeatureFlags();
  if (isLoading) return null;
  return <>{isEnabled(flag) ? children : fallback}</>;
}
