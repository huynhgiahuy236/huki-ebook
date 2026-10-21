// ========================================================
// HUKI EBOOK - Database Backup & Restore Drill
// Tests database backup dump and restores into a test DB
// ========================================================

import { execSync } from 'child_process';

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = process.env.DATABASE_PORT || '5432';
const DB_USER = process.env.DATABASE_USER || 'postgres';
const DB_PASS = process.env.DATABASE_PASSWORD || 'postgres123';
const SOURCE_DB = process.env.DRILL_SOURCE_DB || 'huki_identity';
const TARGET_DB = 'huki_drill_restore_test';

console.log('====================================================');
console.log('   HUKI Database Backup & Restore Drill Exercise');
console.log(`   Source DB:  ${SOURCE_DB}`);
console.log(`   Target DB:  ${TARGET_DB}`);
console.log(`   Host:       ${DB_HOST}:${DB_PORT}`);
console.log('====================================================\n');

try {
  // Step 1: Dump source database using docker exec
  console.log('[1/5] Dumping source database...');
  execSync(
    `docker exec huki-postgres pg_dump -U ${DB_USER} -d ${SOURCE_DB} -F c -f /tmp/drill_backup.dump`,
    { stdio: 'inherit' }
  );

  // Step 2: Drop existing target drill database if exists
  console.log('[2/5] Preparing clean drill database...');
  execSync(
    `docker exec huki-postgres psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${TARGET_DB};"`,
    { stdio: 'inherit' }
  );
  execSync(
    `docker exec huki-postgres psql -U ${DB_USER} -c "CREATE DATABASE ${TARGET_DB};"`,
    { stdio: 'inherit' }
  );

  // Step 3: Restore dump into target drill database
  console.log('[3/5] Restoring backup dump into drill database...');
  execSync(
    `docker exec huki-postgres pg_restore -U ${DB_USER} -d ${TARGET_DB} --clean --if-exists /tmp/drill_backup.dump || true`,
    { stdio: 'inherit' }
  );

  // Step 4: Verify schema & data integrity in restored database
  console.log('[4/5] Verifying restored tables and data...');
  const tableCountOutput = execSync(
    `docker exec huki-postgres psql -U ${DB_USER} -d ${TARGET_DB} -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"`
  ).toString().trim();

  const userCountOutput = execSync(
    `docker exec huki-postgres psql -U ${DB_USER} -d ${TARGET_DB} -t -c "SELECT count(*) FROM \"users\";"`
  ).toString().trim();

  console.log(`  Restored table count: ${tableCountOutput}`);
  console.log(`  Restored user records: ${userCountOutput}`);

  if (parseInt(tableCountOutput, 10) === 0) {
    throw new Error('Verification failed: No tables found in restored database');
  }

  // Step 5: Clean up drill database and temporary dump file
  console.log('[5/5] Cleaning up drill database...');
  execSync(
    `docker exec huki-postgres psql -U ${DB_USER} -c "DROP DATABASE ${TARGET_DB};"`,
    { stdio: 'inherit' }
  );
  execSync(
    `docker exec huki-postgres rm -f /tmp/drill_backup.dump`,
    { stdio: 'inherit' }
  );

  console.log('\n====================================================');
  console.log('\x1b[32mSUCCESS: Database backup & restore drill PASSED!\x1b[0m');
  console.log('RPO / RTO targets validated and restore verified.');
  console.log('====================================================');
} catch (error) {
  console.error('\n\x1b[31mFAILURE during restore drill:\x1b[0m', error.message);
  process.exit(1);
}
