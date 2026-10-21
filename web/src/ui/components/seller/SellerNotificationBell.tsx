'use client';

import UniversalNotificationBell, { UniversalNotificationBellProps } from '../common/UniversalNotificationBell';

/**
 * @deprecated Use UniversalNotificationBell variant="seller" directly
 */
export default function SellerNotificationBell(props: Partial<UniversalNotificationBellProps>) {
  return <UniversalNotificationBell variant="seller" {...props} />;
}
