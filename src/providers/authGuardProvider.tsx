"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserSession } from "@/stores/useUserSession";
import { useAdvisorActing } from "@/stores/useAdvisorActing";
import { canActAsClientRole } from "@/utils/roles";

type Props = {
  children: React.ReactNode;
};

export function AuthGuardProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, fetchAccount } = useUserSession();
  const clearActingClient = useAdvisorActing((s) => s.clearActingClient);

  const isPublicRoute = pathname === "/login" || pathname === "/WinbackPage";

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

    const { canAccessPlatform } = computeAccessFlags();

    if (!canAccessPlatform && pathname !== "/WinbackPage") {
      router.replace("/WinbackPage");
      return;
    }
  }, [isPublicRoute, status, user, pathname, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    if (!canActAsClientRole(user?.userData?.user?.role)) {
      clearActingClient();
    }
  }, [status, user, clearActingClient]);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  const Loader = (
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

  const { canAccessPlatform } = computeAccessFlags();

  if (!canAccessPlatform && pathname !== "/WinbackPage") {
    return Loader;
  }

  return <>{children}</>;
}
