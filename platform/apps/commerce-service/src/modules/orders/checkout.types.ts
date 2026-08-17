import { CartItemFormat, ShippingAddress } from '../../entities';

export interface CheckoutSnapshotItem {
  cartItemId: string; bookId: string; storeId: string; ownerUserId: string;
  title: string; coverUrl: string | null; isbn: string | null; format: CartItemFormat;
  quantity: number; unitPrice: number; subtotal: number; weight: number;
}
export interface CheckoutSnapshotGroup {
  storeId: string; ownerUserId: string; requiresShipping: boolean;
  itemSubtotal: number; shippingFee: number; grandTotal: number; items: CheckoutSnapshotItem[];
}
export interface CheckoutSnapshot {
  groups: CheckoutSnapshotGroup[]; itemSubtotal: number; shippingTotal: number;
  discountTotal: number; grandTotal: number; shippingAddress: ShippingAddress | null; note: string | null;
}

