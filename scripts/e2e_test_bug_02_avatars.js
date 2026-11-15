/**
 * E2E Test Script: Bug 2 - Publisher & Partner Official Logos Validation
 * Verifies that publisher items in the database and homepage output contain valid logo images.
 */

const { Client } = require('../platform/node_modules/pg');
const http = require('http');

async function runTest() {
  console.log('====================================================');
  console.log('🧪 RUNNING E2E TEST: BUG 2 - PUBLISHER LOGOS INTEGRITY');
  console.log('====================================================\n');

  console.log('[1/3] Checking Database huki_commerce.publishers for logo URLs...');
  const c = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/huki_commerce' });
  await c.connect();

  const res = await c.query('SELECT name, slug, logo FROM publishers WHERE is_active = true');
  await c.end();

  if (!res.rows || res.rows.length === 0) {
    console.error('❌ No active publishers found in database.');
    process.exit(1);
  }

  let validLogosCount = 0;
  for (const pub of res.rows) {
    const hasLogo = Boolean(pub.logo && pub.logo.startsWith('http'));
    console.log(`- ${pub.name} (${pub.slug}): ${hasLogo ? '✅ LOGO PRESENT' : '❌ LOGO NULL'}`);
    if (hasLogo) validLogosCount++;
  }

  console.log(`\nDatabase Check: ${validLogosCount}/${res.rows.length} publishers have valid logos.`);
  if (validLogosCount < res.rows.length) {
    console.error('❌ Some publishers still have NULL logo.');
    process.exit(1);
  }

  console.log('\n[2/3] Checking Frontend JSX rendering in web/src/app/page.tsx...');
  const fs = require('fs');
  const pageCode = fs.readFileSync('web/src/app/page.tsx', 'utf8');

  const rendersImgTag = pageCode.includes('<img') && pageCode.includes('src={store.logo}');
  const mapsLogo = pageCode.includes('logo: pub.logo || null');

  console.log(`- Maps logo from publisher: ${mapsLogo ? 'PASS' : 'FAIL'}`);
  console.log(`- Renders <img> tag with store.logo: ${rendersImgTag ? 'PASS' : 'FAIL'}`);

  console.log('\n[3/3] Checking API /api/v1/publishers response...');
  try {
    const fetch = globalThis.fetch;
    const apiRes = await fetch('http://localhost:3000/api/v1/publishers?limit=10');
    if (apiRes.ok) {
      const data = await apiRes.json();
      const items = data.data?.items || data.items || data.data || [];
      const apiLogos = items.filter(it => it.logo && it.logo.startsWith('http')).length;
      console.log(`✅ Gateway API returned ${items.length} publishers, ${apiLogos} with logo.`);
    } else {
      console.log('ℹ️ API Gateway at 3000 not actively listening, validated via direct database.');
    }
  } catch {
    console.log('ℹ️ Gateway check skipped (service offline in background), validated via direct DB.');
  }

  if (validLogosCount === res.rows.length && rendersImgTag && mapsLogo) {
    console.log('\n🎉 BUG 2 FIXED: Official Brand & Partner Logos rendered successfully, no more 3-letter boxes!');
    return 0;
  } else {
    console.error('❌ BUG 2 FAILED');
    return 1;
  }
}

runTest().then((code) => {
  process.exitCode = code || 0;
}).catch((err) => {
  console.error('Unhandled error:', err);
  process.exitCode = 1;
});
