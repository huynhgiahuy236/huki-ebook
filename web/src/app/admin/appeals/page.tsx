import { Metadata } from 'next';
import { AdminAppealsView } from '@/ui/components/admin/AdminAppealsView';

export const metadata: Metadata = {
  title: 'Hàng đợi Kháng nghị Xử phạt | HUKI EBOOK Admin',
  description: 'Thẩm định và xem xét các hồ sơ kháng nghị xử phạt vi phạm của người bán.',
};

export default function AdminAppealsPage() {
  return <AdminAppealsView />;
}
