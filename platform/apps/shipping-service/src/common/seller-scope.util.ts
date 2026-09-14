import { Client } from 'pg';
import { ShippingActor } from './shipping-auth.guard';

export interface SellerScope {
  isPlatformAdmin: boolean;
  businessIds: string[];
  storeIds: string[];
  ownerUserIds: string[];
}

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

  try {
    const bizDbUrl =
      process.env.BUSINESS_DATABASE_URL ||
      process.env.DATABASE_URL?.replace(/\/[^\/]+$/, '/huki_business') ||
      'postgresql://postgres:postgres123@localhost:5432/huki_business';

    const pgClient = new Client({ connectionString: bizDbUrl });
    await pgClient.connect();

    const res = await pgClient.query(
      `SELECT b.id AS business_id, b.owner_id, s.id AS store_id
       FROM businesses b
       LEFT JOIN stores s ON s.business_id = b.id AND s.deleted_at IS NULL
       WHERE b.deleted_at IS NULL AND (
         b.owner_id = $1
         OR b.id IN (
           SELECT m.business_id FROM members m 
           WHERE m.user_id = $1 AND m.status = 'ACTIVE' AND m.deleted_at IS NULL
         )
       )`,
      [actor.sub],
    );

    await pgClient.end();

    const businessIds = new Set<string>();
    const storeIds = new Set<string>();
    const ownerUserIds = new Set<string>([actor.sub]);

    for (const row of res.rows) {
      if (row.business_id) {
        businessIds.add(row.business_id);
        storeIds.add(row.business_id);
      }
      if (row.store_id) {
        storeIds.add(row.store_id);
      }
      if (row.owner_id) {
        ownerUserIds.add(row.owner_id);
      }
    }

    return {
      isPlatformAdmin: false,
      businessIds: Array.from(businessIds),
      storeIds: Array.from(storeIds),
      ownerUserIds: Array.from(ownerUserIds),
    };
  } catch (err) {
    console.error('getSellerScope shipping error:', err);
    return defaultScope;
  }
}
