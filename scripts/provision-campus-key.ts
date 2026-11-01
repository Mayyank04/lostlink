#!/usr/bin/env tsx
// ==============================================================================
// LOSTLINK 2.0 — CAMPUS WORKER KEY PROVISIONING CLI
// Usage: npx tsx scripts/provision-campus-key.ts <workerId> <collegeId> [label]
// Example: npx tsx scripts/provision-campus-key.ts worker-apex-edge-02 apex-institute "Secondary Edge Worker"
// ==============================================================================

import { prisma } from '../src/lib/db';
import { generateCampusApiKey } from '../src/lib/hybrid/auth';

async function main() {
  const args = process.argv.slice(2);
  const workerId = args[0] || 'worker-apex-edge-01';
  const collegeId = args[1] || 'college-apex';
  const label = args[2] || 'Campus Edge Primary Worker';

  console.log(`=======================================================`);
  console.log(`  LostLink 2.0 — Provision Campus Worker Machine Key  `);
  console.log(`=======================================================`);
  console.log(`Worker ID:   ${workerId}`);
  console.log(`College ID:  ${collegeId}`);
  console.log(`Label:       ${label}`);

  // Verify college exists
  const college = await prisma.college.findUnique({
    where: { id: collegeId },
  });

  if (!college) {
    console.error(`[-] ERROR: College '${collegeId}' does not exist in database!`);
    process.exit(1);
  }

  // Generate plain API key
  const { key: plainKey, hash: apiKeyHash, prefix: keyPrefix } = generateCampusApiKey();

  // Upsert into CampusWorkerKey
  const record = await prisma.campusWorkerKey.upsert({
    where: { workerId },
    update: {
      apiKeyHash,
      keyPrefix,
      collegeId,
      name: label,
      status: 'ACTIVE',
    },
    create: {
      workerId,
      apiKeyHash,
      keyPrefix,
      collegeId,
      name: label,
      status: 'ACTIVE',
    },
  });

  console.log(`\n[+] Key provisioned successfully in database!`);
  console.log(`Record ID:   ${record.id}`);
  console.log(`Status:      ${record.status}`);
  console.log(`\n-------------------------------------------------------`);
  console.log(`CAMPUS WORKER MACHINE API KEY (Save immediately, cannot be retrieved again):`);
  console.log(`\n  ${plainKey}\n`);
  console.log(`-------------------------------------------------------`);
  console.log(`Environment Variable for Campus Agent:`);
  console.log(`  CAMPUS_WORKER_KEY="${plainKey}"`);
  console.log(`  CAMPUS_WORKER_ID="${workerId}"`);
  console.log(`  CAMPUS_COLLEGE_ID="${collegeId}"`);
  console.log(`=======================================================\n`);
}

main()
  .catch((e) => {
    console.error('Fatal error provisioning key:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
