#!/usr/bin/env tsx
// ==============================================================================
// LOSTLINK 2.0 — DEMO STUDENT PROVISIONING SCRIPT
// Automated, reproducible non-production provisioning for student testing
// ==============================================================================

import { prisma } from '../src/lib/db';
import { UserRole, UserStatus, MembershipStatus } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

async function provisionDemoStudent() {
  console.log(`\n=====================================================================`);
  console.log(`   LostLink 2.0 — Automated Demo Student Provisioning CLI            `);
  console.log(`=====================================================================\n`);

  // Production Safety Guard
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_PROVISION !== 'true') {
    console.error(`❌ FATAL: Demo student provisioning is strictly prohibited in production.`);
    console.error(`   Set ALLOW_DEMO_PROVISION=true only in isolated staging or test environments.\n`);
    process.exit(1);
  }

  let email = process.env.DEMO_STUDENT_EMAIL?.trim().toLowerCase();
  let password = process.env.DEMO_STUDENT_PASSWORD;
  let generatedPassword = false;

  // Support CLI arguments if env vars are not set
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      email = args[i + 1].trim().toLowerCase();
    }
    if (args[i] === '--password' && args[i + 1]) {
      password = args[i + 1];
    }
  }

  if (!email) {
    console.error(`❌ ERROR: No demo email supplied.`);
    console.error(`   Please set DEMO_STUDENT_EMAIL in your environment or pass --email <email>`);
    console.error(`\nUsage:`);
    console.error(`   DEMO_STUDENT_EMAIL="student@iilm.edu" DEMO_STUDENT_PASSWORD="SecretPassword123!" npm run demo:provision\n`);
    process.exit(1);
  }

  if (!password) {
    // Generate secure random password and display securely in console
    password = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, 'x') + '!9aA';
    generatedPassword = true;
  }

  // Extract domain and match with an approved university
  const domain = email.split('@')[1];
  if (!domain) {
    console.error(`❌ ERROR: Invalid email format "${email}".`);
    process.exit(1);
  }

  const college = await prisma.college.findFirst({
    where: {
      status: 'ACTIVE',
      emailDomains: { has: domain },
    },
  });

  if (!college) {
    console.error(`❌ ERROR: Domain "@${domain}" is not approved for any active institution in the database.`);
    console.error(`   Please use an email matching an approved university domain (e.g. iilm.edu, apex.edu, sharda.ac.in).\n`);
    process.exit(1);
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
  });

  // Idempotently upsert demo user
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name: 'Demo Student',
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isDemoUser: true,
      emailVerified: new Date(),
    },
    create: {
      name: 'Demo Student',
      email,
      passwordHash,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      isDemoUser: true,
      emailVerified: new Date(),
      department: 'Computer Science & Technology',
      gradYear: 2027,
    },
  });

  // Ensure verified college membership
  await prisma.collegeMembership.upsert({
    where: {
      userId_collegeId: {
        userId: user.id,
        collegeId: college.id,
      },
    },
    update: {
      status: MembershipStatus.VERIFIED,
      verificationMethod: 'DEMO_PROVISION',
      verifiedAt: new Date(),
    },
    create: {
      userId: user.id,
      collegeId: college.id,
      status: MembershipStatus.VERIFIED,
      verificationMethod: 'DEMO_PROVISION',
      verifiedAt: new Date(),
      studentIdentifier: `DEMO-${Date.now().toString().slice(-4)}`,
    },
  });

  // Record audit log
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      collegeId: college.id,
      action: 'PROVISION_DEMO_STUDENT',
      resourceType: 'USER',
      resourceId: user.id,
      metadata: JSON.stringify({
        email,
        college: college.name,
        isDemoUser: true,
        timestamp: new Date().toISOString(),
      }),
    },
  });

  console.log(`🎉 SUCCESS: Demo Student Provisioned Successfully!`);
  console.log(`   Account ID:    ${user.id}`);
  console.log(`   Student Name:  ${user.name}`);
  console.log(`   Email:         ${user.email}`);
  console.log(`   University:    ${college.name} (${college.city}, ${college.state})`);
  console.log(`   Role:          ${user.role}`);
  console.log(`   Verified:      YES (Institutional membership active)`);
  console.log(`   isDemoUser:    true`);
  if (generatedPassword) {
    console.log(`   Generated Pwd: ${password}`);
  }
  console.log(`\n🔐 Credentials are ready for login at /auth/login\n`);
}

provisionDemoStudent()
  .catch((e) => {
    console.error('Fatal error provisioning demo student:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
