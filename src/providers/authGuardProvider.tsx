"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserSession } from "@/stores/useUserSession";
import { useAdvisorActing } from "@/stores/useAdvisorActing";
import { canActAsClientRole, isAdminRole } from "@/utils/roles";

const DEV_RESTRICTED_HOST = "dev.flynance.tec.br";
const PROD_DASHBOARD_URL = "https://flynance.tec.br/dashboard";

type Props = {
  children: React.ReactNode;
};

export function AuthGuardProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, fetchAccount } = useUserSession();
  const clearActingClient = useAdvisorActing((s) => s.clearActingClient);

  const isPublicRoute = pathname === "/login" || pathname === "/WinbackPage";

  const isRestrictedDevHost = () =>
    typeof window !== "undefined" && window.location.hostname === DEV_RESTRICTED_HOST;

  const isDevAccessBlockedByRole = () =>
    status === "authenticated" &&
    isRestrictedDevHost() &&
    !isAdminRole(user?.userData?.user?.role);

  const computeAccessFlags = () => {
    const role = user?.userData?.user?.role;
    const signature = user?.userData?.signature;
    const hasActiveSignature = user?.userData?.hasActiveSignature ?? false;
    const hasRoleBypass = canActAsClientRole(role);

    const now = new Date();
    let endDateIso: string | null = null;
    let isWithinAccessWindow = false;

    if (signature?.endDate) {
      endDateIso = signature.endDate;

      const rawEndDate = new Date(endDateIso);

      const endOfDayLocal = new Date(
        rawEndDate.getFullYear(),
        rawEndDate.getMonth(),
        rawEndDate.getDate(),
        23,
        59,
        59,
        999
      );

      isWithinAccessWindow = now <= endOfDayLocal;
    }

    const canAccessPlatform = hasRoleBypass || hasActiveSignature || isWithinAccessWindow;

    return {
      role,
      signature,
      hasActiveSignature,
      hasRoleBypass,
      isWithinAccessWindow,
      canAccessPlatform,
      endDateIso,
    };
  };

  useEffect(() => {
    if (isPublicRoute) return;
    if (status === "idle") {
      fetchAccount();
    }
  }, [isPublicRoute, status, fetchAccount]);

  useEffect(() => {
    if (isPublicRoute) return;

    if (status === "idle" || status === "loading") return;

    if (status === "unauthenticated") {
      if (pathname !== "/login") {
        router.replace("/login");
      }
      return;
    }

    if (isDevAccessBlockedByRole()) {
      clearActingClient();
      window.location.replace(PROD_DASHBOARD_URL);
      return;
    }

    const { canAccessPlatform } = computeAccessFlags();

    if (!canAccessPlatform && pathname !== "/WinbackPage") {
      router.replace("/WinbackPage");
      return;
    }
  }, [isPublicRoute, status, user, pathname, router, clearActingClient]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canActAsClientRole(user?.userData?.user?.role)) {
      clearActingClient();
    }
  }, [status, user, clearActingClient]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const isDashboardRoute = pathname?.startsWith("/dashboard");

  const Loader = isDashboardRoute ? (
    <main className="h-screen min-h-0 w-full bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <div className="hidden h-full lg:flex lg:gap-8 lg:px-8 lg:py-8">
        <aside className="max-h-screen sticky left-0 top-0 self-start">
          <div className="w-[240px] animate-pulse rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-6 h-10 w-40 rounded bg-slate-200" />
            <div className="space-y-4">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-10 rounded-xl bg-slate-100" />
              ))}
            </div>
            <div className="mt-8 h-10 rounded-full bg-slate-100" />
          </div>
        </aside>

        <div className="flex min-h-0 max-h-screen flex-1 flex-col overflow-hidden">
          <div className="mb-4 h-10 w-64 animate-pulse rounded-full bg-slate-100" />
          <div className="flex-1 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>

      <div className="flex h-full flex-col gap-4 px-4 py-6 lg:hidden">
        <div className="h-12 w-40 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="flex-1 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </main>
  ) : (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-600">Carregando suas informações...</p>
    </div>
  );

  if (status === "idle" || status === "loading") {
    return Loader;
  }

  if (status === "unauthenticated") {
    return Loader;
  }

  if (isDevAccessBlockedByRole()) {
    return Loader;
  }

  const { canAccessPlatform } = computeAccessFlags();

  if (!canAccessPlatform && pathname !== "/WinbackPage") {
    return Loader;
  }

  return <>{children}</>;
}
