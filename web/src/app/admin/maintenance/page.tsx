'use client';

import dynamic from 'next/dynamic';

const AdminMaintenanceView = dynamic(
  () => import('@/ui/components/admin/AdminMaintenanceView'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] flex items-center justify-center text-xs text-slate-400 animate-pulse">
        Đang tải bảng điều khiển bảo trì...
      </div>
    ),
  }
);

export default function AdminMaintenancePage() {
  return <AdminMaintenanceView />;
}
