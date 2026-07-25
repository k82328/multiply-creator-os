"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import MultiplyCreatorOS from "../components/MultiplyCreatorOS";

export const dynamic = "force-dynamic";

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session === null) router.replace("/login");
  }, [session, router]);

  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#131209",
          color: "#A79A80",
          fontFamily: "'Noto Sans TC', sans-serif",
        }}
      >
        載入中…
      </div>
    );
  }
  if (!session) return null;

  return <MultiplyCreatorOS user={session.user} />;
}
