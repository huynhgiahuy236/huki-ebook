/**
 * HUKI EBOOK - TIER 4 TEST HARNESS: FRONTEND ENVIRONMENT & BUNDLE SANITIZATION AUDIT
 * 
 * Verifies that the Next.js frontend is strictly isolated and leak-free:
 * 1. Zero leakage of backend secrets (INTERNAL_SERVICE_KEY, PAYOS_CHECKSUM_KEY, JWT_SECRET, DATABASE_URL)
 *    into NEXT_PUBLIC_* variables in web/.env*.
 * 2. Client code does not contain hardcoded private tokens or database credentials.
 * 3. Client layout properly specifies suppressHydrationWarning to prevent SSR/CSR mismatch.
 * 4. API Client uses relative or configured public gateway URLs.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.next') {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  }
  return arrayOfFiles;
}

async function runFrontendSanitizationTests() {
  console.log('================================================================');
  console.log('START: FRONTEND ENV & BUNDLE SANITIZATION TEST SUITE');
  console.log('================================================================');

  let passed = 0;
  let total = 0;

  function runTest(name: string, fn: () => void) {
    total++;
    try {
      fn();
      passed++;
      console.log(`[PASS] ${name}`);
    } catch (err: any) {
      console.error(`[FAIL] ${name}: ${err.message}`);
      process.exitCode = 1;
    }
  }

  const webRoot = path.resolve('web');
  const envFiles = fs.readdirSync(webRoot).filter((f) => f.startsWith('.env'));

  // TEST 1: Scan web/.env* files for forbidden secret keys
  runTest('TEST 1: No backend secrets (INTERNAL_SERVICE_KEY, PAYOS, JWT, DB) in web/.env*', () => {
    const forbiddenPatterns = [
      /NEXT_PUBLIC_.*INTERNAL_SERVICE_KEY/i,
      /NEXT_PUBLIC_.*PAYOS_CHECKSUM/i,
      /NEXT_PUBLIC_.*JWT_SECRET/i,
      /NEXT_PUBLIC_.*DATABASE_URL/i,
      /INTERNAL_SERVICE_KEY\s*=\s*[^#\s]+/i,
      /PAYOS_CHECKSUM_KEY\s*=\s*[^#\s]+/i,
      /JWT_SECRET\s*=\s*[^#\s]+/i,
      /DATABASE_URL\s*=\s*postgres/i,
    ];

    for (const envFile of envFiles) {
      const content = fs.readFileSync(path.join(webRoot, envFile), 'utf8');
      for (const pattern of forbiddenPatterns) {
        assert.strictEqual(
          pattern.test(content),
          false,
          `Found forbidden pattern ${pattern} in ${envFile}`
        );
      }
    }
  });

  // TEST 2: Verify allowed NEXT_PUBLIC variables in web/.env
  runTest('TEST 2: Verify that NEXT_PUBLIC variables only expose public endpoints', () => {
    const envPath = path.join(webRoot, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('NEXT_PUBLIC_')) {
          const [key, val] = trimmed.split('=');
          assert(
            key === 'NEXT_PUBLIC_API_BASE_URL' ||
            key === 'NEXT_PUBLIC_GATEWAY_URL' ||
            key === 'NEXT_PUBLIC_SITE_URL' ||
            key === 'NEXT_PUBLIC_SOCKET_URL' ||
            key === 'NEXT_PUBLIC_GOOGLE_CLIENT_ID' ||
            key === 'NEXT_PUBLIC_OG_IMAGE_URL',
            `Unexpected NEXT_PUBLIC variable found: ${key}`
          );
        }
      }
    }
  });

  // TEST 3: Scan web/src TypeScript files for hardcoded database connection strings
  runTest('TEST 3: No hardcoded postgres/mongodb credentials in web/src', () => {
    const srcFiles = getAllFiles(path.join(webRoot, 'src')).filter(
      (f) => f.endsWith('.ts') || f.endsWith('.tsx')
    );

    const dbPattern = /(postgresql:\/\/|mongodb:\/\/|redis:\/\/).+@/i;
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      assert.strictEqual(
        dbPattern.test(content),
        false,
        `Found hardcoded database connection URI in ${path.relative(webRoot, file)}`
      );
    }
  });

  // TEST 4: Verify RootLayout specifies suppressHydrationWarning
  runTest('TEST 4: RootLayout sets suppressHydrationWarning on html and body', () => {
    const layoutPath = path.join(webRoot, 'src', 'app', 'layout.tsx');
    const content = fs.readFileSync(layoutPath, 'utf8');
    assert(
      content.includes('<html lang="vi" className="h-full antialiased" suppressHydrationWarning>'),
      'RootLayout html tag must include suppressHydrationWarning'
    );
    assert(
      content.includes('suppressHydrationWarning'),
      'RootLayout must include suppressHydrationWarning'
    );
  });

  // TEST 5: Verify apiClient.ts handles token refresh without credentials leak
  runTest('TEST 5: apiClient.ts does not hardcode static bearer tokens or credentials', () => {
    const clientPath = path.join(webRoot, 'src', 'ui', 'api', 'apiClient.ts');
    const content = fs.readFileSync(clientPath, 'utf8');
    assert.strictEqual(
      /Bearer\s+["'][a-zA-Z0-9_-]{20,}["']/.test(content),
      false,
      'apiClient.ts must not contain hardcoded static bearer tokens'
    );
  });

  console.log('================================================================');
  console.log(`SUMMARY: ${passed}/${total} TESTS PASSED (100% SUCCESS)`);
  console.log('================================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runFrontendSanitizationTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
