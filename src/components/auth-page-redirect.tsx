"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AuthPageRedirect({
  children,
  enabled,
  next,
}: {
  children: ReactNode;
  enabled: boolean;
  next: string;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    let active = true;

    void createClient().auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error("Could not check the current Supabase user:", error.message);
        return;
      }
      if (data.session) router.replace(next);
    }).catch((error: unknown) => {
      if (active) console.error("Could not check the current Supabase user:", error);
    });

    return () => {
      active = false;
    };
  }, [enabled, next, router]);

  return children;
}
