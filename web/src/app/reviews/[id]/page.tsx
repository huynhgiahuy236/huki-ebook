"use client";

import React, { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/ui/context/AuthContext";

export default function ReviewRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const reviewId = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  useEffect(() => {
    if (!reviewId) {
      router.replace("/");
      return;
    }

    const isSeller = user?.role === "BUSINESS" || user?.role === "SELLER";
    if (isSeller) {
      router.replace(`/seller/reviews?reviewId=${encodeURIComponent(reviewId)}`);
    } else {
      router.replace(`/profile/reviews`);
    }
  }, [reviewId, user, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 border-3 border-[#006953]/20 border-t-[#006953] rounded-full animate-spin mb-4" />
      <h2 className="text-base font-bold text-slate-800">Đang chuyển tiếp đánh giá...</h2>
      <p className="text-xs text-slate-500 mt-1">Vui lòng chờ trong giây lát.</p>
    </div>
  );
}

