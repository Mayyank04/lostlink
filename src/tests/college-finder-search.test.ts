import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as searchCollegesRoute } from '@/app/api/colleges/search/route';
import { GET as getLocationsRoute } from '@/app/api/colleges/locations/route';
import { POST as requestCollegeRoute } from '@/app/api/colleges/request/route';
import { PATCH as reviewApplicationRoute } from '@/app/api/platform-admin/applications/[id]/route';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth/session';
import { generateSlug } from '@/lib/utils/slug';
import { CollegeStatus, UserRole } from '@prisma/client';

describe('Advanced College Finder & Selection System (Phase L Test Suite)', () => {
  let platformAdminToken: string;
  let testCreatedCollegeIds: string[] = [];
  let testCreatedApplicationIds: string[] = [];

  beforeAll(async () => {
    const adminSession = await createSession('user-platform-admin');
    platformAdminToken = adminSession.token;

    // Clean up any leftovers from previous test runs
    await prisma.collegeAdminInvitation.deleteMany({ where: { email: 'vikram@snu.edu.in' } });
    await prisma.campusLocation.deleteMany({ where: { campus: { college: { slug: 'snu' } } } });
    await prisma.campus.deleteMany({ where: { college: { slug: 'snu' } } });
    await prisma.college.deleteMany({ where: { slug: 'snu' } });
    await prisma.collegeApplication.deleteMany({ where: { slug: 'snu' } });

    // Ensure sample Indian institutions exist for deterministic testing
    await prisma.college.upsert({
      where: { slug: 'iilm' },
      update: { country: 'India', state: 'Uttar Pradesh', city: 'Greater Noida', shortName: 'IILM', status: CollegeStatus.ACTIVE },
      create: {
        name: 'IILM University, Greater Noida',
        shortName: 'IILM',
        slug: 'iilm',
        emailDomains: ['iilm.edu'],
        country: 'India',
        state: 'Uttar Pradesh',
        city: 'Greater Noida',
        status: CollegeStatus.ACTIVE,
      },
    });

    await prisma.college.upsert({
      where: { slug: 'sharda-univ' },
      update: { country: 'India', state: 'Uttar Pradesh', city: 'Greater Noida', shortName: 'Sharda', status: CollegeStatus.ACTIVE },
      create: {
        name: 'Sharda University',
        shortName: 'Sharda',
        slug: 'sharda-univ',
        emailDomains: ['sharda.ac.in'],
        country: 'India',
        state: 'Uttar Pradesh',
        city: 'Greater Noida',
        status: CollegeStatus.ACTIVE,
      },
    });

    await prisma.college.upsert({
      where: { slug: 'galgotias-univ' },
      update: { country: 'India', state: 'Uttar Pradesh', city: 'Greater Noida', shortName: 'Galgotias', status: CollegeStatus.ACTIVE },
      create: {
        name: 'Galgotias University',
        shortName: 'Galgotias',
        slug: 'galgotias-univ',
        emailDomains: ['galgotiasuniversity.edu.in'],
        country: 'India',
        state: 'Uttar Pradesh',
        city: 'Greater Noida',
        status: CollegeStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    // Clean up any dynamic test colleges
    for (const id of testCreatedCollegeIds) {
      await prisma.campusLocation.deleteMany({ where: { campus: { collegeId: id } } });
      await prisma.campus.deleteMany({ where: { collegeId: id } });
      await prisma.auditLog.deleteMany({ where: { collegeId: id } });
      await prisma.college.delete({ where: { id } }).catch(() => {});
    }

    // Clean up any test applications
    for (const id of testCreatedApplicationIds) {
      await prisma.auditLog.deleteMany({ where: { resourceId: id } });
      await prisma.collegeApplication.delete({ where: { id } }).catch(() => {});
    }
  });

  // 1. Search by exact college name
  it('1. Searches by exact college name', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=Sharda%20University');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(1);
    expect(data.colleges[0].name).toContain('Sharda');
  });

  // 2. Search by partial college name
  it('2. Searches by partial college name ("Galgotias")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=Galgotias');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(1);
    expect(data.colleges.some((c: any) => c.name.includes('Galgotias'))).toBe(true);
  });

  // 3. Search by abbreviation (shortName)
  it('3. Searches by college abbreviation ("IILM")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=IILM');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(1);
    const found = data.colleges.find((c: any) => c.shortName === 'IILM');
    expect(found).toBeDefined();
    expect(found.slug).toBe('iilm');
  });

  // 4. Case-insensitive and whitespace-tolerant search
  it('4. Handles case-insensitivity and leading/trailing whitespace ("   iiLm   ")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=%20%20iiLm%20%20');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(1);
    expect(data.colleges.some((c: any) => c.shortName?.toLowerCase() === 'iilm')).toBe(true);
  });

  // 5. Search with no location selected (global)
  it('5. Performs global search across all locations when no location filter is active', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?limit=30');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(3);
    const countries = new Set(data.colleges.map((c: any) => c.country));
    expect(countries.size).toBeGreaterThanOrEqual(1);
  });

  // 6. Country filter
  it('6. Filters by Country ("India")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?country=India');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(2);
    for (const c of data.colleges) {
      expect(c.country.toLowerCase()).toBe('india');
    }
  });

  // 7. State filter
  it('7. Filters by State ("Uttar Pradesh")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?state=Uttar%20Pradesh');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(2);
    for (const c of data.colleges) {
      expect(c.state.toLowerCase()).toBe('uttar pradesh');
    }
  });

  // 8. City filter
  it('8. Filters by City ("Greater Noida")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?city=Greater%20Noida');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(2);
    for (const c of data.colleges) {
      expect(c.city.toLowerCase()).toBe('greater noida');
    }
  });

  // 9. Combined keyword and hierarchical location search
  it('9. Combines keyword and location filters ("University" in Greater Noida, UP, India)', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=University&country=India&state=Uttar%20Pradesh&city=Greater%20Noida');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.colleges.length).toBeGreaterThanOrEqual(2);
    for (const c of data.colleges) {
      expect(c.country.toLowerCase()).toBe('india');
      expect(c.city.toLowerCase()).toBe('greater noida');
    }
  });

  // 10. Hierarchical locations API
  it('10. Hierarchical locations endpoint dynamically filters states and cities by country', async () => {
    // 10a. Global locations
    const reqAll = new NextRequest('http://localhost:3000/api/colleges/locations');
    const resAll = await getLocationsRoute(reqAll);
    expect(resAll.status).toBe(200);
    const dataAll = await resAll.json();
    expect(dataAll.countries).toContain('India');

    // 10b. Country-scoped locations
    const reqIndia = new NextRequest('http://localhost:3000/api/colleges/locations?country=India');
    const resIndia = await getLocationsRoute(reqIndia);
    expect(resIndia.status).toBe(200);
    const dataIndia = await resIndia.json();
    expect(dataIndia.states).toContain('Uttar Pradesh');
    expect(dataIndia.cities).toContain('Greater Noida');
  });

  // 11. Empty search results
  it('11. Returns clean empty results structure when no colleges match query', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?q=NonExistentInstitutionXYZ999');
    const res = await searchCollegesRoute(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.colleges).toEqual([]);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(1);
    expect(data.pagination.hasNextPage).toBe(false);
  });

  // 12. Bounded pagination
  it('12. Respects bounded pagination (limit and page offsets)', async () => {
    const reqPage1 = new NextRequest('http://localhost:3000/api/colleges/search?page=1&limit=2');
    const resPage1 = await searchCollegesRoute(reqPage1);
    const dataPage1 = await resPage1.json();

    const reqPage2 = new NextRequest('http://localhost:3000/api/colleges/search?page=2&limit=2');
    const resPage2 = await searchCollegesRoute(reqPage2);
    const dataPage2 = await resPage2.json();

    expect(dataPage1.pagination.page).toBe(1);
    expect(dataPage1.pagination.limit).toBe(2);
    expect(dataPage2.pagination.page).toBe(2);

    if (dataPage1.pagination.total > 2) {
      expect(dataPage1.colleges[0].id).not.toBe(dataPage2.colleges[0].id);
    }
  });

  // 13. Excludes suspended or archived institutions
  it('13. Strictly excludes suspended and archived institutions from public search', async () => {
    const suspendedSlug = `suspended-univ-${Date.now()}`;
    const suspendedCol = await prisma.college.create({
      data: {
        name: 'Suspended University of Science',
        slug: suspendedSlug,
        city: 'Miami',
        state: 'Florida',
        country: 'United States',
        status: CollegeStatus.SUSPENDED,
      },
    });
    testCreatedCollegeIds.push(suspendedCol.id);

    const req = new NextRequest(`http://localhost:3000/api/colleges/search?q=${suspendedSlug}`);
    const res = await searchCollegesRoute(req);
    const data = await res.json();
    expect(data.colleges.find((c: any) => c.slug === suspendedSlug)).toBeUndefined();
  });

  // 14. Prevents data leakage
  it('14. Does not leak private admin secrets, passwords, or internal review notes', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/search?limit=5');
    const res = await searchCollegesRoute(req);
    const data = await res.json();
    for (const col of data.colleges) {
      expect(col.reviewNotes).toBeUndefined();
      expect(col.passwordHash).toBeUndefined();
      expect(col.contactPhone).toBeUndefined();
      expect(col.adminInvitations).toBeUndefined();
    }
  });

  // 15. Student college request submission (Phase H)
  it('15. Student can submit a request for an unlisted college ("Shiv Nadar University")', async () => {
    const req = new NextRequest('http://localhost:3000/api/colleges/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collegeName: 'Shiv Nadar University',
        shortName: 'SNU',
        country: 'India',
        state: 'Uttar Pradesh',
        city: 'Greater Noida',
        website: 'https://snu.edu.in',
        domain: 'snu.edu.in',
        applicantName: 'Vikram Singh',
        applicantEmail: 'vikram@snu.edu.in',
        notes: 'Main campus at Dadri Tehsil, Greater Noida',
      }),
    });

    const res = await requestCollegeRoute(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.application.collegeName).toBe('Shiv Nadar University');
    expect(data.application.status).toBe('PENDING');

    testCreatedApplicationIds.push(data.application.id);
  });

  // 16. Super Admin approval of student college request
  it('16. Super Admin reviews and approves college request, auto-provisioning college into database', async () => {
    const targetAppId = testCreatedApplicationIds[testCreatedApplicationIds.length - 1];
    expect(targetAppId).toBeDefined();

    const patchReq = new NextRequest(`http://localhost:3000/api/platform-admin/applications/${targetAppId}`, {
      method: 'PATCH',
      headers: {
        cookie: `lostlink_session=${platformAdminToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        action: 'APPROVE',
        reviewNotes: 'Verified accreditation and domain ownership via ministry registry.',
      }),
    });

    const patchRes = await reviewApplicationRoute(patchReq, { params: { id: targetAppId } });
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.college).toBeDefined();
    expect(patchData.college.name).toBe('Shiv Nadar University');
    expect(patchData.campus).toBeDefined();

    testCreatedCollegeIds.push(patchData.college.id);

    // Verify it now immediately appears in public search!
    const searchReq = new NextRequest('http://localhost:3000/api/colleges/search?q=Shiv%20Nadar');
    const searchRes = await searchCollegesRoute(searchReq);
    const searchData = await searchRes.json();
    const found = searchData.colleges.find((c: any) => c.slug === 'snu');
    expect(found).toBeDefined();
    expect(found.city).toBe('Greater Noida');
  });

  // 17. Slug generation utility
  it('17. generateSlug safely converts various complex names into clean URL slugs', () => {
    expect(generateSlug('IILM')).toBe('iilm');
    expect(generateSlug("St. Xavier's College - Mumbai")).toBe('st-xaviers-college-mumbai');
    expect(generateSlug('Indian Institute of Technology, Delhi (IIT-D)')).toBe('indian-institute-of-technology-delhi-iit-d');
  });
});
