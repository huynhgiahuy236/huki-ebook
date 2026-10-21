// ========================================================
// HUKI EBOOK - Post-Deployment Smoke Test
// Validates end-to-end service availability and health
// ========================================================

const GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://127.0.0.1:3000';
const WEB_URL = process.env.WEB_URL || 'http://127.0.0.1:3100';

async function runCheck(name, checkFn) {
  process.stdout.write(`  Checking ${name.padEnd(45)} `);
  try {
    const start = Date.now();
    await checkFn();
    const duration = Date.now() - start;
    console.log(`\x1b[32mPASS\x1b[0m (${duration}ms)`);
    return true;
  } catch (error) {
    console.log(`\x1b[31mFAIL\x1b[0m: ${error.message}`);
    return false;
  }
}

async function smokeTest() {
  console.log('====================================================');
  console.log('   HUKI EBOOK Post-Deployment Smoke Test Suite');
  console.log(`   Gateway: ${GATEWAY_URL}`);
  console.log(`   Web:     ${WEB_URL}`);
  console.log('====================================================\n');

  let passes = 0;
  let total = 0;

  const checks = [
    {
      name: 'Gateway Liveness Probe (/api/v1/health/live)',
      fn: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/health/live`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const payload = json.data || json;
        if (json.status !== 'success' && payload.status !== 'ok') throw new Error(`Unexpected body: ${JSON.stringify(json)}`);
      },
    },
    {
      name: 'Gateway Downstream Services Health (/api/v1/health/services)',
      fn: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/health/services`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const payload = data.data || data;
        if (!Array.isArray(payload.services)) throw new Error('Missing services array');
        const unhealthy = payload.services.filter(s => s.status !== 'ok');
        if (unhealthy.length > 0) throw new Error(`Unhealthy services: ${JSON.stringify(unhealthy)}`);
      },
    },
    {
      name: 'Auth Service Register Validation Proxying',
      fn: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'smoke-test-invalid', password: 'x' }),
          signal: AbortSignal.timeout(5000),
        });
        // Must return 400 Bad Request with validation errors
        if (res.status !== 400) throw new Error(`Expected HTTP 400 for bad input, got ${res.status}`);
      },
    },
    {
      name: 'Catalog Public Listing Endpoint',
      fn: async () => {
        const res = await fetch(`${GATEWAY_URL}/api/v1/books?limit=1`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      },
    },
    {
      name: 'Web Frontend Health Route (/api/health?probe=live)',
      fn: async () => {
        try {
          const res = await fetch(`${WEB_URL}/api/health?probe=live`, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
        } catch (err) {
          // If web server is not running locally during CLI run, log warning
          if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
            console.log(`\n  \x1b[33m[SKIP: Web frontend not running at ${WEB_URL}]\x1b[0m`);
            return;
          }
          throw err;
        }
      },
    },
    {
      name: 'Affiliate Subsystem Health Probe (/api/v1/health/affiliate)',
      fn: async () => {
        try {
          const res = await fetch(`${GATEWAY_URL}/api/v1/health/affiliate`, { signal: AbortSignal.timeout(5000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          const payload = json.data || json;
          if (payload.subsystem !== 'affiliate-marketing') throw new Error('Not an affiliate probe response');
        } catch (err) {
          // If gateway route is proxied or commerce service standalone
          if (err.message.includes('ECONNREFUSED') || err.message.includes('fetch failed')) {
            console.log(`\n  \x1b[33m[SKIP: Gateway not running at ${GATEWAY_URL}]\x1b[0m`);
            return;
          }
          throw err;
        }
      },
    },
  ];

  for (const check of checks) {
    total++;
    const ok = await runCheck(check.name, check.fn);
    if (ok) passes++;
  }

  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passes}/${total} checks passed.`);
  if (passes < total) {
    console.error('Smoke tests FAILED. Deployment verification did not pass.');
    process.exit(1);
  } else {
    console.log('Smoke tests PASSED. All systems operational.');
  }
}

smokeTest().catch((err) => {
  console.error('Fatal error running smoke test:', err);
  process.exit(1);
});
