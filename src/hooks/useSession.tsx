'use client'

import { useEffect } from 'react'
import { useUserSession } from '@/stores/useUserSession'

export function useSession() {
  const { user, status } = useUserSession();

  return {
    user,
    status,
    isLoading: status === "idle" || status === "loading",
    isAuthenticated: status === "authenticated",
  };
}

