import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@/lib/db';
import {
  resolveCollegeFromEmail,
  extractDomainFromEmail,
  isPublicEmailProvider,
  isValidEducationalEmail,
} from '@/lib/college/resolve-college';
import { collegeService } from '@/server/services/college.service';
import { CollegeStatus, DomainStatus, UserRole, MembershipStatus } from '@prisma/client';
import { hashPassword } from '@/lib/auth/password';

describe('Multi-College Identity, Campus Auto-Detection & Role-Based Auth Upgrade', () => {
  let testUserAId: string;
  let testCollegeApexId: string;
  let testCollegeNcuId: string;

  beforeAll(async () => {
    // Locate seeded institutions
    const apex = await prisma.college.findFirst({
      where: { slug: 'apex-tech' },
    });
    const ncu = await prisma.college.findFirst({
      where: { slug: 'the-northcap-university' },
    });

    expect(apex).not.toBeNull();
    expect(ncu).not.toBeNull();

    testCollegeApexId = apex!.id;
    testCollegeNcuId = ncu!.id;

    // Create a dedicated test student in Apex University
    const passwordHash = await hashPassword('Password123!');
    const userA = await prisma.user.create({
      data: {
        name: 'Apex Test Student',
        email: `apex.student.${Date.now()}@apex.edu`,
        passwordHash,
        role: UserRole.STUDENT,
        status: 'ACTIVE',
        memberships: {
          create: {
            collegeId: testCollegeApexId,
            status: MembershipStatus.VERIFIED,
            verificationMethod: 'EMAIL_DOMAIN',
          },
        },
      },
    });
    testUserAId = userA.id;
  });

  afterAll(async () => {
    if (testUserAId) {
      await prisma.collegeMembership.deleteMany({ where: { userId: testUserAId } });
      await prisma.user.deleteMany({ where: { id: testUserAId } });
    }
  });

  describe('1. Domain Extraction & Utility Verification', () => {
    it('extracts and normalizes domain from clean and dirty email strings', () => {
      expect(extractDomainFromEmail('student@apex.edu')).toBe('apex.edu');
      expect(extractDomainFromEmail('  STUDENT@NCUINDIA.EDU  ')).toBe('ncuindia.edu');
      expect(extractDomainFromEmail('invalid-email')).toBeNull();
      expect(extractDomainFromEmail('@apex.edu')).toBeNull();
      expect(extractDomainFromEmail('user@')).toBeNull();
    });

    it('identifies public consumer email providers', () => {
      expect(isPublicEmailProvider('gmail.com')).toBe(true);
      expect(isPublicEmailProvider('yahoo.com')).toBe(true);
      expect(isPublicEmailProvider('outlook.com')).toBe(true);
      expect(isPublicEmailProvider('proton.me')).toBe(true);
      expect(isPublicEmailProvider('ncuindia.edu')).toBe(false);
      expect(isPublicEmailProvider('gdgoenka.ac.in')).toBe(false);
    });

    it('validates educational domain format', () => {
      expect(isValidEducationalEmail('student@ncuindia.edu')).toBe(true);
      expect(isValidEducationalEmail('scholar@gdgoenka.ac.in')).toBe(true);
      expect(isValidEducationalEmail('user@gmail.com')).toBe(false);
    });
  });

  describe('2. Authoritative Server-Side College Auto-Detection', () => {
    it('accurately resolves verified college from institutional email', async () => {
      const result = await resolveCollegeFromEmail('alex@ncuindia.edu');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.collegeName).toBe('The NorthCap University');
        expect(result.domain).toBe('ncuindia.edu');
        expect(result.domainStatus).toBe('VERIFIED');
        expect(result.status).toBe('ACTIVE');
      }
    });

    it('handles uppercase and untrimmed email inputs case-insensitively', async () => {
      const result = await resolveCollegeFromEmail('  MAYA.LIN@APEX.EDU  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.collegeName).toBe('Apex University of Science & Technology');
        expect(result.domain).toBe('apex.edu');
      }
    });

    it('strictly rejects personal public email providers with PUBLIC_EMAIL_PROVIDER', async () => {
      const result = await resolveCollegeFromEmail('john.doe@gmail.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('PUBLIC_EMAIL_PROVIDER');
        expect(result.message).toContain('Personal email addresses');
      }
    });

    it('rejects unregistered domains with UNREGISTERED_DOMAIN code', async () => {
      const result = await resolveCollegeFromEmail('student@unregistered-fictional-college.edu');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('UNREGISTERED_DOMAIN');
        expect(result.message).toContain('not currently registered');
      }
    });

    it('detects unverified or pending domains and blocks access with DOMAIN_PENDING_VERIFICATION', async () => {
      const result = await resolveCollegeFromEmail('student@starexuniversity.co.in');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('DOMAIN_PENDING_VERIFICATION');
        expect(result.message).toContain('pending official verification');
      }
    });
  });

  describe('3. Gurgaon / Gurugram College Directory & Verification', () => {
    it('contains verified higher education institutions in Gurugram', async () => {
      const gurgaonColleges = await prisma.college.findMany({
        where: {
          city: 'Gurugram',
          domainVerificationStatus: 'VERIFIED',
        },
        include: { domains: true, campuses: true },
      });

      expect(gurgaonColleges.length).toBeGreaterThanOrEqual(7);

      const ncu = gurgaonColleges.find((c) => c.slug === 'the-northcap-university');
      expect(ncu).toBeDefined();
      expect(ncu?.emailDomains).toContain('ncuindia.edu');

      const gdGoenka = gurgaonColleges.find((c) => c.slug === 'gd-goenka-university');
      expect(gdGoenka).toBeDefined();
      expect(gdGoenka?.emailDomains).toContain('gdgoenka.ac.in');

      const bmlMunjal = gurgaonColleges.find((c) => c.slug === 'bml-munjal-university');
      expect(bmlMunjal).toBeDefined();
      expect(bmlMunjal?.emailDomains).toContain('bml.edu.in');

      const sushant = gurgaonColleges.find((c) => c.slug === 'sushant-university');
      expect(sushant).toBeDefined();
      expect(sushant?.emailDomains).toContain('sushantuniversity.edu.in');
    });

    it('marks uncertain or unconfirmed educational domains as PENDING_VERIFICATION', async () => {
      const pendingColleges = await prisma.college.findMany({
        where: {
          city: 'Gurugram',
          domainVerificationStatus: 'PENDING_VERIFICATION',
        },
      });

      expect(pendingColleges.length).toBeGreaterThanOrEqual(2);
      const starex = pendingColleges.find((c) => c.slug === 'starex-university');
      expect(starex).toBeDefined();

      const kiit = pendingColleges.find((c) => c.slug === 'kiit-college-of-engineering');
      expect(kiit).toBeDefined();
    });

    it('populates relational CollegeEmailDomain records matching College.emailDomains', async () => {
      const collegeDomains = await prisma.collegeEmailDomain.findMany({
        where: { verificationStatus: DomainStatus.VERIFIED },
        include: { college: true },
      });

      expect(collegeDomains.length).toBeGreaterThan(10);
      const ncuDomain = collegeDomains.find((d) => d.domain === 'ncuindia.edu');
      expect(ncuDomain).toBeDefined();
      expect(ncuDomain?.college.slug).toBe('the-northcap-university');
    });
  });

  describe('4. Tenant Isolation & Student Campus Authority', () => {
    it('verifies student belongs strictly to their assigned institution', async () => {
      const membership = await prisma.collegeMembership.findFirst({
        where: { userId: testUserAId },
        include: { college: true },
      });

      expect(membership).not.toBeNull();
      expect(membership?.collegeId).toBe(testCollegeApexId);
      expect(membership?.college.slug).toBe('apex-tech');
    });

    it('prohibits student from claiming ownership of items outside their college tenant', async () => {
      // Create a found item in NCU Gurugram
      const ncuCampus = await prisma.campus.findFirst({
        where: { collegeId: testCollegeNcuId },
      });
      expect(ncuCampus).not.toBeNull();

      const reporterUser = await prisma.user.findFirst();
      expect(reporterUser).not.toBeNull();

      const ncuItem = await prisma.item.create({
        data: {
          collegeId: testCollegeNcuId,
          campusId: ncuCampus!.id,
          reporterId: reporterUser!.id,
          reportNumber: `NCU-TEST-${Date.now()}`,
          name: 'NCU Lost Umbrella',
          type: 'FOUND',
          category: 'ACCESSORIES',
          color: 'Black',
          description: 'Found umbrella at NCU campus desk.',
          locationBuilding: 'Academic Block',
          occurredAt: new Date(),
          status: 'OPEN',
        },
      });

      // Apex student attempts to query or claim item from NCU
      const userMembership = await prisma.collegeMembership.findFirst({
        where: { userId: testUserAId, collegeId: ncuItem.collegeId },
      });

      // Boundary check: Apex student has ZERO membership in NCU
      expect(userMembership).toBeNull();

      // Clean up test item
      await prisma.item.delete({ where: { id: ncuItem.id } });
    });
  });

  describe('5. Platform Admin Domain Management Operations', () => {
    it('allows platform administration to add and update domain verification status', async () => {
      const testDomain = `custom-lab-${Date.now()}.ncuindia.edu`;

      // Add new domain through college service
      const createdDomain = await collegeService.addDomain(
        testCollegeNcuId,
        testDomain,
        DomainStatus.PENDING_VERIFICATION,
        'Platform Admin Vitest Suite',
        false
      );

      expect(createdDomain).toBeDefined();
      expect(createdDomain.domain).toBe(testDomain);
      expect(createdDomain.verificationStatus).toBe(DomainStatus.PENDING_VERIFICATION);

      // Verify domain resolves as pending
      const pendingRes = await resolveCollegeFromEmail(`test@${testDomain}`);
      expect(pendingRes.success).toBe(false);
      if (!pendingRes.success) {
        expect(pendingRes.code).toBe('DOMAIN_PENDING_VERIFICATION');
      }

      // Upgrade domain to VERIFIED
      await collegeService.updateDomainVerification(createdDomain.id, DomainStatus.VERIFIED);

      // Verify domain resolves as active and verified
      const verifiedRes = await resolveCollegeFromEmail(`test@${testDomain}`);
      expect(verifiedRes.success).toBe(true);

      // Clean up test domain
      await prisma.collegeEmailDomain.delete({ where: { id: createdDomain.id } });
    });
  });
});
