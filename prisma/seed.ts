import { PrismaClient, UserRole, UserStatus, CollegeStatus, MembershipStatus, ItemReportType, ItemStatus, ClaimStatus } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LostLink 2.0 Database Seeding...');

  // 1. Clean existing records in correct dependency order
  await prisma.matchingJob.deleteMany();
  await prisma.campusWorkerKey.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.claim.deleteMany();
  await prisma.match.deleteMany();
  await prisma.privateItemEvidence.deleteMany();
  await prisma.itemImage.deleteMany();
  await prisma.item.deleteMany();
  await prisma.session.deleteMany();
  await prisma.collegeMembership.deleteMany();
  await prisma.campusLocation.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.college.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned existing database tables.');

  // 2. Seed Colleges
  const apexCollege = await prisma.college.create({
    data: {
      id: 'college-apex',
      name: 'Apex University of Science & Technology',
      slug: 'apex-tech',
      emailDomains: ['apex.edu'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Palo Alto',
      state: 'California',
      country: 'United States',
      primaryColor: '#0F766E',
      status: CollegeStatus.ACTIVE,
    },
  });

  const horizonCollege = await prisma.college.create({
    data: {
      id: 'college-horizon',
      name: 'Horizon Institute of Technology',
      slug: 'horizon-tech',
      emailDomains: ['horizon.edu'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Cambridge',
      state: 'Massachusetts',
      country: 'United States',
      primaryColor: '#2563EB',
      status: CollegeStatus.ACTIVE,
    },
  });

  const pacificCollege = await prisma.college.create({
    data: {
      id: 'college-pacific',
      name: 'Pacific Coast State University',
      slug: 'pcsu',
      emailDomains: ['pcsu.edu'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Seattle',
      state: 'Washington',
      country: 'United States',
      primaryColor: '#0F172A',
      status: CollegeStatus.ACTIVE,
    },
  });

  console.log('🏛️  Seeded 3 Colleges.');

  // 3. Seed Campuses
  const apexNorth = await prisma.campus.create({
    data: {
      id: 'apex-north',
      collegeId: apexCollege.id,
      name: 'North Campus (STEM & Engineering Quad)',
      code: 'APX-N',
      addressLabel: '1200 Innovation Way, Palo Alto, CA 94304',
      lostFoundDeskRoom: 'Student Union Rm 104 (Lost & Found Helpdesk)',
      operatingHours: 'Mon - Fri: 8:00 AM - 6:00 PM',
      contactEmail: 'north-desk@apex.edu',
    },
  });

  const apexSouth = await prisma.campus.create({
    data: {
      id: 'apex-south',
      collegeId: apexCollege.id,
      name: 'South Campus (Health & Medical Sciences)',
      code: 'APX-S',
      addressLabel: '450 University Blvd, Palo Alto, CA 94306',
      lostFoundDeskRoom: 'BioMedical Building Desk B1',
      operatingHours: 'Mon - Fri: 9:00 AM - 5:00 PM',
      contactEmail: 'south-desk@apex.edu',
    },
  });

  const horizonMain = await prisma.campus.create({
    data: {
      id: 'horizon-main',
      collegeId: horizonCollege.id,
      name: 'Main Innovation Campus',
      code: 'HRZ-MAIN',
      addressLabel: '77 Cyber Way, Cambridge, MA 02139',
      lostFoundDeskRoom: 'Campus Safety & Dispatch, Building 10',
      operatingHours: '24/7 Campus Security Desk',
      contactEmail: 'dispatch@horizon.edu',
    },
  });

  const pcsuOcean = await prisma.campus.create({
    data: {
      id: 'pcsu-ocean',
      collegeId: pacificCollege.id,
      name: 'Oceanview Main Campus',
      code: 'PCSU-OCN',
      addressLabel: '1410 NE Campus Parkway, Seattle, WA 98195',
      lostFoundDeskRoom: 'HUB Lost & Found Desk Rm 111',
      operatingHours: 'Mon - Fri: 8:30 AM - 5:30 PM',
      contactEmail: 'hubdesk@pcsu.edu',
    },
  });

  console.log('📍 Seeded Campuses.');

  // 4. Seed Campus Locations
  const locTuringLib = await prisma.campusLocation.create({
    data: {
      id: 'apx-n-lib',
      campusId: apexNorth.id,
      name: 'Alan Turing Memorial Library',
      building: 'Alan Turing Memorial Library',
      floorLabel: '2nd Floor Study Commons',
      locationType: 'library',
      hasDesk: true,
    },
  });

  const locEngHall = await prisma.campusLocation.create({
    data: {
      id: 'apx-n-eng',
      campusId: apexNorth.id,
      name: 'Engineering Hall Lab Complex',
      building: 'Engineering Hall',
      floorLabel: 'Lab 302',
      locationType: 'building',
      hasDesk: false,
    },
  });

  const locDiningHall = await prisma.campusLocation.create({
    data: {
      id: 'apx-n-canteen',
      campusId: apexNorth.id,
      name: 'Commons Dining Hall',
      building: 'Commons Dining Hall',
      floorLabel: 'South Seating Wing',
      locationType: 'canteen',
      hasDesk: false,
    },
  });

  const locStudentUnion = await prisma.campusLocation.create({
    data: {
      id: 'apx-n-union',
      campusId: apexNorth.id,
      name: 'Main Student Union',
      building: 'Main Student Union',
      floorLabel: '1st Floor Atrium',
      locationType: 'office',
      hasDesk: true,
    },
  });

  const locGym = await prisma.campusLocation.create({
    data: {
      id: 'apx-n-gym',
      campusId: apexNorth.id,
      name: 'Recreation & Aquatic Center',
      building: 'Recreation & Aquatic Center',
      floorLabel: 'Locker Wing West',
      locationType: 'sports_complex',
      hasDesk: true,
    },
  });

  console.log('🏢 Seeded Campus Facilities & Locations.');

  // 5. Seed Users with Argon2id Password Hashing
  const defaultPasswordHash = await argon2.hash('Password123!', {
    type: argon2.argon2id,
  });

  const maya = await prisma.user.create({
    data: {
      id: 'user-maya',
      name: 'Maya Lin',
      email: 'maya.lin@apex.edu',
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Computer Science & AI',
      gradYear: 2027,
      phone: '+1 (555) 412-8920',
    },
  });

  const jordan = await prisma.user.create({
    data: {
      id: 'user-jordan',
      name: 'Jordan Hayes',
      email: 'j.hayes@apex.edu',
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Mechanical Engineering',
      gradYear: 2026,
      phone: '+1 (555) 390-1122',
    },
  });

  const marcus = await prisma.user.create({
    data: {
      id: 'user-admin-apex',
      name: 'Officer Marcus Vance',
      email: 'mvance@apex.edu',
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      role: UserRole.COLLEGE_ADMIN,
      status: UserStatus.ACTIVE,
      department: 'Campus Safety & Property Custody',
      phone: '+1 (555) 234-5678',
    },
  });

  const evelyn = await prisma.user.create({
    data: {
      id: 'user-platform-admin',
      name: 'Dr. Evelyn Reed',
      email: 'ereed@lostlink.org',
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      role: UserRole.PLATFORM_ADMIN,
      status: UserStatus.ACTIVE,
      department: 'Platform Governance & University Relations',
      phone: '+1 (555) 999-0001',
    },
  });

  console.log('👤 Seeded Users (Argon2id secured, password: Password123!).');

  // 6. Seed Memberships
  await prisma.collegeMembership.createMany({
    data: [
      {
        userId: maya.id,
        collegeId: apexCollege.id,
        studentIdentifier: 'APX-2027-4921',
        verificationMethod: 'EMAIL_DOMAIN',
        status: MembershipStatus.VERIFIED,
      },
      {
        userId: jordan.id,
        collegeId: apexCollege.id,
        studentIdentifier: 'APX-2026-3108',
        verificationMethod: 'EMAIL_DOMAIN',
        status: MembershipStatus.VERIFIED,
      },
      {
        userId: marcus.id,
        collegeId: apexCollege.id,
        studentIdentifier: 'STAFF-VANCE-04',
        verificationMethod: 'STAFF_APPOINTMENT',
        status: MembershipStatus.VERIFIED,
      },
      {
        userId: evelyn.id,
        collegeId: apexCollege.id,
        studentIdentifier: 'SUPER-REED-01',
        verificationMethod: 'PLATFORM_GOVERNANCE',
        status: MembershipStatus.VERIFIED,
      },
    ],
  });

  console.log('🎫 Seeded College Memberships.');

  // 7. Seed Items & Private Evidence
  const macbookLost = await prisma.item.create({
    data: {
      id: 'rep-lost-macbook',
      reportNumber: 'LL-2026-8812',
      reporterId: maya.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locTuringLib.id,
      locationBuilding: 'Alan Turing Memorial Library',
      locationSpecifics: '2nd Floor Quiet Study Pod #14',
      type: ItemReportType.LOST,
      name: 'Apple MacBook Pro 14" Space Gray',
      category: 'electronics',
      brand: 'Apple',
      color: 'Space Gray',
      secondaryColor: 'Black',
      description: 'Left in Alan Turing Memorial Library 2nd floor study carrels. Contains research notes on Cloud Computing and robotics.',
      occurredAt: new Date('2026-10-28T16:15:00Z'),
      status: ItemStatus.POTENTIAL_MATCH,
      viewsCount: 64,
      images: {
        create: [
          {
            objectKey: 'items/macbook-lost.jpg',
            url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 420000,
            visibility: 'PUBLIC',
          },
        ],
      },
      privateEvidence: {
        create: {
          encryptedEvidence: JSON.stringify({
            uniqueIdentifiers: 'Sticker of Kubernetes sailboat on right palm rest, tiny chip on lower left aluminum hinge',
            serialNumberSnippet: '...89F2',
            privateNotes: 'Lock screen user Maya Lin with wallpaper of Yosemite mountains',
          }),
        },
      },
    },
  });

  const macbookFound = await prisma.item.create({
    data: {
      id: 'rep-found-macbook',
      reportNumber: 'FD-2026-3021',
      reporterId: jordan.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locTuringLib.id,
      locationBuilding: 'Alan Turing Memorial Library',
      locationSpecifics: '2nd Floor Quiet Study Area',
      type: ItemReportType.FOUND,
      name: 'MacBook Pro Laptop with Stickers',
      category: 'electronics',
      brand: 'Apple',
      color: 'Space Gray',
      description: 'Found plugged into power outlet in Turing Library study area. Securely handed to library staff desk for safe keeping.',
      occurredAt: new Date('2026-10-28T18:00:00Z'),
      status: ItemStatus.CLAIM_PENDING,
      depositedWithOffice: true,
      officeLocationNotes: 'Safely deposited at Turing Library Front Circulation Desk',
      viewsCount: 42,
      images: {
        create: [
          {
            objectKey: 'items/macbook-found.jpg',
            url: 'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 390000,
            visibility: 'PUBLIC',
          },
        ],
      },
    },
  });

  const headphonesLost = await prisma.item.create({
    data: {
      id: 'rep-lost-headphones',
      reportNumber: 'LL-2026-7731',
      reporterId: maya.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locDiningHall.id,
      locationBuilding: 'Commons Dining Hall',
      locationSpecifics: 'South window booth seating',
      type: ItemReportType.LOST,
      name: 'Sony WH-1000XM5 Wireless Headphones (Midnight Blue)',
      category: 'electronics',
      brand: 'Sony',
      color: 'Midnight Blue',
      description: 'Lost in hard zip protective case with auxiliary cable inside. Might have fallen out near Commons Dining Hall booths.',
      occurredAt: new Date('2026-10-29T13:00:00Z'),
      status: ItemStatus.OPEN,
      viewsCount: 29,
      images: {
        create: [
          {
            objectKey: 'items/headphones-lost.jpg',
            url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 280000,
            visibility: 'PUBLIC',
          },
        ],
      },
      privateEvidence: {
        create: {
          encryptedEvidence: JSON.stringify({
            uniqueIdentifiers: 'Initials "ML" lightly written in silver sharpie inside headband cushion',
            serialNumberSnippet: '...1049',
          }),
        },
      },
    },
  });

  const headphonesFound = await prisma.item.create({
    data: {
      id: 'rep-found-headphones',
      reportNumber: 'FD-2026-1940',
      reporterId: jordan.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locDiningHall.id,
      locationBuilding: 'Commons Dining Hall',
      locationSpecifics: 'Table near salad bar',
      type: ItemReportType.FOUND,
      name: 'Over-Ear Sony Noise Cancelling Headphones',
      category: 'electronics',
      brand: 'Sony',
      color: 'Dark Blue',
      description: 'Found left on dining table during lunch rush. Kept in custody ready to return to confirmed owner.',
      occurredAt: new Date('2026-10-29T13:45:00Z'),
      status: ItemStatus.OPEN,
      viewsCount: 18,
      images: {
        create: [
          {
            objectKey: 'items/headphones-found.jpg',
            url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 310000,
            visibility: 'PUBLIC',
          },
        ],
      },
    },
  });

  const carKeyFound = await prisma.item.create({
    data: {
      id: 'rep-found-keys',
      reportNumber: 'FD-2026-5501',
      reporterId: marcus.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locStudentUnion.id,
      locationBuilding: 'Main Student Union',
      locationSpecifics: 'Found on concrete steps leading to courtyard',
      type: ItemReportType.FOUND,
      name: 'Toyota Car Key with Apex Tech Lanyard',
      category: 'keys',
      brand: 'Toyota',
      color: 'Black',
      secondaryColor: 'Teal',
      description: 'Set of 3 keys including Toyota electronic fob and teal Apex University alumni lanyard. Turned in to campus safety.',
      occurredAt: new Date('2026-10-27T09:30:00Z'),
      status: ItemStatus.OPEN,
      depositedWithOffice: true,
      officeLocationNotes: 'Student Union Rm 104 Custody Safe #3',
      viewsCount: 51,
      images: {
        create: [
          {
            objectKey: 'items/toyota-keys.jpg',
            url: 'https://images.unsplash.com/photo-1582139329536-e7284fece509?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 250000,
            visibility: 'PUBLIC',
          },
        ],
      },
    },
  });

  const tumblerReturned = await prisma.item.create({
    data: {
      id: 'rep-returned-tumbler',
      reportNumber: 'FD-2026-0045',
      reporterId: jordan.id,
      collegeId: apexCollege.id,
      campusId: apexNorth.id,
      locationId: locEngHall.id,
      locationBuilding: 'Engineering Hall Lab Complex',
      type: ItemReportType.FOUND,
      name: 'Hydro Flask 32oz Wide Mouth (Pacific Blue)',
      category: 'water_bottles',
      brand: 'Hydro Flask',
      color: 'Pacific Blue',
      description: 'Stainless steel insulated bottle with silicone boot on bottom. Verified and returned to student.',
      occurredAt: new Date('2026-10-20T12:00:00Z'),
      status: ItemStatus.RETURNED,
      viewsCount: 88,
      images: {
        create: [
          {
            objectKey: 'items/hydroflask.jpg',
            url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800&auto=format&fit=crop&q=80',
            contentType: 'image/jpeg',
            fileSize: 310000,
            visibility: 'PUBLIC',
          },
        ],
      },
    },
  });

  console.log('📦 Seeded Real Items with Images and Private Evidence.');

  // 8. Seed Deterministic Match Record
  await prisma.match.create({
    data: {
      id: 'match-macbook-pair',
      lostItemId: macbookLost.id,
      foundItemId: macbookFound.id,
      score: 94,
      explanation: JSON.stringify({
        category: 'Both classified under electronics (25/25)',
        name: 'Strong title keyword alignment: MacBook Pro (24/25)',
        color: 'Both Space Gray (15/15)',
        brand: 'Both Apple (10/10)',
        location: 'Same building: Alan Turing Memorial Library (15/15)',
        time: 'Found 1.75 hours after reported loss (10/10)',
      }),
      status: 'SUGGESTED',
    },
  });

  // 9. Seed Claim with Audit Timeline
  await prisma.claim.create({
    data: {
      id: 'claim-macbook-1',
      referenceNumber: 'CLM-2026-4419',
      itemId: macbookFound.id,
      claimantId: maya.id,
      privateEvidenceReference: JSON.stringify([
        {
          questionId: 'q1',
          question: 'What distinctive stickers or physical marks are on the item?',
          answer: 'Kubernetes sailboat sticker on right palm rest, tiny chip on lower left hinge.',
        },
        {
          questionId: 'q2',
          question: 'What is the device lock screen wallpaper or username?',
          answer: 'Username is Maya Lin and lock screen is Yosemite landscape.',
        },
        {
          questionId: 'q3',
          question: 'Provide serial number snippet or purchase invoice.',
          answer: 'Serial number ends in ...89F2, bought via Apple Education store.',
        },
      ]),
      additionalProofNotes: 'Can demonstrate biometric Touch ID fingerprint unlock in person.',
      status: ClaimStatus.UNDER_REVIEW,
      handoverCode: '749218',
      handoverLocation: 'Alan Turing Library Front Circulation Desk',
      timeline: JSON.stringify([
        {
          id: 'tl-1',
          timestamp: '2026-10-28T19:30:00Z',
          actorName: 'Maya Lin',
          actorRole: 'claimant',
          action: 'Claim request submitted with zero-knowledge verification answers',
        },
        {
          id: 'tl-2',
          timestamp: '2026-10-29T09:15:00Z',
          actorName: 'Jordan Hayes',
          actorRole: 'finder',
          action: 'Finder confirmed sticker description matches item in library custody',
        },
        {
          id: 'tl-3',
          timestamp: '2026-10-29T11:00:00Z',
          actorName: 'Officer Marcus Vance',
          actorRole: 'campus_admin',
          action: 'Campus Safety scheduled secure in-person return at Turing Library Desk',
        },
      ]),
    },
  });

  // 10. Seed Notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: maya.id,
        type: 'match_found',
        title: 'High-confidence Match Found! (94%)',
        message: 'A found item "MacBook Pro Laptop with Stickers" in Turing Library closely matches your lost report LL-2026-8812.',
        linkUrl: '/matches',
        isRead: false,
        resourceId: macbookFound.id,
      },
      {
        userId: maya.id,
        type: 'claim_approved',
        title: 'Claim Verified & Handover Ready',
        message: 'Your claim CLM-2026-4419 has been verified. Safe handover is ready at Alan Turing Library Desk.',
        linkUrl: '/claims/claim-macbook-1',
        isRead: false,
        resourceId: 'claim-macbook-1',
      },
      {
        userId: maya.id,
        type: 'system_update',
        title: 'Welcome to LostLink 2.0',
        message: 'Your Apex University email domain @apex.edu is verified with full multi-campus protection.',
        linkUrl: '/profile',
        isRead: true,
      },
    ],
  });

  // 11. Seed Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: maya.id,
        collegeId: apexCollege.id,
        action: 'CREATE_REPORT',
        resourceType: 'ITEM',
        resourceId: macbookLost.id,
        metadata: JSON.stringify({ reportNumber: macbookLost.reportNumber, type: 'LOST' }),
      },
      {
        actorId: jordan.id,
        collegeId: apexCollege.id,
        action: 'CREATE_REPORT',
        resourceType: 'ITEM',
        resourceId: macbookFound.id,
        metadata: JSON.stringify({ reportNumber: macbookFound.reportNumber, type: 'FOUND' }),
      },
      {
        actorId: maya.id,
        collegeId: apexCollege.id,
        action: 'SUBMIT_CLAIM',
        resourceType: 'CLAIM',
        resourceId: 'claim-macbook-1',
        metadata: JSON.stringify({ referenceNumber: 'CLM-2026-4419' }),
      },
    ],
  });

  // 8. Seed Campus Worker Machine Keys for Phase 5 Hybrid-Cloud Architecture
  await prisma.campusWorkerKey.createMany({
    data: [
      {
        workerId: 'worker-apex-edge-01',
        collegeId: apexCollege.id,
        name: 'Apex University Lab Edge Node',
        apiKeyHash: hashApiKey('ll_camp_live_apex_edge_secret_key_2026'),
        keyPrefix: 'll_camp_live_apex_',
        status: 'ACTIVE',
        lastHeartbeatAt: new Date(),
        lastIpAddress: '127.0.0.1',
      },
      {
        workerId: 'worker-global-fallback-01',
        collegeId: null, // Global access
        name: 'Public Cloud Fallback Worker Daemon',
        apiKeyHash: hashApiKey('ll_camp_live_global_fallback_key_2026'),
        keyPrefix: 'll_camp_live_glob_',
        status: 'ACTIVE',
        lastHeartbeatAt: new Date(),
        lastIpAddress: '127.0.0.1',
      },
    ],
  });

  console.log('🔑 Seeded Campus Worker Machine Keys for Hybrid Architecture.');
  console.log('✅ LostLink 2.0 Database Seeding Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

