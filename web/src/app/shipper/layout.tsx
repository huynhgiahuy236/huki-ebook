import React from 'react';
import ShipperLayout from '@/ui/components/layout/ShipperLayout';

export const metadata = {
  title: 'HuKi Express - Cổng Vận Hành Giao Hàng Bưu Tá',
  description: 'Cổng điều phối đơn hàng, giao nhận sách giấy và đối soát tài chính COD cho Bưu tá HuKi.',
};

export default function RootShipperLayout({ children }: { children: React.ReactNode }) {
  return <ShipperLayout>{children}</ShipperLayout>;
}
