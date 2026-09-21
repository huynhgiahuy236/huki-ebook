import { Metadata } from 'next';
import { SellerAppealsView } from '@/ui/components/seller/SellerAppealsView';

export const metadata: Metadata = {
  title: 'Xử lý vi phạm & Kháng nghị | HUKI EBOOK Seller Center',
  description: 'Quản lý quyết định xử phạt và thực hiện nộp hồ sơ kháng nghị xử phạt của cửa hàng.',
};

export default function SellerAppealsPage() {
  return <SellerAppealsView />;
}
