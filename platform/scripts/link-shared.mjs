import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sharedDist = resolve(process.cwd(), 'dist/libs/shared');
const targetDir = resolve(process.cwd(), 'node_modules/@huki/shared');

if (existsSync(sharedDist)) {
  mkdirSync(targetDir, { recursive: true });
  try {
    cpSync(sharedDist, targetDir, { recursive: true, force: true });
    const pkgJson = {
      name: '@huki/shared',
      version: '1.0.0',
      main: 'index.js',
      exports: {
        '.': './index.js',
        './decorators': './decorators/index.js',
        './decorators/*': './decorators/*',
        './guards': './guards/index.js',
        './guards/*': './guards/*',
        './filters': './filters/index.js',
        './filters/*': './filters/*',
        './interceptors': './interceptors/index.js',
        './interceptors/*': './interceptors/*',
        './errors': './errors/index.js',
        './errors/*': './errors/*',
        './events': './events/index.js',
        './events/*': './events/*',
        './config': './config/index.js',
        './config/*': './config/*',
        './email': './email/index.js',
        './email/*': './email/*',
        './enums': './enums/index.js',
        './enums/*': './enums/*',
        './audit': './audit/index.js',
        './audit/*': './audit/*',
        './monitoring': './monitoring/index.js',
        './monitoring/*': './monitoring/*',
        './tracing': './tracing/index.js',
        './tracing/*': './tracing/*',
        './swagger': './swagger/index.js',
        './swagger/*': './swagger/*',
        './*': './*.js'
      }
    };
    writeFileSync(resolve(targetDir, 'package.json'), JSON.stringify(pkgJson, null, 2));
    console.log('Successfully linked @huki/shared into node_modules/@huki/shared');
  } catch (err) {
    console.log(`@huki/shared already linked or active (${err.code}).`);
  }
}
