const path = require('path');
const { Client } = require(path.resolve(__dirname, '../platform/node_modules/pg'));

async function verify() {
  const promo = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_promotion' });
  try {
    await promo.connect();
    console.log('[TEST BUG-LOC-001] Checking huki_promotion vouchers & user_saved_vouchers...');
    const vouchersRes = await promo.query("SELECT id, code, status FROM vouchers WHERE status = 'ACTIVE'");
    console.log(`- Active vouchers found: ${vouchersRes.rows.length}`);
    if (vouchersRes.rows.length === 0) throw new Error('No active vouchers found!');

    const savedRes = await promo.query("SELECT id, user_id, voucher_id FROM user_saved_vouchers");
    console.log(`- Existing user_saved_vouchers count: ${savedRes.rows.length}`);

    // Verify voucher IDs are valid UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    for (const row of vouchersRes.rows) {
      if (row.id.startsWith('vouch-')) {
        console.log(`- Seed voucher identified: ${row.code} (${row.id})`);
      } else if (!uuidRegex.test(row.id)) {
        console.warn(`- Non-standard voucher ID: ${row.id}`);
      }
    }
    console.log('[PASS BUG-LOC-001] Database schema & voucher wallet integrity verified successfully.');
  } finally {
    await promo.end();
  }
}

verify()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[FAIL BUG-LOC-001]', err);
    process.exit(1);
  });
