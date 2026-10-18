import { redirect } from 'next/navigation';

export default function ShipperLoginPage() {
  redirect('/auth/login?redirect=/shipper');
}
