"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side Providers wrapper
 * Wraps client-side contexts and routing
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

  // Log navigation for debugging
  useEffect(() => {
    console.log("[HUKI] Route changed:", window.location.pathname);
  }, [router]);

  return <>{children}</>;
}
