'use client'
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Content from "../components/home/Content";
import { persistAuthToken, readPersistedAuthToken } from "@/lib/authSession";
import { useUserSession } from "@/stores/useUserSession";
import { canAccessAdvisorRole, getAdvisorHomePath } from "@/utils/roles";

function subscribeToAuthToken(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function hasPersistedAuthToken() {
  return Boolean(readPersistedAuthToken());
}

function getServerAuthTokenSnapshot() {
  return true;
}

export default function Home() {
  const router = useRouter();
  const checkingAuth = useSyncExternalStore(
    subscribeToAuthToken,
    hasPersistedAuthToken,
    getServerAuthTokenSnapshot
  );
  const fetchAccount = useUserSession((s) => s.fetchAccount);
  const status = useUserSession((s) => s.status);
  const user = useUserSession((s) => s.user);

  useEffect(() => {
    const token = readPersistedAuthToken();
    if (!token) return;
    persistAuthToken(token);
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (status === 'idle' || status === 'loading') return;

    if (status === 'unauthenticated' || !user) return;

    const role = user.userData?.user?.role;
    if (canAccessAdvisorRole(role)) {
      router.replace(getAdvisorHomePath(role));
    } else {
      router.replace('/dashboard');
    }
  }, [status, user, router]);

  if (checkingAuth) return null;

  return <Content />;
}
