import AdminMaintenanceView from '@/ui/components/admin/AdminMaintenanceView';

export const metadata = {
  title: 'Bảo Trì Hệ Thống & Kill-Switch | HUKI Admin',
  description: 'Quản lý trạng thái bảo trì, công tắc tắt khẩn cấp (kill-switch) và xả lưu lượng êm dịu (graceful drain).',
};

export default function AdminMaintenancePage() {
  return <AdminMaintenanceView />;
}
