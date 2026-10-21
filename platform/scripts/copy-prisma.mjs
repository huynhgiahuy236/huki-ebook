import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const services = [
  'identity-service',
  'business-service',
  'commerce-service',
  'shipping-service',
  'promotion-service',
  'analytics-service',
];

for (const service of services) {
  const src = resolve(process.cwd(), `apps/${service}/prisma/generated`);
  const dest = resolve(process.cwd(), `dist/out-tsc/${service}/apps/${service}/prisma/generated`);

  if (existsSync(src)) {
    mkdirSync(resolve(process.cwd(), `dist/out-tsc/${service}/apps/${service}/prisma`), { recursive: true });
    try {
      cpSync(src, dest, { recursive: true, force: true });
      console.log(`Copied Prisma generated client for ${service}`);
    } catch (err) {
      console.log(`Prisma client for ${service} already active or locked (${err.code}), retaining current copy.`);
    }
  }
}
