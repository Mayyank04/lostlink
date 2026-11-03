#!/usr/bin/env tsx
// ==============================================================================
// LOSTLINK 2.0 — SUPER ADMIN CLI BOOTSTRAP COMMAND
// Secure, Idempotent Command Line Interface for Initial Platform Admin Authorization
// ==============================================================================

import { prisma } from '../src/lib/db';
import { UserRole, UserStatus } from '@prisma/client';

async function bootstrapSuperAdmin() {
  const args = process.argv.slice(2);
  let targetEmail = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      targetEmail = args[i + 1].trim().toLowerCase();
      break;
    }
    if (args[i].startsWith('--email=')) {
      targetEmail = args[i].split('=')[1].trim().toLowerCase();
      break;
    }
  }

  console.log(`\n=====================================================================`);
  console.log(`   LostLink 2.0 — Secure Super Admin Bootstrap CLI                   `);
  console.log(`=====================================================================\n`);

  if (!targetEmail) {
    console.error(`❌ ERROR: Missing required target email parameter.`);
    console.error(`\nUsage:`);
    console.error(`  npm run admin:bootstrap -- --email <verified-user-email>`);
    console.error(`\nExample:`);
    console.error(`  npm run admin:bootstrap -- --email admin@lostlink.org\n`);
    process.exit(1);
  }

  // 1. Query for the existing target user
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
    include: { memberships: { include: { college: true } } },
  });

  if (!user) {
    console.error(`❌ ERROR: No registered account found with email "${targetEmail}".`);
    console.error(`   Please register the account first through the application or seed data,`);
    console.error(`   then execute this bootstrap tool to authorize PLATFORM_ADMIN role.\n`);
    process.exit(1);
  }

  // 2. Check if user is already a platform administrator (Idempotent)
  if (user.role === UserRole.PLATFORM_ADMIN) {
    console.log(`ℹ️  User "${user.name}" (${user.email}) is ALREADY authorized as PLATFORM_ADMIN.`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Account ID: ${user.id}`);
    console.log(`\n✅ No changes required. System state is consistent.\n`);
    process.exit(0);
  }

  // 3. Promote user to PLATFORM_ADMIN and record immutable audit event
  const previousRole = user.role;
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        role: UserRole.PLATFORM_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'BOOTSTRAP_SUPER_ADMIN',
        resourceType: 'USER',
        resourceId: user.id,
        metadata: JSON.stringify({
          targetEmail,
          previousRole,
          newRole: UserRole.PLATFORM_ADMIN,
          invokedBy: 'CLI_BOOTSTRAP',
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return updated;
  });

  console.log(`🎉 SUCCESS: User successfully promoted to PLATFORM_ADMIN!`);
  console.log(`   User Name:    ${updatedUser.name}`);
  console.log(`   Email:        ${updatedUser.email}`);
  console.log(`   Account ID:   ${updatedUser.id}`);
  console.log(`   Previous Role: ${previousRole}`);
  console.log(`   New Role:     ${updatedUser.role}`);
  console.log(`   Status:       ${updatedUser.status}`);
  console.log(`\n🔐 An immutable audit log entry has been recorded in the database.`);
  console.log(`   You may now access the Super Admin Command Center at: /platform-admin\n`);
}

bootstrapSuperAdmin()
  .catch((err) => {
    console.error(`❌ Unexpected error during Super Admin bootstrap:`, err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

