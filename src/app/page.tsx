'use client'
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Content from "../components/home/Content";
import { persistAuthToken, readPersistedAuthToken } from "@/lib/authSession";

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const token = readPersistedAuthToken();
    if (token) {
      persistAuthToken(token);
      router.replace('/dashboard');
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) return null;

  return <Content />;
}
