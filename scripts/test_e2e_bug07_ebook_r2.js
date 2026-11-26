'use strict';

/**
 * E2E Verification Script: BUG-07 (Ebook Reader + Cloudflare R2 Storage & Stream Contract)
 *
 * Tests real runtime behavior against:
 * 1. Compiled R2EbookStorage initialized with CLOUDFLARE_R2_* vs R2_* env formats (from platform/.env)
 * 2. Real Cloudflare R2 HeadObject + GetObject (%PDF- magic bytes) for `ebooks/dac-nhan-tam.pdf`
 *    and `ebooks/vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua.pdf`
 * 3. Compiled commerce configuration factory mapping CLOUDFLARE_R2_* & R2_*
 * 4. Compiled BooksService.streamPdf error classification (503 EBOOK_STORAGE_UNAVAILABLE vs 404 NO_PDF_AVAILABLE)
 * 5. Compiled API Gateway route-classification (HEAD / GET public ebook routes)
 * 6. Reader frontend fallback guard (web/src/app/reader/page.tsx) & docker-compose.uat.yml env forwarding
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const Module = require('module');

const ROOT = path.resolve(__dirname, '..');
const PLATFORM_DIST = path.join(ROOT, 'platform', 'dist');
const PLATFORM_NODE_MODULES = path.join(ROOT, 'platform', 'node_modules');

// Allow requiring compiled platform dist modules from scripts/ without modifying project files
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
      return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : process.env[key];
    },
  };
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
  console.log('=== E2E VERIFICATION: BUG-07 (EBOOK READER + CLOUDFLARE R2) ===\n');

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
  const configFactory = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'commerce-service',
      'apps',
      'commerce-service',
      'config',
      'configuration.js',
    ),
  ).default;
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
  const { classifyRoute } = require(
    path.join(
      PLATFORM_DIST,
      'out-tsc',
      'api-gateway',
      'apps',
      'api-gateway',
      'src',
      'modules',
      'proxy',
      'route-classification.js',
    ),
  );

  // 1. Multi-env configuration normalization (CLOUDFLARE_R2_* vs R2_*)
  const savedEnv = { ...process.env };
  try {
    delete process.env.CLOUDFLARE_R2_ENDPOINT;
    delete process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    delete process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    delete process.env.CLOUDFLARE_R2_BUCKET;
    process.env.R2_ACCOUNT_ID = envMap.R2_ACCOUNT_ID || '';
    process.env.R2_ACCESS_KEY_ID = envMap.R2_ACCESS_KEY_ID || '';
    process.env.R2_SECRET_ACCESS_KEY = envMap.R2_SECRET_ACCESS_KEY || '';
    process.env.R2_BUCKET_NAME = envMap.R2_BUCKET_NAME || 'huki-ebooks';
    delete process.env.R2_ENDPOINT;

    const cfgFromR2 = configFactory();
    assert(
      cfgFromR2.storage.r2.endpoint.includes('.r2.cloudflarestorage.com'),
      'configuration.ts must synthesize R2 endpoint from R2_ACCOUNT_ID when CLOUDFLARE_R2_ENDPOINT is absent',
    );
    assert.strictEqual(cfgFromR2.storage.r2.bucket, process.env.R2_BUCKET_NAME);

    // 2. Real R2 HeadObject + GetObject using R2_* credentials via compiled R2EbookStorage
    if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ACCOUNT_ID) {
      const r2Storage = new R2EbookStorage(makeConfigService({}));
      assert.strictEqual(r2Storage.hasR2Config, true, 'R2EbookStorage must report configured using R2_* env vars');

      const keysToVerify = [
        'ebooks/dac-nhan-tam.pdf',
        'ebooks/vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua.pdf',
      ];
      for (const key of keysToVerify) {
        const exists = await r2Storage.exists(key);
        assert.strictEqual(exists, true, `Expected real R2 object to exist: ${key}`);
      }

      const streamRes = await r2Storage.getStream('ebooks/dac-nhan-tam.pdf');
      const header = await readStreamHead(streamRes.stream, 5);
      assert.strictEqual(
        header.toString('ascii'),
        '%PDF-',
        `Expected real R2 object stream to start with %PDF-, got ${JSON.stringify(header.toString('ascii'))}`,
      );
      console.log('✓ 1. Real Cloudflare R2 HeadObject + GetObject (%PDF-) passed via R2_* fallback');

      // Also verify CLOUDFLARE_R2_* env precedence works
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      process.env.CLOUDFLARE_R2_ENDPOINT = envMap.CLOUDFLARE_R2_ENDPOINT || `https://${envMap.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
      process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = envMap.CLOUDFLARE_R2_ACCESS_KEY_ID || envMap.R2_ACCESS_KEY_ID;
      process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = envMap.CLOUDFLARE_R2_SECRET_ACCESS_KEY || envMap.R2_SECRET_ACCESS_KEY;
      process.env.CLOUDFLARE_R2_BUCKET = envMap.CLOUDFLARE_R2_BUCKET || envMap.R2_BUCKET_NAME || 'huki-ebooks';

      const cfStorage = new R2EbookStorage(makeConfigService({}));
      const missingExists = await cfStorage.exists('ebooks/__non_existent_probe_key__.pdf');
      assert.strictEqual(missingExists, false, 'Non-existent R2 key must cleanly return false (404)');
      const foundViaCf = await cfStorage.exists('ebooks/vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua.pdf');
      assert.strictEqual(foundViaCf, true, 'Expected real R2 object to exist via CLOUDFLARE_R2_* vars');
      console.log('✓ 2. Real Cloudflare R2 HeadObject passed via CLOUDFLARE_R2_* env vars');
    } else {
      console.log('! Skipped live R2 network check (no R2 credentials in platform/.env)');
    }
  } finally {
    process.env = savedEnv;
  }

  // 3. BooksService.streamPdf must throw/respond 503 EBOOK_STORAGE_UNAVAILABLE on transient R2 error
  const bookRecord = {
    id: 'book-timeout-1',
    slug: 'vi-giam-doc-mot-phut-va-xay-dung-nhom-lam-viec-hieu-qua',
    title: 'Vị Giám Đốc Một Phút',
    status: 'PUBLISHED',
    digitalDetails: {
      pdfKey: 'stores/s1/books/b1/pdf-1.pdf',
      previewPdfKey: null,
    },
  };
  const mockPrisma = {
    book: {
      findFirst: async () => bookRecord,
      findUnique: async () => bookRecord,
    },
  };
  const transientR2 = {
    hasR2Config: true,
    getStream: async () => {
      const err = new Error('Socket timeout connecting R2');
      err.name = 'TimeoutError';
      throw err;
    },
  };
  const booksService = new BooksService(
    mockPrisma,
    { assertStoreNotSuspended: async () => {} },
    { issueWatermarkTicket: async () => ({}) },
    transientR2,
  );
  let resStatus = null;
  let resBody = null;
  const mockReq = { headers: {} };
  const mockRes = {
    setHeader() {},
    status(code) {
      resStatus = code;
      return this;
    },
    json(body) {
      resBody = body;
      return this;
    },
    send(body) {
      resBody = body;
      return this;
    },
  };
  await booksService.streamPdf('book-timeout-1', mockReq, mockRes);
  assert.strictEqual(resStatus, 503, `Expected HTTP 503 on R2 transient failure, got ${resStatus}`);
  assert.strictEqual(resBody && resBody.code, 'EBOOK_STORAGE_UNAVAILABLE');
  console.log('✓ 3. BooksService.streamPdf returns 503 EBOOK_STORAGE_UNAVAILABLE on storage failure (not 404)');

  // 4. API Gateway route classification allows both GET and HEAD on public /books/*/pdf routes
  const getClass = classifyRoute('GET', '/api/v1/books/dac-nhan-tam/pdf');
  const headClass = classifyRoute('HEAD', '/api/v1/books/dac-nhan-tam/pdf');
  const getCheck = classifyRoute('GET', '/api/v1/books/dac-nhan-tam/pdf/check');
  assert.strictEqual(getClass, 'PUBLIC', 'GET /books/:id/pdf should classify PUBLIC');
  assert.strictEqual(headClass, 'PUBLIC', 'HEAD /books/:id/pdf should classify PUBLIC');
  assert.strictEqual(getCheck, 'PUBLIC', 'GET /books/:id/pdf/check should classify PUBLIC');
  console.log('✓ 4. API Gateway route classification (GET & HEAD public PDF routes) passed');

  // 5. Frontend reader & docker-compose.uat.yml wiring checks
  const readerPage = fs.readFileSync(path.join(ROOT, 'web', 'src', 'app', 'reader', 'page.tsx'), 'utf8');
  const composeUat = fs.readFileSync(path.join(ROOT, 'docker-compose.uat.yml'), 'utf8');
  assert(
    readerPage.includes('hasSourceFile') && readerPage.includes('hasPreviewFile') && !readerPage.includes('!isUuid(bookId)'),
    'web/src/app/reader/page.tsx must not short-circuit when hasSourceFile or hasPreviewFile is true',
  );
  assert(
    composeUat.includes('CLOUDFLARE_R2_ENDPOINT') && composeUat.includes('R2_BUCKET_NAME'),
    'docker-compose.uat.yml must forward both CLOUDFLARE_R2_* and R2_* env variables to commerce-service-uat',
  );
  console.log('✓ 5. Reader fallback guard & docker-compose.uat.yml env forwarding passed');

  console.log('\nALL BUG-07 E2E CHECKS PASSED.');
}

run().catch((err) => {
  console.error('\nBUG-07 E2E FAILED:', err);
  process.exitCode = 1;
});
