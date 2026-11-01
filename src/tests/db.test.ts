import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { ItemReportType, ItemStatus, MembershipStatus, UserRole, UserStatus } from '@prisma/client';

describe('PostgreSQL Database & Prisma Constraints', () => {
  let testCollegeId: string;
  let testCampusId: string;

  beforeAll(async () => {
    // Ensure we can query the database
    const colleges = await prisma.college.findMany({ take: 1, include: { campuses: true } });
    expect(colleges.length).toBeGreaterThan(0);
    testCollegeId = colleges[0].id;
    testCampusId = colleges[0].campuses[0].id;
  });

  it('connects to PostgreSQL database and performs health query', async () => {
    const result = await prisma.$queryRaw<[{ result: number }]>`SELECT 1 as result`;
    expect(result[0].result).toBe(1);
  });

  it('enforces unique email constraint on User model', async () => {
    const uniqueEmail = `test.unique.${Date.now()}@apex.edu`;

    await prisma.user.create({
      data: {
        name: 'Constraint Tester 1',
        email: uniqueEmail,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    // Attempting to insert duplicate email must throw Prisma unique constraint error (P2002)
    await expect(
      prisma.user.create({
        data: {
          name: 'Constraint Tester 2',
          email: uniqueEmail,
          role: UserRole.STUDENT,
          status: UserStatus.ACTIVE,
        },
      })
    ).rejects.toThrow();

    // Clean up
    await prisma.user.delete({ where: { email: uniqueEmail } });
  });

  it('cascades deletion from User to Session and CollegeMembership', async () => {
    const tempEmail = `cascade.test.${Date.now()}@apex.edu`;

    const user = await prisma.user.create({
      data: {
        name: 'Cascade Tester',
        email: tempEmail,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        sessions: {
          create: {
            sessionToken: `token-${Date.now()}`,
            expiresAt: new Date(Date.now() + 3600000),
          },
        },
        memberships: {
          create: {
            collegeId: testCollegeId,
            status: MembershipStatus.VERIFIED,
          },
        },
      },
      include: { sessions: true, memberships: true },
    });

    expect(user.sessions.length).toBe(1);
    expect(user.memberships.length).toBe(1);

    // Delete user
    await prisma.user.delete({ where: { id: user.id } });

    // Verify session and membership were cascade-deleted
    const sessionCount = await prisma.session.count({ where: { userId: user.id } });
    const membershipCount = await prisma.collegeMembership.count({ where: { userId: user.id } });

    expect(sessionCount).toBe(0);
    expect(membershipCount).toBe(0);
  });

  it('stores and isolates private evidence linked to an item', async () => {
    const reportNumber = `LL-TEST-${Date.now()}`;
    const user = await prisma.user.findFirst();

    const item = await prisma.item.create({
      data: {
        reportNumber,
        reporterId: user!.id,
        collegeId: testCollegeId,
        campusId: testCampusId,
        type: ItemReportType.LOST,
        name: 'Private Evidence Test Laptop',
        category: 'electronics',
        color: 'Space Gray',
        description: 'Test item with secret serial proof',
        locationBuilding: 'Engineering Hall',
        occurredAt: new Date(),
        status: ItemStatus.OPEN,
        privateEvidence: {
          create: {
            encryptedEvidence: JSON.stringify({ serial: 'C02Z12345678', secretMark: 'Sticker behind fan' }),
          },
        },
      },
      include: {
        privateEvidence: true,
      },
    });

    expect(item.privateEvidence).toBeDefined();
    expect(item.privateEvidence?.encryptedEvidence).toContain('C02Z12345678');

    // Clean up
    await prisma.item.delete({ where: { id: item.id } });
  });
});

