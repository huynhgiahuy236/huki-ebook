import { ShippingActor } from './shipping-auth.guard';
import { BusinessServiceClient, SellerScope } from './business-service.client';

export { SellerScope } from './business-service.client';

export async function getSellerScope(actor: ShippingActor): Promise<SellerScope> {
  if (actor.role === 'PLATFORM_ADMIN') {
    return {
      isPlatformAdmin: true,
      businessIds: [],
      storeIds: [],
      ownerUserIds: [],
    };
  }

  const defaultScope: SellerScope = {
    isPlatformAdmin: false,
    businessIds: [],
    storeIds: [],
    ownerUserIds: [actor.sub],
  };

  if (!actor.sub) {
    return defaultScope;
  }

  const client = BusinessServiceClient.getInstance();
  return client.getSellerScope(actor.sub);
}
