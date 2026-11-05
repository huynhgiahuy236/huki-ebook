'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function BookPreviewRedirectPage() {
  const params = useParams();
  const rawId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();

  useEffect(() => {
    if (rawId) {
      router.replace(`/book/${rawId}`);
    } else {
      router.replace('/books');
    }
  }, [rawId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-500 text-sm">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined animate-spin text-emerald-600">sync</span>
        <span>Đang chuyển hướng đến chi tiết ấn phẩm...</span>
      </div>
    </div>
  );
}
