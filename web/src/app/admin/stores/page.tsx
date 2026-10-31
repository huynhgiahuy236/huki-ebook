"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminBusinessesView } from "@/ui/components/admin/AdminBusinessesView";

export default function AdminStoresViewPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/businesses');
  }, [router]);

  return <AdminBusinessesView />;
}
