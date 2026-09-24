'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function RedirectToAccountMessages() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams ? searchParams.toString() : '';
    const target = params ? `/account/messages?${params}` : '/account/messages';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white text-[#003B2B] text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-[#003B2B]/20 border-t-[#003B2B] rounded-full animate-spin"></div>
        <span>Đang chuyển hướng tới Tin Nhắn...</span>
      </div>
    </div>
  );
}

export default function MessagesRedirectPage() {
  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center bg-white text-[#003B2B]">Đang chuyển hướng...</div>}>
      <RedirectToAccountMessages />
    </Suspense>
  );
}
