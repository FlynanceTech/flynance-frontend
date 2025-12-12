'use client'

import { useEffect } from 'react'
import { useUserSession } from '@/stores/useUserSession'

export function useSession() {
  const { user, status } = useUserSession();

  useEffect(() => {
    console.log("use Session check user", user);
  }, [user]);

  return {
    user,
    status,
    isLoading: status === "idle" || status === "loading",
    isAuthenticated: status === "authenticated",
  };
}

