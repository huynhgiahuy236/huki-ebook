import { BookActor } from './book-auth.guard';
import { BusinessServiceClient, SellerScope } from './business-service.client';

export { SellerScope } from './business-service.client';

export async function getSellerScope(actor?: BookActor): Promise<SellerScope> {
  if (!actor || !actor.sub || actor.role === 'PLATFORM_ADMIN') {
    return {
      isPlatformAdmin: true,
      businessIds: [],
      storeIds: [],
      ownerUserIds: [],
    };
  }

  const client = BusinessServiceClient.getInstance();
  return client.getSellerScope(actor.sub);
}

export async function resolveStoreAndBusinessIds(targetId: string, actor?: BookActor): Promise<string[]> {
  const ids = new Set<string>([targetId]);
  const client = BusinessServiceClient.getInstance();

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
    if (isUuid) {
      const resolved = await client.resolveTarget(targetId);
      resolved.businessIds.forEach((id) => ids.add(id));
      resolved.storeIds.forEach((id) => ids.add(id));
    }

    if (actor && actor.sub && actor.role !== 'PLATFORM_ADMIN') {
      const actorScope = await getSellerScope(actor);
      actorScope.storeIds?.forEach((id) => ids.add(id));
      actorScope.businessIds?.forEach((id) => ids.add(id));
    }
  } catch (err) {
    console.error('resolveStoreAndBusinessIds error:', err);
  }

  return Array.from(ids);
}
