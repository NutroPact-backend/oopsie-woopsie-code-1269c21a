// @ts-nocheck
import React from "react";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

/** Render children only if the current user has the permission. */
export function Gate({ perm, fallback = null, children }: { perm: string | string[]; fallback?: React.ReactNode; children: React.ReactNode }) {
  const { has, isLoading } = useAdminPermissions();
  if (isLoading) return null;
  if (!has(perm)) return <>{fallback}</>;
  return <>{children}</>;
}

/** Wrap inputs/buttons — disables interaction if user lacks the perm. */
export function ReadOnly({ perm, children }: { perm: string | string[]; children: React.ReactNode }) {
  const { has } = useAdminPermissions();
  if (has(perm)) return <>{children}</>;
  return (
    <fieldset disabled className="opacity-60 cursor-not-allowed contents">
      <div className="pointer-events-none select-none">{children}</div>
    </fieldset>
  );
}

/** Inline "no access" banner — useful at tab level. */
export function NoAccess({ perm }: { perm: string }) {
  return (
    <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
      <p className="text-lg font-bold text-gray-700">You don't have access to this section</p>
      <p className="text-sm text-gray-500 mt-1">Missing permission: <code className="bg-gray-100 px-1.5 py-0.5 rounded">{perm}</code></p>
      <p className="text-xs text-gray-400 mt-3">Ask a super-admin to grant access.</p>
    </div>
  );
}
