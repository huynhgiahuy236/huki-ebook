"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SellerNewStorePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/seller/stores");
  }, [router]);

  return null;
}

