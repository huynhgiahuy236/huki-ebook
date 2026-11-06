import amqp from 'amqplib';
import { Client } from 'pg';
import { randomUUID } from 'crypto';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest123@localhost:5672';
const DB_URL = process.env.SHIPPING_DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5432/huki_shipping';
const EXCHANGE = 'huki.events';

async function main() {
  console.log('================================================================');
  console.log('🧪 TEST 4: SHIPPING INBOX EVENT DEDUPLICATION (RABBITMQ)');
  console.log(`🎯 Target RabbitMQ: ${RABBITMQ_URL}`);
  console.log('================================================================\n');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  const conn = await amqp.connect(RABBITMQ_URL);
  const ch = await conn.createChannel();
  await ch.assertExchange(EXCHANGE, 'topic', { durable: true });

  const testEventId = `evt-dedup-${randomUUID()}`;
  const testOrderId = randomUUID();
  const testSellerOrderId = randomUUID();
  const testUserId = '04609db5-d34d-4f54-a640-c6e7d820777b';
  const testStoreId = randomUUID();

  let passedAssertions = 0;
  const totalAssertions = 3;

  try {
    const eventPayload = {
      orderId: testOrderId,
      userId: testUserId,
      paymentMethod: 'ONLINE_PAYMENT',
      paymentStatus: 'SUCCEEDED',
      shippingAddress: {
        receiverName: 'Auditor Duplication Check',
        receiverPhone: '0987654321',
        address: '789 Le Duan',
        province: 'Thành phố Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Phường Bến Nghé',
      },
      sellerOrders: [
        {
          sellerOrderId: testSellerOrderId,
          storeId: testStoreId,
          ownerUserId: testUserId,
          requiresShipping: true,
          weight: 450,
          codAmount: 0,
        },
      ],
    };

    const domainEvent = {
      eventId: testEventId,
      eventType: 'ORDER_CREATED',
      occurredAt: new Date().toISOString(),
      producer: 'commerce-service',
      version: 1,
      aggregateId: testOrderId,
      payload: eventPayload,
    };

    console.log(`[SETUP] Prepared DomainEvent:`);
    console.log(`  - eventId: ${testEventId}`);
    console.log(`  - eventType: ${domainEvent.eventType}`);
    console.log(`  - sellerOrderId: ${testSellerOrderId}\n`);

    // -------------------------------------------------------------
    // ASSERTION 1 & 2: Publish message twice with identical eventId
    // -------------------------------------------------------------
    console.log('--- KỊCH BẢN 1: Bắn liên tiếp 2 message RabbitMQ cùng một eventId ---');
    const msgBuffer = Buffer.from(JSON.stringify(domainEvent));

    console.log('Publishing message 1...');
    ch.publish(EXCHANGE, 'ORDER_CREATED', msgBuffer, {
      persistent: true,
      contentType: 'application/json',
      messageId: testEventId,
    });

    console.log('Publishing message 2 (identical duplicate message)...');
    ch.publish(EXCHANGE, 'ORDER_CREATED', msgBuffer, {
      persistent: true,
      contentType: 'application/json',
      messageId: testEventId,
    });

    // Wait 3 seconds for shipping-service consumer to process both messages
    console.log('Waiting 3 seconds for asynchronous consumer processing...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify inbox_events table
    const inboxRes = await pg.query(
      `SELECT id, event_id, type, aggregate_id FROM inbox_events WHERE event_id = $1`,
      [testEventId]
    );
    console.log(`Inbox events found in DB: ${inboxRes.rowCount} (Expected: 1)`);

    if (inboxRes.rowCount === 1) {
      console.log('✅ PASS [1/3]: Bảng inbox_events chỉ ghi nhận duy nhất 1 bản ghi eventId.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [1/3]: Số lượng bản ghi inbox_events không chính xác (${inboxRes.rowCount})!`);
    }

    // -------------------------------------------------------------
    // ASSERTION 3: Exactly 1 Shipment created in shipments table
    // -------------------------------------------------------------
    const shipmentRes = await pg.query(
      `SELECT id, order_id, seller_order_id, status, tracking_number FROM shipments WHERE seller_order_id = $1`,
      [testSellerOrderId]
    );
    console.log(`Shipments found for sellerOrderId: ${shipmentRes.rowCount} (Expected: 1)`);

    if (shipmentRes.rowCount === 1) {
      const sh = shipmentRes.rows[0];
      console.log(`  -> Shipment ID: ${sh.id}, Status: ${sh.status}, Tracking: ${sh.tracking_number}`);
      console.log('✅ PASS [2/3]: Chỉ sinh đúng 1 vận đơn (Shipment), không bị nhân đôi.');
      passedAssertions++;
    } else {
      console.error(`❌ FAIL [2/3]: Số lượng vận đơn bị sai (${shipmentRes.rowCount})!`);
    }

    // Check delivery_logs count for this shipment
    if (shipmentRes.rowCount === 1) {
      const logRes = await pg.query(
        `SELECT count(*) FROM delivery_logs WHERE shipment_id = $1`,
        [shipmentRes.rows[0].id]
      );
      const logCount = Number(logRes.rows[0].count);
      console.log(`Delivery logs recorded: ${logCount} (Expected: 1 for SHIPMENT_CREATED)`);
      if (logCount === 1) {
        console.log('✅ PASS [3/3]: Lịch sử vận đơn (delivery_logs) không bị ghi trùng lặp.');
        passedAssertions++;
      } else {
        console.error(`❌ FAIL [3/3]: Delivery logs bị trùng lặp (${logCount})!`);
      }
    }

    // Teardown
    if (shipmentRes.rowCount > 0) {
      const shId = shipmentRes.rows[0].id;
      await pg.query(`DELETE FROM delivery_logs WHERE shipment_id = $1`, [shId]);
      await pg.query(`DELETE FROM outbox_events WHERE aggregate_id = $1`, [shId]);
      await pg.query(`DELETE FROM shipments WHERE id = $1`, [shId]);
    }
    await pg.query(`DELETE FROM inbox_events WHERE event_id = $1`, [testEventId]);
    console.log('\n[TEARDOWN] Cleaned up test shipment, logs, and inbox event.');

  } finally {
    await ch.close();
    await conn.close();
    await pg.end();
  }

  console.log('\n================================================================');
  console.log(`📊 KẾT QUẢ TEST 4: ${passedAssertions}/${totalAssertions} ASSERTIONS PASS`);
  console.log('================================================================\n');

  if (passedAssertions === totalAssertions) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
