'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AudiobooksPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/books');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
        <span className="material-symbols-outlined text-3xl animate-spin text-emerald-600">
          progress_activity
        </span>
        <p>Đang chuyển hướng về Danh mục sách...</p>
      </div>
    </div>
  );
}
