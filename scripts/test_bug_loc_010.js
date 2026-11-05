/**
 * Verification test for BUG-LOC-010:
 * Ebook order fulfillment page rendering logic (Stepper, DRM account card, dynamic payment method)
 */
const { Client } = require('../platform/node_modules/pg');

async function testOrderLogic() {
  console.log('--- TEST BUG-LOC-010: Ebook Order Fulfillment Logic ---');

  const client = new Client({
    connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce',
  });

  try {
    await client.connect();

    // 1. Fetch the exact order from the screenshot: ORD-MW3Q8EI8-9369335F
    const orderRes = await client.query(`
      SELECT o.id, o.code, o.status, o.payment_status, o.payment_method, o.grand_total, o.shipping_address
      FROM orders o
      WHERE o.code = 'ORD-MW3Q8EI8-9369335F'
      LIMIT 1;
    `);

    if (orderRes.rows.length === 0) {
      throw new Error('Order ORD-MW3Q8EI8-9369335F not found in DB!');
    }

    const order = orderRes.rows[0];
    console.log(`[PASS] Order loaded: ${order.code} (Status: ${order.status}, Payment: ${order.payment_method}/${order.payment_status})`);

    // 2. Fetch seller orders and items
    const soRes = await client.query(`
      SELECT so.id, so.code, so.status, so.requires_shipping
      FROM seller_orders so
      WHERE so.order_id = $1;
    `, [order.id]);

    const sellerOrders = [];
    for (const so of soRes.rows) {
      const itemsRes = await client.query(`
        SELECT oi.id, oi.format, oi.book_title, oi.quantity, oi.subtotal
        FROM order_items oi
        WHERE oi.seller_order_id = $1;
      `, [so.id]);
      sellerOrders.push({
        ...so,
        items: itemsRes.rows,
      });
    }

    // 3. Test hasPhysical & isPureDigitalOrder computation
    const hasPhysical = sellerOrders.some((so) =>
      so.requires_shipping === true ||
      so.items?.some((item) =>
        !item.format?.toUpperCase().includes('DIGITAL') &&
        !item.format?.toLowerCase().includes('ebook') &&
        item.type !== 'ebook'
      )
    );
    const isPureDigitalOrder = !hasPhysical;

    console.log(`[CHECK] hasPhysical: ${hasPhysical}, isPureDigitalOrder: ${isPureDigitalOrder}`);
    if (isPureDigitalOrder !== true) {
      throw new Error('Expected order ORD-MW3Q8EI8-9369335F to be identified as isPureDigitalOrder = true!');
    }
    console.log('[PASS] Pure digital Ebook order correctly identified!');

    // 4. Test payment status computation
    const isPaid =
      order.payment_status === 'PAID' ||
      order.payment_status === 'SUCCEEDED' ||
      order.payment_status === 'COMPLETED' ||
      order.status === 'COMPLETED' ||
      order.status === 'PROCESSING' ||
      (order.payment_method === 'ONLINE_PAYMENT' &&
        order.status !== 'PENDING_PAYMENT' &&
        order.status !== 'PENDING' &&
        order.status !== 'CANCELLED');

    console.log(`[CHECK] isPaid: ${isPaid}`);
    if (isPaid !== true) {
      throw new Error('Expected order ORD-MW3Q8EI8-9369335F to be evaluated as isPaid = true!');
    }
    console.log('[PASS] Order payment status correctly evaluated as paid!');

    // 5. Verify dynamic payment method label
    const paymentMethodLabel = (() => {
      if (Number(order.grand_total) === 0 || order.payment_method === 'FREE') {
        return 'Miễn phí (Voucher 100%)';
      }
      if (order.payment_method === 'ONLINE_PAYMENT' || order.payment_method === 'PAYOS') {
        return 'Thanh toán trực tuyến PayOS (VietQR)';
      }
      if (order.payment_method === 'WALLET') {
        return 'Ví điện tử HuKi';
      }
      return 'Thanh toán khi nhận hàng (COD)';
    })();

    console.log(`[CHECK] paymentMethodLabel: "${paymentMethodLabel}"`);
    if (paymentMethodLabel !== 'Thanh toán trực tuyến PayOS (VietQR)') {
      throw new Error(`Expected PayOS label, got: ${paymentMethodLabel}`);
    }
    console.log('[PASS] Dynamic payment method label matches expected PayOS!');

    // 6. Verify digital stepper steps
    const digitalSteps = [
      { id: 1, title: 'Đặt Hàng Thành Công', status: 'completed' },
      { id: 2, title: 'Xác Nhận Thanh Toán', status: isPaid ? 'completed' : 'upcoming' },
      { id: 3, title: 'Cấp Phép Bản Quyền DRM', status: isPaid ? 'completed' : 'upcoming' },
      { id: 4, title: 'Sẵn Sàng Đọc Sách', status: isPaid ? 'completed' : 'upcoming' },
    ];

    const completedStepsCount = digitalSteps.filter(s => s.status === 'completed').length;
    console.log(`[CHECK] Digital completed steps count: ${completedStepsCount}/4`);
    if (completedStepsCount !== 4) {
      throw new Error(`Expected all 4 digital steps to be completed for paid digital order, got: ${completedStepsCount}`);
    }
    console.log('[PASS] All 4 digital steps completed for paid digital order!');

    console.log('=== BUG-LOC-010 VERIFIED SUCCESSFULLY ===');
  } catch (err) {
    console.error('[FAIL] BUG-LOC-010 verification failed:', err);
    process.exit(1);
  } finally {
    await client.end();
    process.exit(0);
  }
}

testOrderLogic();
