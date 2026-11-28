"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminReturnRequestsAliasPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/return-requests");
  }, [router]);

  return null;
}
