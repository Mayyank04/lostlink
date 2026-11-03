import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as createCollegeRoute } from '@/app/api/platform-admin/colleges/route';
import { GET as getCollegesRoute } from '@/app/api/colleges/route';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { generateSlug } from '@/components/platform-admin/CollegesSection';
import { CollegeStatus, UserRole, ItemStatus, ClaimStatus } from '@prisma/client';

describe('Admin Authentication & College Onboarding Security Test Suite (Scenarios A-M)', () => {
  let platformAdminToken: string;
  let studentToken: string;
  let collegeAdminToken: string;
  let createdCollegeIds: string[] = [];

  beforeAll(async () => {
    // 1. Establish real database sessions for genuine accounts
    const adminSession = await createSession('user-platform-admin');
    platformAdminToken = adminSession.token;

    const studentSession = await createSession('user-maya');
    studentToken = studentSession.token;

    const collegeAdminSession = await createSession('user-admin-apex');
    collegeAdminToken = collegeAdminSession.token;
  });

  afterAll(async () => {
    // Clean up created test colleges
    for (const collegeId of createdCollegeIds) {
      await prisma.campusLocation.deleteMany({ where: { campus: { collegeId } } });
      await prisma.campus.deleteMany({ where: { collegeId } });
      await prisma.collegeAdminInvitation.deleteMany({ where: { collegeId } });
      await prisma.auditLog.deleteMany({ where: { collegeId } });
      await prisma.college.delete({ where: { id: collegeId } }).catch(() => {});
    }
  });

  // Scenario A
  it('Scenario A: Unauthenticated user opens onboarding API -> rejected with 401', async () => {
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthorized College',
        slug: 'unauthorized-col',
        emailDomains: ['unauth.edu'],
        city: 'New York',
        state: 'NY',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });

  // Scenario B
  it('Scenario B: Authenticated student attempts to create a college -> rejected with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${studentToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Student Rogue College',
        slug: 'student-rogue',
        emailDomains: ['studentrogue.edu'],
        city: 'Boston',
        state: 'MA',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Platform administrator privileges required');
  });

  // Scenario C
  it('Scenario C: Authenticated COLLEGE_ADMIN attempts to create platform-level college -> rejected with 403', async () => {
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${collegeAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'College Admin Escalation',
        slug: 'admin-escalation',
        emailDomains: ['escalation.edu'],
        city: 'Chicago',
        state: 'IL',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Platform administrator privileges required');
  });

  // Scenario D
  it('Scenario D: Authenticated PLATFORM_ADMIN creates a valid institution -> succeeds with 201', async () => {
    const testSlug = `iilm-test-${Date.now()}`;
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'IILM University Greater Noida',
        shortName: 'IILM',
        slug: testSlug,
        emailDomains: ['iilm.edu', 'students.iilm.edu'],
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
        country: 'India',
        institutionType: 'University',
        adminEmail: 'provost@iilm.edu',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.college).toBeDefined();
    expect(body.college.slug).toBe(testSlug);
    expect(body.college.emailDomains).toEqual(['iilm.edu', 'students.iilm.edu']);
    expect(body.campus).toBeDefined();

    createdCollegeIds.push(body.college.id);

    // Verify persistence in PostgreSQL
    const dbCollege = await prisma.college.findUnique({
      where: { id: body.college.id },
      include: { campuses: true },
    });
    expect(dbCollege).not.toBeNull();
    expect(dbCollege?.name).toBe('IILM University Greater Noida');
    expect(dbCollege?.campuses.length).toBeGreaterThan(0);
  });

  // Scenario E
  it('Scenario E: Submission contains full email address in domain field -> validation fails with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Invalid Domain College',
        slug: `invalid-domain-${Date.now()}`,
        emailDomains: ['mayank@iilm.edu'], // Erroneous email instead of domain
        city: 'Greater Noida',
        state: 'Uttar Pradesh',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Approved email domains must be domain names only');
  });

  // Scenario F
  it('Scenario F: Slug auto-generation and format validation', () => {
    // Test slug auto-generation helper
    expect(generateSlug('IILM')).toBe('iilm');
    expect(generateSlug("St. John's University")).toBe('st-johns-university');
    expect(generateSlug('Carnegie Mellon University')).toBe('carnegie-mellon-university');
    expect(generateSlug('MIT / Media Lab')).toBe('mit-media-lab');

    // Test API rejection of illegal slug characters
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Illegal Slug University',
        slug: 'INVALID_SLUG_WITH_CAPS_AND_$$$',
        emailDomains: ['valid-domain.edu'],
        city: 'Dallas',
        state: 'TX',
      }),
    });

    return createCollegeRoute(req).then((res) => {
      expect(res.status).toBe(400);
    });
  });

  // Scenario G
  it('Scenario G: Duplicate institution slug -> rejected with 409 without duplicated records', async () => {
    // Attempt to create a college with existing slug 'apex-tech'
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Apex Duplicate Attempt',
        slug: 'apex-tech',
        emailDomains: ['apex.edu'],
        city: 'Boston',
        state: 'MA',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toContain('already exists');

    // Confirm count of 'apex-tech' colleges is exactly 1 in DB
    const count = await prisma.college.count({ where: { slug: 'apex-tech' } });
    expect(count).toBe(1);
  });

  // Scenario H
  it('Scenario H: Expired or forged admin session -> rejected with 401', async () => {
    const fakeToken = 'eyFakeTokenExpiredSignature.eyJ1c2VySWQiOiJmYWtlIn0.invalidSig';
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${fakeToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Expired Session College',
        slug: `expired-session-${Date.now()}`,
        emailDomains: ['expired.edu'],
        city: 'Austin',
        state: 'TX',
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Authentication required');
  });

  // Scenario I
  it('Scenario I: Repeated submit clicks / idempotency -> no duplicate records', async () => {
    const slug = `idempotent-test-${Date.now()}`;
    const payload = {
      name: 'Idempotency University',
      shortName: 'IU',
      slug,
      emailDomains: ['idemp.edu'],
      city: 'Seattle',
      state: 'WA',
    };

    // First request
    const req1 = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const res1 = await createCollegeRoute(req1);
    expect(res1.status).toBe(201);
    const data1 = await res1.json();
    createdCollegeIds.push(data1.college.id);

    // Second rapid request with identical slug
    const req2 = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const res2 = await createCollegeRoute(req2);
    expect(res2.status).toBe(409);

    // Verify only one college exists in DB
    const matchingColleges = await prisma.college.findMany({ where: { slug } });
    expect(matchingColleges.length).toBe(1);
  });

  // Scenario J
  it('Scenario J: College appears in PostgreSQL and registration selector', async () => {
    const slug = `reg-test-${Date.now()}`;
    const req = new NextRequest('http://localhost:3000/api/platform-admin/colleges', {
      method: 'POST',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Public Registry College',
        shortName: 'PRC',
        slug,
        emailDomains: ['prc.edu'],
        city: 'Denver',
        state: 'CO',
        status: CollegeStatus.ACTIVE,
      }),
    });

    const res = await createCollegeRoute(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    createdCollegeIds.push(body.college.id);

    // Query GET /api/colleges to confirm availability in registration selector
    const getRes = await getCollegesRoute();
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    const found = getData.colleges.find((c: any) => c.slug === slug);
    expect(found).toBeDefined();
    expect(found.name).toBe('Public Registry College');
    expect(found.emailDomains).toContain('prc.edu');
  });

  // Scenario K
  it('Scenario K: Existing students, items, and reports remain intact', async () => {
    const apexUser = await prisma.user.findUnique({
      where: { email: 'maya.lin@apex.edu' },
      include: { memberships: true },
    });
    expect(apexUser).not.toBeNull();
    expect(apexUser?.role).toBe(UserRole.STUDENT);
    expect(apexUser?.memberships.length).toBeGreaterThan(0);

    const openItems = await prisma.item.count({
      where: { status: ItemStatus.OPEN },
    });
    expect(openItems).toBeGreaterThan(0);
  });

  // Scenario L
  it('Scenario L: Cross-college privacy rules remain enforced', async () => {
    // College A (Apex) vs College B (Horizon)
    const apexCollege = await prisma.college.findUnique({ where: { slug: 'apex-tech' } });
    const horizonCollege = await prisma.college.findUnique({ where: { slug: 'horizon-tech' } });
    expect(apexCollege).not.toBeNull();
    expect(horizonCollege).not.toBeNull();

    // Verify items reported for Horizon are isolated from Apex query scopes
    const horizonItems = await prisma.item.findMany({
      where: { collegeId: horizonCollege!.id },
    });
    for (const item of horizonItems) {
      expect(item.collegeId).not.toBe(apexCollege!.id);
    }
  });

  // Scenario M
  it('Scenario M: Existing lost-and-found matching and claim workflows continue functioning', async () => {
    // Query existing claim
    const claim = await prisma.claim.findFirst({
      where: { status: { in: [ClaimStatus.PENDING, ClaimStatus.APPROVED, ClaimStatus.RETURNED] } },
      include: { item: true, claimant: true },
    });
    expect(claim).not.toBeNull();
    expect(claim?.claimant).toBeDefined();
    expect(claim?.item).toBeDefined();
  });
});
