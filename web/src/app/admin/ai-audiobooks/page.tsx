"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminAiAudiobooksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/books');
  }, [router]);

  return (
    <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-sm">
      <span className="material-symbols-outlined text-3xl animate-spin text-emerald-600 mb-2">
        progress_activity
      </span>
      <p>Đang chuyển hướng về Quản lý Sách Toàn Sàn...</p>
    </div>
  );
}
