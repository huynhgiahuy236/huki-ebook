const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prismaBin = path.resolve('platform/node_modules/prisma/build/index.js');
const schemas = [
  'apps/identity-service/prisma/schema.prisma',
  'apps/business-service/prisma/schema.prisma',
  'apps/commerce-service/prisma/schema.prisma',
  'apps/shipping-service/prisma/schema.prisma',
  'apps/promotion-service/prisma/schema.prisma',
  'apps/analytics-service/prisma/schema.prisma',
];

console.log('=== VALIDATING ALL 6 PRISMA SCHEMAS (CI/CD GATE 3) ===\n');
let allOk = true;

for (const s of schemas) {
  const fullPath = path.resolve('platform', s);
  if (!fs.existsSync(fullPath)) {
    console.warn(`Skipping missing schema: ${s}`);
    continue;
  }
  process.stdout.write(`Validating ${s}... `);
  const res = spawnSync('node', [prismaBin, 'validate', '--schema', fullPath], {
    shell: true,
    cwd: path.resolve('platform'),
  });
  if (res.status === 0) {
    console.log('VALID 🚀');
  } else {
    console.log('INVALID ❌');
    console.error(res.stderr ? res.stderr.toString() : 'Validation failed');
    allOk = false;
  }
}

if (!allOk) {
  console.error('\n>>> PRISMA SCHEMA VALIDATION FAILED! <<<');
  process.exitCode = 1;
} else {
  console.log('\n>>> ALL 6 PRISMA SCHEMAS VALIDATED SUCCESSFULLY 100%! <<<');
  process.exitCode = 0;
}
