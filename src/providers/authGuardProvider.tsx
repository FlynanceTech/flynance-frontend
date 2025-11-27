"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/stores/useUserSession";

type Props = {
  children: React.ReactNode;
};

export function AuthGuardProvider({ children }: Props) {
  const router = useRouter();
  const { user, loading, fetchAccount } = useUserSession();

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push("/login");
      return;
    }
    console.log('check user', user)
    if (!user.userData?.signature || user.userData.signature.status !== "ACTIVE") {
      router.push("/WinbackPage");
      return;
    }

  }, [loading, user, router]);

   if (loading || !user || !user.userData?.signature) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-gray-600">
          Carregando suas informações...
        </p>
      </div>
    );
  }


  return <>{children}</>;
}
