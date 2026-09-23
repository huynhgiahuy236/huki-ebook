"use client";

import React from "react";
import dynamic from "next/dynamic";

const AdminEscrowView = dynamic(
  () => import("@/ui/components/admin/AdminEscrowView"),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
        </div>
        <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>
    ),
  }
);

export default function AdminEscrowPage() {
  return <AdminEscrowView />;
}
