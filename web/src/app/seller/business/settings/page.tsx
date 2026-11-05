'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BusinessSettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/seller/business');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
