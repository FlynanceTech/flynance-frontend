"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserSession } from "@/stores/useUserSession";

type Props = {
  children: React.ReactNode;
};

export function AuthGuardProvider({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, fetchAccount } = useUserSession();

  const isPublicRoute = pathname === "/login" || pathname === "/WinbackPage";

  // Helper para calcular flags de acesso
  const computeAccessFlags = () => {
    const signature = user?.userData?.signature;
    const hasActiveSignature = user?.userData?.hasActiveSignature ?? false;

    const now = new Date();
    let endDateIso: string | null = null;
    let isWithinAccessWindow = false;

    if (signature?.endDate) {
      endDateIso = signature.endDate;

      const rawEndDate = new Date(endDateIso);

      // 👉 Considera o dia inteiro da data final de acesso
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

    const canAccessPlatform = hasActiveSignature || isWithinAccessWindow;

    // logs pra debug
    console.log("signature endDate:", endDateIso);
    console.log("hasActiveSignature:", hasActiveSignature);
    console.log("isWithinAccessWindow:", isWithinAccessWindow);
    console.log("canAccessPlatform:", canAccessPlatform);

    return {
      signature,
      hasActiveSignature,
      isWithinAccessWindow,
      canAccessPlatform,
      endDateIso,
    };
  };

  // 1) Buscar sessão em rotas privadas
  useEffect(() => {
    if (isPublicRoute) return;
    if (status === "idle") {
      fetchAccount();
    }
  }, [isPublicRoute, status, fetchAccount]);

  // 2) Side-effects de redirect
  useEffect(() => {
    if (isPublicRoute) return;

    if (status === "idle" || status === "loading") return;

    // Não autenticado -> login
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

  // 3) Render: aqui a gente TRAVA a página

  // Rotas públicas ignoram o guard
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Loader padrão
  const Loader = (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-600">Carregando suas informações...</p>
    </div>
  );

  // Enquanto não sabemos o estado da sessão
  if (status === "idle" || status === "loading") {
    return Loader;
  }

  // Se já sabemos que não está autenticado, não mostra dashboard (já tá redirecionando)
  if (status === "unauthenticated") {
    return Loader;
  }

  // Regra de acesso baseada em assinatura + endDate (dia inteiro)
  const { canAccessPlatform } = computeAccessFlags();

  if (!canAccessPlatform && pathname !== "/WinbackPage") {
    return Loader;
  }

  // Só chega aqui se:
  // - rota privada
  // - status === "authenticated"
  // - canAccessPlatform === true
  return <>{children}</>;
}
