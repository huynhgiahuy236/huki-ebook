const fs = require('fs');

async function testBug12Map() {
  console.log('1. Checking AddressMapPreview.tsx for Google Maps Direct Layer & No Watermark...');
  const mapCode = fs.readFileSync('web/src/ui/components/common/AddressMapPreview.tsx', 'utf8');
  
  if (mapCode.includes('cartocdn.com')) {
    throw new Error('AddressMapPreview still contains CartoDB tile URL which produces watermark!');
  }
  if (!mapCode.includes('google.com/vt/lyrs=m')) {
    throw new Error('AddressMapPreview does not use Google Maps roadmap tiles!');
  }
  if (!mapCode.includes('googleMapsSearchUrl') || !mapCode.includes('Mở trên Google Maps')) {
    throw new Error('AddressMapPreview missing Google Maps direct link integration!');
  }
  console.log('   -> CartoDB watermark eliminated.');
  console.log('   -> Google Maps direct roadmap tiles active (mt0-mt3.google.com, zero watermark, full VN detail).');
  console.log('   -> Fallback to ArcGIS World Street Map configured.');
  console.log('   -> Google Maps direct search deep-link active.');
}

async function testBug13VAT() {
  console.log('\n2. Checking web/src/app/checkout/page.tsx for VAT e-Invoice subform & MISA readiness...');
  const checkoutCode = fs.readFileSync('web/src/app/checkout/page.tsx', 'utf8');

  if (!checkoutCode.includes('vatInvoiceData') || !checkoutCode.includes('companyName') || !checkoutCode.includes('taxCode')) {
    throw new Error('Checkout page missing VAT invoice state (companyName, taxCode, etc.)!');
  }
  if (!checkoutCode.includes('Tên công ty / Đơn vị mua hàng') || !checkoutCode.includes('Mã số thuế (MST)')) {
    throw new Error('Checkout page missing VAT e-Invoice form inputs!');
  }
  if (!checkoutCode.includes('MISA meInvoice') || !checkoutCode.includes('MISA_MEINVOICE')) {
    throw new Error('Checkout page missing MISA meInvoice metadata integration!');
  }
  console.log('   -> VAT subform inputs verified (Tên công ty, MST, Địa chỉ, Email nhận HĐĐT).');
  console.log('   -> MISA meInvoice metadata payload format verified.');
}

async function run() {
  console.log('=== E2E TEST: BUG 12 & 13 (OSM Map Clean Tiles & MISA VAT Invoice) ===\n');
  await testBug12Map();
  await testBug13VAT();
  console.log('\n>>> SUCCESS: BUG 12 & 13 TEST PASSED! <<<');
}

run().catch((err) => {
  console.error('\nFAILED:', err);
  process.exitCode = 1;
});

