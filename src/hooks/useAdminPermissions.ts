// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyPermissions } from "@/lib/permissions.functions";
import { useAuthStore } from "@/store/authStore";

export function useAdminPermissions() {
  const { user, isAdmin } = useAuthStore();
  const fn = useServerFn(getMyPermissions);
  const q = useQuery({
    queryKey: ["my-permissions", user?.id],
    queryFn: () => fn({}),
    enabled: !!user && isAdmin,
    staleTime: 60_000,
  });
  const set = new Set(q.data?.permissions ?? []);
  return {
    isLoading: q.isLoading,
    isSuperAdmin: !!q.data?.isSuperAdmin,
    isAdmin: !!q.data?.isAdmin,
    permissions: q.data?.permissions ?? [],
    has: (code: string | string[]) => {
      if (q.data?.isSuperAdmin) return true;
      if (Array.isArray(code)) return code.some((c) => set.has(c));
      return set.has(code);
    },
    refetch: q.refetch,
  };
}
