const { spawnSync } = require('child_process');

console.log('================================================================');
console.log('       MASTER VERIFICATION RUNNER: ALL 13 LOCAL BUGS           ');
console.log('================================================================\n');

const phases = [
  { name: 'PHASE 1 (Bugs 1 -> 3: Hydration, Logos, Anti-Fraud)', script: 'scripts/verify_phase_1_fixes.js' },
  { name: 'PHASE 2 (Bugs 4 -> 8: Stores, Routing, Discounts, Admin)', script: 'scripts/verify_phase_2_fixes.js' },
  { name: 'PHASE 3 (Bugs 9 -> 13: Role Login, DRM 5-Device, Phone, Map, VAT)', script: 'scripts/verify_phase_3_fixes.js' },
];

let allOk = true;

for (const p of phases) {
  console.log(`\n================== EXECUTING ${p.name} ==================`);
  const res = spawnSync('node', [p.script], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_PATH: 'platform/node_modules' }
  });
  if (res.status !== 0) {
    console.error(`\nFAILED IN ${p.name}`);
    allOk = false;
    break;
  }
}

if (!allOk) {
  console.error('\n>>> MASTER VERIFICATION FAILED! <<<');
  process.exitCode = 1;
} else {
  console.log('\n================================================================');
  console.log('>>> 100% SUCCESS: ALL 13 BUGS VERIFIED AND PASSED E2E! <<<');
  console.log('================================================================\n');
  process.exitCode = 0;
}

