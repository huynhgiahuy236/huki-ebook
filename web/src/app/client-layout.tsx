"use client";

import { ReactNode } from "react";

/**
 * Client-side Providers wrapper
 * Wraps client-side contexts and routing
 */
export default function ClientLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
