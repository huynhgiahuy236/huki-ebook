import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(process.cwd(), process.argv[2] ?? '.env');

if (!existsSync(envPath)) {
  console.error(`Environment file not found: ${envPath}`);
  console.error('Copy .env.example to .env, then replace required placeholders.');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2].replace(/^(?:"(.*)"|'(.*)')$/, '$1$2').trim()]),
);

const required = [
  'API_GATEWAY_PORT',
  'IDENTITY_SERVICE_PORT',
  'BUSINESS_SERVICE_PORT',
  'COMMERCE_SERVICE_PORT',
  'SHIPPING_SERVICE_PORT',
  'COMMUNITY_SERVICE_PORT',
  'PROMOTION_SERVICE_PORT',
  'IDENTITY_DATABASE_URL',
  'BUSINESS_DATABASE_URL',
  'COMMERCE_DATABASE_URL',
  'SHIPPING_DATABASE_URL',
  'PROMOTION_DATABASE_URL',
  'MONGODB_URI',
  'REDIS_HOST',
  'REDIS_PORT',
  'RABBITMQ_URL',
  'JWT_SECRET',
  'CORS_ORIGIN',
];

const placeholder = /(your-|change-this|replace-with|placeholder|<.+>)/i;
const errors = [];

for (const name of required) {
  if (!env[name]) errors.push(`${name} is missing or blank`);
}

if (env.JWT_SECRET && (placeholder.test(env.JWT_SECRET) || env.JWT_SECRET.length < 32)) {
  errors.push('JWT_SECRET must be a non-placeholder value with at least 32 characters');
}

const ports = required
  .filter((name) => name.endsWith('_PORT'))
  .map((name) => [name, env[name]])
  .filter(([, value]) => value);
const duplicatePorts = ports.filter(([, value], index) =>
  ports.findIndex(([, candidate]) => candidate === value) !== index,
);
if (duplicatePorts.length) {
  errors.push(`Service ports must be unique: ${duplicatePorts.map(([name]) => name).join(', ')}`);
}

if (env.CORS_ORIGIN && !env.CORS_ORIGIN.split(',').map((value) => value.trim()).includes('http://localhost:3100')) {
  errors.push('CORS_ORIGIN must include the local web origin http://localhost:3100');
}

const legacyNames = [
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
];
const presentLegacyNames = legacyNames.filter((name) => name in env);

if (presentLegacyNames.length) {
  console.warn(`Deprecated variables can be removed: ${presentLegacyNames.join(', ')}`);
}

if (errors.length) {
  console.error('Environment validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Environment validation passed: ${envPath}`);
