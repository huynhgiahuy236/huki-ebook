const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function seedWalletPins() {
  const commerceClient = new Client({
    connectionString: process.env.COMMERCE_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_commerce'
  });
  const businessClient = new Client({
    connectionString: process.env.BUSINESS_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_business'
  });

  try {
    await commerceClient.connect();
    await businessClient.connect();

    // 1. Get all stores from business DB
    const storesRes = await businessClient.query(`SELECT s.id, s.name, s.business_id, b.owner_id FROM stores s LEFT JOIN businesses b ON s.business_id = b.id WHERE s.deleted_at IS NULL`);
    console.log(`Found ${storesRes.rows.length} stores in business DB`);

    const defaultPinHash = await bcrypt.hash('123456', 10);

    for (const store of storesRes.rows) {
      const storeId = store.id;
      const ownerUserId = store.owner_id || '00000000-0000-0000-0000-000000000000';

      // 2. Ensure Wallet exists in commerce DB
      let walletRes = await commerceClient.query(`SELECT id, store_id FROM wallets WHERE store_id = $1`, [storeId]);
      let walletId;
      if (walletRes.rows.length === 0) {
        const createWalletRes = await commerceClient.query(
          `INSERT INTO wallets (id, store_id, owner_user_id, available_balance, pending_balance, frozen_balance, currency, version, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, 0, 0, 0, 'VND', 1, NOW(), NOW()) RETURNING id`,
          [storeId, ownerUserId]
        );
        walletId = createWalletRes.rows[0].id;
        console.log(`Created wallet for store ${storeId} (${store.name})`);
      } else {
        walletId = walletRes.rows[0].id;
      }

      // 3. Ensure WalletSecurity exists with default PIN
      let secRes = await commerceClient.query(`SELECT id, pin_hash FROM wallet_securities WHERE store_id = $1`, [storeId]);
      if (secRes.rows.length === 0) {
        await commerceClient.query(
          `INSERT INTO wallet_securities (id, wallet_id, store_id, pin_hash, failed_attempts, pin_set_at, created_at, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, 0, NOW(), NOW(), NOW())`,
          [walletId, storeId, defaultPinHash]
        );
        console.log(`Created WalletSecurity with default PIN 123456 for store ${storeId} (${store.name})`);
      } else if (!secRes.rows[0].pin_hash) {
        await commerceClient.query(
          `UPDATE wallet_securities SET pin_hash = $1, pin_set_at = NOW(), updated_at = NOW() WHERE store_id = $2`,
          [defaultPinHash, storeId]
        );
        console.log(`Updated PIN to default 123456 for store ${storeId} (${store.name})`);
      } else {
        console.log(`Store ${storeId} (${store.name}) already has PIN set`);
      }
    }

    console.log('Successfully seeded default PINs for all existing stores!');
  } catch (err) {
    console.error('Error during seeding wallet pins:', err);
  } finally {
    await commerceClient.end();
    await businessClient.end();
  }
}

seedWalletPins();
