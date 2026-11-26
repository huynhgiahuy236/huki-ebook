'use strict';

/**
 * E2E Verification Script: BUG-13 (R2 Ebook Storage Multi-Candidate Fallback, Circuit Breaker & 503 Diagnostics)
 *
 * Tests real runtime behavior against:
 * 1. Real Cloudflare R2 using `platform/.env` credentials (`HeadObject` + `GetObject` `%PDF-` magic bytes)
 * 2. Simulated broken primary `CLOUDFLARE_R2_*` credentials automatically falling back to valid `R2_*` candidate
 * 3. Endpoint sanitization (strips surrounding quotes/spaces & rejects `.r2.dev` public URLs from S3 endpoint)
 * 4. 15s circuit breaker & safe `getDiagnostics()` (never exposes accessKeyId/secret/tokens)
 * 5. Compiled `BooksService.streamPdf` forwarding safe `diagnostic` inside `503 EBOOK_STORAGE_UNAVAILABLE`
 * 6. Frontend `PdfCanvasViewer.tsx` retry UI (`"Thử tải lại PDF"` & `retryNonce`)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const PLATFORM_DIST = path.join(ROOT, 'platform', 'dist');
const PLATFORM_NODE_MODULES = path.join(ROOT, 'platform', 'node_modules');

const origResolve = Module._resolveFilename;
Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request === '@huki/shared') {
    return path.join(PLATFORM_DIST, 'libs', 'shared', 'index.js');
  }
  if (request.startsWith('@huki/shared/')) {
    const sub = request.slice('@huki/shared/'.length);
    const asFile = path.join(PLATFORM_DIST, 'libs', 'shared', `${sub}.js`);
    return fs.existsSync(asFile)
      ? asFile
      : path.join(PLATFORM_DIST, 'libs', 'shared', sub, 'index.js');
  }
  try {
    return origResolve.call(this, request, parent, isMain, options);
  } catch (err) {
    const nextOptions = Object.assign({}, options || {}, {
      paths: [PLATFORM_NODE_MODULES, ...((options && options.paths) || [])],
    });
    return origResolve.call(this, request, parent, isMain, nextOptions);
  }
};

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function makeConfigService(map) {
  return {
    get(key) {
      if (key === 'storage.r2.bucket') return map.CLOUDFLARE_R2_BUCKET || map.R2_BUCKET_NAME;
      if (key === 'storage.r2.endpoint') return map.CLOUDFLARE_R2_ENDPOINT;
      if (key === 'storage.r2.accessKeyId') return map.CLOUDFLARE_R2_ACCESS_KEY_ID;
      if (key === 'storage.r2.secretAccessKey') return map.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
      if (key === 'storage.r2.publicDomain') return map.CLOUDFLARE_R2_PUBLIC_DOMAIN || map.R2_PUBLIC_URL;
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : process.env[key];
    },
  };
}

function withTemporaryEnv(envPatch, fn) {
  const saved = { ...process.env };
  const r2Keys = [
    'CLOUDFLARE_R2_ACCOUNT_ID',
    'CLOUDFLARE_R2_ACCESS_KEY_ID',
    'CLOUDFLARE_R2_SECRET_ACCESS_KEY',
    'CLOUDFLARE_R2_ENDPOINT',
    'CLOUDFLARE_R2_BUCKET',
    'CLOUDFLARE_R2_PUBLIC_DOMAIN',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ];
  for (const k of r2Keys) delete process.env[k];
  for (const [k, v] of Object.entries(envPatch)) {
    if (v !== undefined) process.env[k] = String(v);
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of r2Keys) delete process.env[k];
      Object.assign(process.env, saved);
    });
}

async function readStreamHead(stream, maxBytes = 16) {
  const chunks = [];
  let total = 0;
  for await (const chunk of stream) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(buf);
    total += buf.length;
    if (total >= maxBytes) {
      if (typeof stream.destroy === 'function') stream.destroy();
      break;
    }
  }
  return Buffer.concat(chunks).subarray(0, maxBytes);
}

async function run() {
  console.log('=== E2E VERIFICATION: BUG-13 (R2 MULTI-CANDIDATE FALLBACK & 503 DIAGNOSTICS) ===\n');

  const envMap = loadDotEnv(path.join(ROOT, 'platform', '.env'));
  const { R2EbookStorage } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'commerce-service',
      'apps',
      'commerce-service',
      'src',
      'modules',
      'books',
      'storage',
      'r2-ebook.storage.js',
    ),
  );
  const { BooksService } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'commerce-service',
      'apps',
      'commerce-service',
      'src',
      'modules',
      'books',
      'books.service.js',
    ),
  );

  // 1. Real Cloudflare R2 test with current platform/.env
  const testKey = 'ebooks/dac-nhan-tam.pdf';
  await withTemporaryEnv(envMap, async () => {
    const storageNormal = new R2EbookStorage(makeConfigService(envMap));
    const existsReal = await storageNormal.exists(testKey);
    assert.strictEqual(existsReal, true, `Expected ${testKey} to exist on real R2`);
    const streamObj = await storageNormal.getStream(testKey);
    const magic = (await readStreamHead(streamObj.stream, 5)).toString('ascii');
    assert.strictEqual(magic, '%PDF-', `Expected %PDF- header, got ${magic}`);
    console.log(`[PASS] Step 1: Real Cloudflare R2 verified for ${testKey} (activeCandidate=${storageNormal.getDiagnostics().activeCandidate})`);
  });

  // 2. Broken primary CLOUDFLARE_R2_* automatically falling back to valid R2_* candidate
  const realAccess = envMap.CLOUDFLARE_R2_ACCESS_KEY_ID || envMap.R2_ACCESS_KEY_ID;
  const realSecret = envMap.CLOUDFLARE_R2_SECRET_ACCESS_KEY || envMap.R2_SECRET_ACCESS_KEY;
  const realAccount = envMap.CLOUDFLARE_R2_ACCOUNT_ID || envMap.R2_ACCOUNT_ID;
  const realBucket = envMap.CLOUDFLARE_R2_BUCKET || envMap.R2_BUCKET || envMap.R2_BUCKET_NAME;

  const fallbackEnv = {
    CLOUDFLARE_R2_ACCOUNT_ID: '00000000000000000000000000000000',
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'invalid_primary_key_123',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'invalid_primary_secret_456',
    CLOUDFLARE_R2_ENDPOINT: ' "https://pub-broken-example.r2.dev" ',
    CLOUDFLARE_R2_BUCKET: realBucket,
    CLOUDFLARE_R2_PUBLIC_DOMAIN: '',
    R2_ACCOUNT_ID: realAccount,
    R2_ACCESS_KEY_ID: realAccess,
    R2_SECRET_ACCESS_KEY: realSecret,
    R2_BUCKET_NAME: realBucket,
    R2_PUBLIC_URL: 'https://your-public-url.r2.dev',
  };
  await withTemporaryEnv(fallbackEnv, async () => {
    const storageFallback = new R2EbookStorage(makeConfigService(fallbackEnv));
    const existsViaFallback = await storageFallback.exists(testKey);
    assert.strictEqual(existsViaFallback, true, 'Broken primary must automatically fall back to working R2_* candidate');
    const fallbackStream = await storageFallback.getStream(testKey);
    const fallbackMagic = (await readStreamHead(fallbackStream.stream, 5)).toString('ascii');
    assert.strictEqual(fallbackMagic, '%PDF-');
    const diagFallback = storageFallback.getDiagnostics();
    assert.ok(String(diagFallback.activeCandidate || '').startsWith('r2:'), `Expected activeCandidate starting with r2:, got ${diagFallback.activeCandidate}`);
    console.log(`[PASS] Step 2: Broken primary CLOUDFLARE_R2_* recovered via fallback candidate ${diagFallback.activeCandidate}`);
  });

  // 3. Safe diagnostics check (no secret leak!) & 15s circuit breaker check
  const brokenAllEnv = {
    CLOUDFLARE_R2_ENDPOINT: `https://${realAccount}.r2.cloudflarestorage.com`,
    CLOUDFLARE_R2_ACCESS_KEY_ID: 'secret_should_never_leak_ak',
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: 'secret_should_never_leak_sk',
    CLOUDFLARE_R2_BUCKET: realBucket,
  };
  await withTemporaryEnv(brokenAllEnv, async () => {
    const brokenAllStorage = new R2EbookStorage(makeConfigService(brokenAllEnv));
    const brokenExists1 = await brokenAllStorage.exists(testKey);
    assert.strictEqual(brokenExists1, false);
    const tBreaker = Date.now();
    const brokenExists2 = await brokenAllStorage.exists(testKey);
    const breakerMs = Date.now() - tBreaker;
    assert.strictEqual(brokenExists2, false);
    assert.ok(breakerMs < 50, `Circuit breaker should short-circuit exists() immediately (<50ms), took ${breakerMs}ms`);
    const diagBroken = brokenAllStorage.getDiagnostics();
    const diagJson = JSON.stringify(diagBroken);
    assert.ok(!diagJson.includes('secret_should_never_leak'), 'Diagnostics must never expose secrets/keys');
    assert.strictEqual(diagBroken.circuitOpen, true);
    console.log(`[PASS] Step 3: 15s circuit breaker fast-returned in ${breakerMs}ms; diagnostics secret-safe (circuitOpen=true)`);
  });

  // 4. Compiled BooksService.streamPdf 503 diagnostic payload
  const failingStorage = {
    getStream: async () => {
      throw Object.assign(new Error('Invalid R2 Signature'), { name: 'SignatureDoesNotMatch' });
    },
    getDiagnostics: () => ({
      configured: true,
      bucket: 'huki-ebooks',
      activeCandidate: 'cf:path',
      candidateCount: 2,
      publicBaseUrlConfigured: false,
      circuitBreakerActive: false,
    }),
  };
  const booksService = new BooksService(
    {
      book: {
        findFirst: async () => ({
          id: 'b-err-503',
          slug: 'dac-nhan-tam',
          title: 'Đắc Nhân Tâm',
          digitalDetails: { pdfKey: testKey },
        }),
      },
    },
    undefined,
    undefined,
    failingStorage,
  );
  let statusSent = 0;
  let jsonSent = null;
  await booksService.streamPdf(
    'dac-nhan-tam',
    { headers: {} },
    {
      status(code) {
        statusSent = code;
        return this;
      },
      json(body) {
        jsonSent = body;
        return this;
      },
      setHeader() {},
    },
  );
  assert.strictEqual(statusSent, 503);
  assert.strictEqual(jsonSent.code, 'EBOOK_STORAGE_UNAVAILABLE');
  assert.strictEqual(jsonSent.diagnostic.errorCode, 'SignatureDoesNotMatch');
  assert.strictEqual(jsonSent.diagnostic.activeCandidate, 'cf:path');
  console.log('[PASS] Step 4: BooksService.streamPdf returned 503 EBOOK_STORAGE_UNAVAILABLE with safe diagnostic');

  // 5. Frontend PdfCanvasViewer retry UI check
  const viewerSrc = fs.readFileSync(
    path.join(ROOT, 'web', 'src', 'ui', 'components', 'reader', 'PdfCanvasViewer.tsx'),
    'utf8',
  );
  assert.ok(viewerSrc.includes('retryNonce'));
  assert.ok(viewerSrc.includes('Thử tải lại PDF'));
  assert.ok(viewerSrc.includes('errorIsRetryable'));
  console.log('[PASS] Step 5: PdfCanvasViewer.tsx retry UI contract verified');

  console.log('\nALL BUG-13 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\n[FAIL] BUG-13 E2E verification failed:', err);
  process.exit(1);
});
