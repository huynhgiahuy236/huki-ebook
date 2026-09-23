import React from 'react';
import AdminReturnRequestsView from '@/ui/components/admin/AdminReturnRequestsView';

export const metadata = {
  title: 'Quản Lý Yêu Cầu Đổi Trả | Huki Super Admin',
  description: 'Danh sách và kiểm duyệt các yêu cầu đổi trả, hoàn tiền trên sàn thương mại Huki Ebook',
};

export default function AdminReturnRequestsPage() {
  return <AdminReturnRequestsView />;
}
