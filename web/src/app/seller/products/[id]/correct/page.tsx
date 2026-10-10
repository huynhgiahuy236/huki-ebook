"use client";

import React, { Suspense } from "react";
import SellerCorrectionView from "@/ui/components/seller/SellerCorrectionView";

export default function SellerProductsCorrectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-8 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-emerald-700 animate-spin">progress_activity</span>
        <p className="text-xs font-semibold text-slate-500">Đang tải Studio Chỉnh Sửa & Khắc Phục Sách...</p>
      </div>
    }>
      <SellerCorrectionView />
    </Suspense>
  );
}
