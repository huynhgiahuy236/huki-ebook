"use client";

import dynamic from "next/dynamic";

const UiApp = dynamic(() => import("@/ui/App"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#f2fbf9] flex items-center justify-center" role="status">
      <div className="rounded-xl border border-[#e8e5df] bg-white px-5 py-3 text-sm font-semibold text-[#17201f] shadow-sm">
        Đang tải HUKI EBOOK…
      </div>
    </div>
  ),
});

export default function UiAppClient() {
  return <UiApp />;
}
