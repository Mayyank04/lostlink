import { PrismaClient, UserRole, UserStatus, CollegeStatus, DomainStatus, MembershipStatus, ItemReportType, ItemStatus, ClaimStatus } from '@prisma/client';
import argon2 from 'argon2';
import crypto from 'crypto';

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key.trim()).digest('hex');
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LostLink 2.0 Database Seeding...');

  // PRODUCTION SAFETY GUARD: Prevent accidental wiping of production database
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DESTRUCTIVE_SEED !== 'true') {
    throw new Error(
      'FATAL: Destructive database seeding is strictly prohibited in production environments. Set ALLOW_DESTRUCTIVE_SEED=true to override for isolated test suites.'
    );
  }

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
  await prisma.collegeEmailDomain.deleteMany();
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
      domainVerificationStatus: 'VERIFIED',
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
      domainVerificationStatus: 'VERIFIED',
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
      domainVerificationStatus: 'VERIFIED',
    },
  });

  // Greater Noida Regional Cluster (Gautam Buddha Nagar, Uttar Pradesh, India)
  const iilmUniversity = await prisma.college.create({
    data: {
      id: 'college-iilm',
      name: 'IILM University',
      shortName: 'IILM',
      slug: 'iilm-university',
      emailDomains: ['iilm.edu'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#800000',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://iilm.edu',
      address: '16 Knowledge Park II, Greater Noida, Gautam Buddha Nagar, Uttar Pradesh 201306',
      contactEmail: 'admissions.gn@iilm.edu',
      contactPhone: '+91-120-232-0000',
      domainMetadata: 'Verified via official university domain registry (iilm.edu) and campus IT policy',
    },
  });

  const galgotiasUniversity = await prisma.college.create({
    data: {
      id: 'college-galgotias',
      name: 'Galgotias University',
      shortName: 'Galgotias',
      slug: 'galgotias-university',
      emailDomains: ['galgotiasuniversity.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#003366',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.galgotiasuniversity.edu.in',
      address: 'Plot No. 2, Sector 17-A, Yamuna Expressway, Greater Noida, Gautam Buddha Nagar, UP 203201',
      contactEmail: 'admissions@galgotiasuniversity.edu.in',
      contactPhone: '+91-120-437-0000',
      domainMetadata: 'Verified via institutional student portal and domain registry',
    },
  });

  const shardaUniversity = await prisma.college.create({
    data: {
      id: 'college-sharda',
      name: 'Sharda University',
      shortName: 'Sharda',
      slug: 'sharda-university',
      emailDomains: ['sharda.ac.in', 'ug.sharda.ac.in', 'pg.sharda.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#B22222',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.sharda.ac.in',
      address: 'Plot No. 32-34, Knowledge Park III, Greater Noida, Gautam Buddha Nagar, UP 201310',
      contactEmail: 'admission@sharda.ac.in',
      contactPhone: '+91-120-457-0000',
      domainMetadata: 'Verified official domain registry including constituent Sharda School of Business Studies',
    },
  });

  const bennettUniversity = await prisma.college.create({
    data: {
      id: 'college-bennett',
      name: 'Bennett University',
      shortName: 'Bennett',
      slug: 'bennett-university',
      emailDomains: ['bennett.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#002B49',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.bennett.edu.in',
      address: 'Plot Nos 8-11, TechZone II, Greater Noida, Gautam Buddha Nagar, UP 201310',
      contactEmail: 'info@bennett.edu.in',
      contactPhone: '+91-120-719-9300',
      domainMetadata: 'Verified via Times Group Bennett University IT infrastructure',
    },
  });

  const niuUniversity = await prisma.college.create({
    data: {
      id: 'college-niu',
      name: 'Noida International University',
      shortName: 'NIU',
      slug: 'niu',
      emailDomains: ['niu.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#1A365D',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://niu.edu.in',
      address: 'Plot 1, Sector 17-A, Yamuna Expressway, Greater Noida, Gautam Buddha Nagar, UP 201308',
      contactEmail: 'info@niu.edu.in',
      contactPhone: '+91-120-486-2200',
      domainMetadata: 'Verified official domain registry for NIU students and faculty',
    },
  });

  const gbuUniversity = await prisma.college.create({
    data: {
      id: 'college-gbu',
      name: 'Gautam Buddha University',
      shortName: 'GBU',
      slug: 'gbu',
      emailDomains: ['gbu.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#7A1C1C',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'State University',
      website: 'https://www.gbu.ac.in',
      address: 'Yamuna Expressway, Greater Noida, Gautam Buddha Nagar, UP 201312',
      contactEmail: 'admissions@gbu.ac.in',
      contactPhone: '+91-120-234-4200',
      domainMetadata: 'Verified via Uttar Pradesh State University official domain registry',
    },
  });

  const glBajajCollege = await prisma.college.create({
    data: {
      id: 'college-gl-bajaj',
      name: 'G.L. Bajaj Institute of Technology and Management',
      shortName: 'GL Bajaj',
      slug: 'gl-bajaj',
      emailDomains: ['glbitm.ac.in', 'glbitm.org'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#1E3A8A',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Engineering & Management Institute',
      website: 'https://www.glbitm.org',
      address: 'Plot No. 2, Knowledge Park III, Greater Noida, Gautam Buddha Nagar, UP 201306',
      contactEmail: 'info@glbitm.org',
      contactPhone: '+91-120-232-3818',
      domainMetadata: 'Verified via AKTU affiliated institute student email portal',
    },
  });

  const gniotCollege = await prisma.college.create({
    data: {
      id: 'college-gniot',
      name: 'Greater Noida Institute of Technology',
      shortName: 'GNIOT',
      slug: 'gniot',
      emailDomains: ['gniot.net.in', 'gniotgroup.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#831843',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Technical Institute',
      website: 'https://www.gniotgroup.edu.in',
      address: 'Plot No. 7, Knowledge Park II, Greater Noida, Gautam Buddha Nagar, UP 201306',
      contactEmail: 'admission@gniot.net.in',
      contactPhone: '+91-120-232-0210',
      domainMetadata: 'Verified via GNIOT Group educational domain registry',
    },
  });

  // Pending Verification College for security testing
  const pendingCollege = await prisma.college.create({
    data: {
      id: 'college-pending-test',
      name: 'Greater Noida Polytechnic Institute',
      shortName: 'GNPI',
      slug: 'gnpi-pending',
      emailDomains: ['gnpi-pending.edu.in'],
      pendingDomains: ['gnpi-pending.edu.in'],
      logoUrl: null,
      city: 'Greater Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      primaryColor: '#475569',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'PENDING_VERIFICATION',
      institutionType: 'Polytechnic Institute',
      website: 'https://gnpi-pending.edu.in',
      address: 'Plot 44, Ecotech III, Greater Noida, UP 201306',
      contactEmail: 'contact@gnpi-pending.edu.in',
      domainMetadata: 'Domain approval pending DNS TXT proof verification',
    },
  });

  // ==============================================================================
  // GURGAON / GURUGRAM (HARYANA) COMPREHENSIVE DIRECTORY
  // ==============================================================================

  const ncuCollege = await prisma.college.create({
    data: {
      id: 'college-ncu',
      name: 'The NorthCap University',
      shortName: 'NCU',
      slug: 'the-northcap-university',
      emailDomains: ['ncuindia.edu'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#0B3B60',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.ncuindia.edu',
      address: 'Huda, Sector 23-A, Gurugram, Haryana 122017',
      contactEmail: 'lostfound@ncuindia.edu',
      contactPhone: '+91-124-236-5811',
      domainMetadata: 'Verified official university domain registry (ncuindia.edu) - NAAC Grade A accredited',
    },
  });

  const gdGoenkaCollege = await prisma.college.create({
    data: {
      id: 'college-gd-goenka',
      name: 'GD Goenka University',
      shortName: 'GD Goenka',
      slug: 'gd-goenka-university',
      emailDomains: ['gdgoenka.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#C41230',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.gdgoenkauniversity.com',
      address: 'GD Goenka Education City, Sohna-Gurgaon Road, Sohna, Gurugram, Haryana 122103',
      contactEmail: 'lostfound@gdgoenka.ac.in',
      contactPhone: '+91-124-331-5900',
      domainMetadata: 'Verified official UGC-recognized university domain (gdgoenka.ac.in)',
    },
  });

  const amityGurgaonCollege = await prisma.college.create({
    data: {
      id: 'college-amity-gurgaon',
      name: 'Amity University Gurugram',
      shortName: 'Amity Haryana',
      slug: 'amity-university-gurugram',
      emailDomains: ['ggn.amity.edu', 'amity.edu'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#004B87',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.amity.edu/gurugram',
      address: 'Amity Education Valley, Gurugram (Manesar), Haryana 122413',
      contactEmail: 'lostfound@ggn.amity.edu',
      contactPhone: '+91-124-233-7015',
      domainMetadata: 'Verified institutional student email domain for Amity University Haryana cluster',
    },
  });

  const sushantCollege = await prisma.college.create({
    data: {
      id: 'college-sushant',
      name: 'Sushant University',
      shortName: 'Sushant',
      slug: 'sushant-university',
      emailDomains: ['sushantuniversity.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#0A4D68',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://sushantuniversity.edu.in',
      address: 'Golf Course Road, Huda, Sushant Lok II, Sector 55, Gurugram, Haryana 122003',
      contactEmail: 'lostfound@sushantuniversity.edu.in',
      contactPhone: '+91-124-475-0400',
      domainMetadata: 'Verified official university domain registry (formerly Ansal University)',
    },
  });

  const bmlMunjalCollege = await prisma.college.create({
    data: {
      id: 'college-bml-munjal',
      name: 'BML Munjal University',
      shortName: 'BMU',
      slug: 'bml-munjal-university',
      emailDomains: ['bml.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#002D62',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.bmu.edu.in',
      address: '67th KM Stone, NH-48, Kapriwas, Gurugram, Haryana 122413',
      contactEmail: 'lostfound@bml.edu.in',
      contactPhone: '+91-124-267-9002',
      domainMetadata: 'Hero Group founded university - verified institutional domain',
    },
  });

  const krMangalamCollege = await prisma.college.create({
    data: {
      id: 'college-kr-mangalam',
      name: 'K.R. Mangalam University',
      shortName: 'KRMU',
      slug: 'kr-mangalam-university',
      emailDomains: ['krmangalam.edu.in'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#8B0000',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://www.krmangalam.edu.in',
      address: 'Sohna Road, Gurugram, Haryana 122103',
      contactEmail: 'lostfound@krmangalam.edu.in',
      contactPhone: '+91-124-286-7800',
      domainMetadata: 'Verified official higher education institutional domain (krmangalam.edu.in)',
    },
  });

  const gurugramUnivCollege = await prisma.college.create({
    data: {
      id: 'college-gurugram-univ',
      name: 'Gurugram University',
      shortName: 'GU',
      slug: 'gurugram-university',
      emailDomains: ['gurugramuniversity.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#1E3A8A',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'State University',
      website: 'https://gurugramuniversity.ac.in',
      address: 'Mayfield Garden, Sector 51, Gurugram, Haryana 122003',
      contactEmail: 'lostfound@gurugramuniversity.ac.in',
      contactPhone: '+91-124-278-8000',
      domainMetadata: 'Haryana State Government University - official ac.in domain',
    },
  });

  const dronacharyaCollege = await prisma.college.create({
    data: {
      id: 'college-dronacharya',
      name: 'Dronacharya College of Engineering',
      shortName: 'DCE Gurugram',
      slug: 'dronacharya-college-of-engineering',
      emailDomains: ['ggn.dronacharya.info', 'dronacharya.info'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#15803D',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Engineering College',
      website: 'https://ggn.dronacharya.info',
      address: 'Khentawas, Farrukhnagar, Gurugram, Haryana 122506',
      contactEmail: 'lostfound@ggn.dronacharya.info',
      contactPhone: '+91-124-237-5502',
      domainMetadata: 'NAAC accredited engineering college in Gurugram',
    },
  });

  const wudCollege = await prisma.college.create({
    data: {
      id: 'college-wud',
      name: 'World University of Design',
      shortName: 'WUD',
      slug: 'world-university-of-design',
      emailDomains: ['wud.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/amber/student.svg',
      city: 'Sonipat',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#E11D48',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Design University',
      website: 'https://worlduniversityofdesign.ac.in',
      address: 'Plot No. 1, Rajiv Gandhi Education City, Sonipat, Haryana 131029',
      contactEmail: 'lostfound@wud.ac.in',
      contactPhone: '+91-705-677-0065',
      domainMetadata: 'India first design university - verified ac.in domain',
    },
  });

  const starexCollege = await prisma.college.create({
    data: {
      id: 'college-starex',
      name: 'Starex University',
      shortName: 'Starex',
      slug: 'starex-university',
      emailDomains: ['starexuniversity.co.in'],
      pendingDomains: ['starexuniversity.co.in'],
      logoUrl: null,
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#4338CA',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'PENDING_VERIFICATION',
      institutionType: 'Private University',
      website: 'https://www.starexuniversity.co.in',
      address: 'NH-48, Binola, P.O. Bhorakalan, Gurugram, Haryana 122413',
      contactEmail: 'info@starexuniversity.co.in',
      contactPhone: '+91-124-201-4400',
      domainMetadata: 'Pending DNS TXT record validation and official institutional registrar verification',
    },
  });

  const kiitCollege = await prisma.college.create({
    data: {
      id: 'college-kiit-gurgaon',
      name: 'KIIT College of Engineering',
      shortName: 'KIIT Gurgaon',
      slug: 'kiit-college-of-engineering',
      emailDomains: ['kiit.in'],
      pendingDomains: ['kiit.in'],
      logoUrl: null,
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#D97706',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'PENDING_VERIFICATION',
      institutionType: 'Engineering College',
      website: 'https://www.kiit.in',
      address: 'KIIT Campus, Sohna Road, Bhondsi, Gurugram, Haryana 122102',
      contactEmail: 'info@kiit.in',
      contactPhone: '+91-124-265-8000',
      domainMetadata: 'Pending administrative confirmation for institutional student email domain',
    },
  });

  const gpManesarCollege = await prisma.college.create({
    data: {
      id: 'college-gp-manesar',
      name: 'Government Polytechnic Manesar',
      shortName: 'GP Manesar',
      slug: 'govt-polytechnic-manesar',
      emailDomains: ['gpmanesar.ac.in'],
      pendingDomains: ['gpmanesar.ac.in'],
      logoUrl: null,
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#374151',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'PENDING_VERIFICATION',
      institutionType: 'Government Polytechnic',
      website: 'http://gpmanesar.ac.in',
      address: 'Sector 1, HSIIDC, Manesar, Gurugram, Haryana 122051',
      contactEmail: 'gpmanesar@hry.nic.in',
      contactPhone: '+91-124-229-0242',
      domainMetadata: 'State Technical Education Department institutional review pending',
    },
  });

  const sgtUniversity = await prisma.college.create({
    data: {
      id: 'college-sgt-university',
      name: 'SGT University',
      shortName: 'SGT',
      slug: 'sgt-university',
      emailDomains: ['sgtuniversity.ac.in', 'sgtuniversity.ed.in'],
      logoUrl: 'https://illustrations.popsy.co/teal/presentation.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#800020',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Private University',
      website: 'https://sgtuniversity.ac.in',
      address: 'Budhera, Gurugram-Badli Road, Gurugram, Haryana 122505',
      contactEmail: 'lostfound@sgtuniversity.ac.in',
      contactPhone: '+91-124-227-8183',
      domainMetadata: 'UGC-recognized university under Haryana Act No. 8 of 2013 - verified ac.in domain',
    },
  });

  const mdiCollege = await prisma.college.create({
    data: {
      id: 'college-mdi-gurgaon',
      name: 'Management Development Institute',
      shortName: 'MDI Gurgaon',
      slug: 'management-development-institute',
      emailDomains: ['mdi.ac.in'],
      logoUrl: 'https://illustrations.popsy.co/blue/work-from-home.svg',
      city: 'Gurugram',
      state: 'Haryana',
      country: 'India',
      primaryColor: '#1A365D',
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
      institutionType: 'Autonomous Business School',
      website: 'https://www.mdi.ac.in',
      address: 'Mehrauli Road, Sukhrali, Sector 17, Gurugram, Haryana 122007',
      contactEmail: 'lostfound@mdi.ac.in',
      contactPhone: '+91-124-456-0000',
      domainMetadata: 'AMBA & AACSB accredited premier management institute - verified official domain',
    },
  });

  console.log('🏛️  Seeded 26 Colleges (Including Greater Noida & Gurugram Institutional Clusters).');

  // ==============================================================================
  // RELATIONAL COLLEGE EMAIL DOMAIN REGISTRY
  // ==============================================================================
  const allSeededColleges = [
    apexCollege,
    horizonCollege,
    pacificCollege,
    iilmUniversity,
    galgotiasUniversity,
    shardaUniversity,
    bennettUniversity,
    niuUniversity,
    gbuUniversity,
    glBajajCollege,
    gniotCollege,
    pendingCollege,
    ncuCollege,
    gdGoenkaCollege,
    amityGurgaonCollege,
    sushantCollege,
    bmlMunjalCollege,
    krMangalamCollege,
    gurugramUnivCollege,
    dronacharyaCollege,
    wudCollege,
    starexCollege,
    kiitCollege,
    gpManesarCollege,
    sgtUniversity,
    mdiCollege,
  ];

  for (const college of allSeededColleges) {
    for (let i = 0; i < college.emailDomains.length; i++) {
      const domain = college.emailDomains[i].toLowerCase().trim();
      const isVerified = college.domainVerificationStatus === 'VERIFIED';
      await prisma.collegeEmailDomain.create({
        data: {
          collegeId: college.id,
          domain,
          verificationStatus: isVerified ? DomainStatus.VERIFIED : DomainStatus.PENDING_VERIFICATION,
          verifiedAt: isVerified ? new Date() : null,
          verificationSource: college.domainMetadata || 'Verified Institutional Registrar Registry',
          isPrimary: i === 0,
        },
      });
    }
  }

  console.log('🌐 Seeded CollegeEmailDomain Registry for all institutional domains.');

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

  // Greater Noida Campuses
  const iilmMainCampus = await prisma.campus.create({
    data: {
      id: 'iilm-main',
      collegeId: iilmUniversity.id,
      name: 'Greater Noida Campus (Knowledge Park II)',
      code: 'IILM-GN',
      addressLabel: '16 Knowledge Park II, Greater Noida, UP 201306',
      lostFoundDeskRoom: 'Main Security Block / Administration Reception',
      operatingHours: 'Mon - Sat: 8:30 AM - 5:30 PM',
      contactEmail: 'lostfound@iilm.edu',
    },
  });

  const shardaMainCampus = await prisma.campus.create({
    data: {
      id: 'sharda-main',
      collegeId: shardaUniversity.id,
      name: 'Sharda University Main Campus',
      code: 'SHARDA-MAIN',
      addressLabel: 'Plot No. 32-34, Knowledge Park III, Greater Noida, UP 201310',
      lostFoundDeskRoom: 'Central Library Helpdesk / Security Gate 1',
      operatingHours: 'Mon - Sat: 9:00 AM - 6:00 PM',
      contactEmail: 'lostfound@sharda.ac.in',
    },
  });

  const galgotiasMainCampus = await prisma.campus.create({
    data: {
      id: 'galgotias-main',
      collegeId: galgotiasUniversity.id,
      name: 'Galgotias Main Campus',
      code: 'GU-MAIN',
      addressLabel: 'Plot No. 2, Sector 17-A, Yamuna Expressway, Greater Noida, UP 203201',
      lostFoundDeskRoom: 'Block A Proctor Office & Lost Property Desk',
      operatingHours: 'Mon - Sat: 9:00 AM - 5:00 PM',
      contactEmail: 'lostandfound@galgotiasuniversity.edu.in',
    },
  });

  // Gurgaon Campuses
  const ncuMainCampus = await prisma.campus.create({
    data: {
      id: 'ncu-main',
      collegeId: ncuCollege.id,
      name: 'The NorthCap University Main Campus',
      code: 'NCU-MAIN',
      addressLabel: 'Huda, Sector 23-A, Gurugram, Haryana 122017',
      lostFoundDeskRoom: 'Student Welfare & Security Desk, Ground Floor',
      operatingHours: 'Mon - Fri: 8:30 AM - 5:30 PM',
      contactEmail: 'lostfound@ncuindia.edu',
    },
  });

  const gdGoenkaMainCampus = await prisma.campus.create({
    data: {
      id: 'gd-goenka-main',
      collegeId: gdGoenkaCollege.id,
      name: 'GD Goenka Education City Campus',
      code: 'GDG-MAIN',
      addressLabel: 'GD Goenka Education City, Sohna-Gurgaon Road, Gurugram 122103',
      lostFoundDeskRoom: 'Central Administration Block Desk',
      operatingHours: 'Mon - Sat: 9:00 AM - 5:00 PM',
      contactEmail: 'lostfound@gdgoenka.ac.in',
    },
  });

  const amityGurgaonMainCampus = await prisma.campus.create({
    data: {
      id: 'amity-ggn-main',
      collegeId: amityGurgaonCollege.id,
      name: 'Amity Manesar Innovation Campus',
      code: 'AMITY-GGN',
      addressLabel: 'Amity Education Valley, Manesar, Gurugram 122413',
      lostFoundDeskRoom: 'Security & Proctorial Board Room 102',
      operatingHours: 'Mon - Fri: 8:30 AM - 6:00 PM',
      contactEmail: 'lostfound@ggn.amity.edu',
    },
  });

  const sushantMainCampus = await prisma.campus.create({
    data: {
      id: 'sushant-main',
      collegeId: sushantCollege.id,
      name: 'Sushant University Golf Course Campus',
      code: 'SUSHANT-MAIN',
      addressLabel: 'Golf Course Road, Sector 55, Gurugram 122003',
      lostFoundDeskRoom: 'Central Block Reception Desk',
      operatingHours: 'Mon - Sat: 8:30 AM - 5:30 PM',
      contactEmail: 'lostfound@sushantuniversity.edu.in',
    },
  });

  const bmlMunjalMainCampus = await prisma.campus.create({
    data: {
      id: 'bml-main',
      collegeId: bmlMunjalCollege.id,
      name: 'BML Munjal University Highway Campus',
      code: 'BMU-MAIN',
      addressLabel: '67th KM Stone, NH-48, Sidhrawali, Gurugram 122413',
      lostFoundDeskRoom: 'Student Hub & Security Operations Center',
      operatingHours: 'Mon - Sat: 8:00 AM - 6:00 PM',
      contactEmail: 'lostfound@bml.edu.in',
    },
  });

  const krMangalamMainCampus = await prisma.campus.create({
    data: {
      id: 'krm-main',
      collegeId: krMangalamCollege.id,
      name: 'K.R. Mangalam Main Campus',
      code: 'KRM-MAIN',
      addressLabel: 'Sohna Road, Gurugram 122103',
      lostFoundDeskRoom: 'Dean Office Lost & Found Section',
      operatingHours: 'Mon - Sat: 9:00 AM - 5:00 PM',
      contactEmail: 'lostfound@krmangalam.edu.in',
    },
  });

  const gurugramUnivMainCampus = await prisma.campus.create({
    data: {
      id: 'gu-sec51-main',
      collegeId: gurugramUnivCollege.id,
      name: 'Sector 51 University Campus',
      code: 'GU-SEC51',
      addressLabel: 'Mayfield Garden, Sector 51, Gurugram 122003',
      lostFoundDeskRoom: 'University Proctor Office Desk',
      operatingHours: 'Mon - Fri: 9:00 AM - 5:00 PM',
      contactEmail: 'lostfound@gurugramuniversity.ac.in',
    },
  });

  const dronacharyaMainCampus = await prisma.campus.create({
    data: {
      id: 'dce-main',
      collegeId: dronacharyaCollege.id,
      name: 'Farrukhnagar Campus',
      code: 'DCE-GGN',
      addressLabel: 'Khentawas, Farrukhnagar, Gurugram 122506',
      lostFoundDeskRoom: 'Administrative Wing Helpdesk',
      operatingHours: 'Mon - Sat: 8:30 AM - 4:30 PM',
      contactEmail: 'lostfound@ggn.dronacharya.info',
    },
  });

  const wudMainCampus = await prisma.campus.create({
    data: {
      id: 'wud-main',
      collegeId: wudCollege.id,
      name: 'WUD Rajiv Gandhi Education City Campus',
      code: 'WUD-MAIN',
      addressLabel: 'Plot No. 1, Rajiv Gandhi Education City, Sonipat 131029',
      lostFoundDeskRoom: 'Design Studio 1 Lost Property Corner',
      operatingHours: 'Mon - Fri: 9:00 AM - 6:00 PM',
      contactEmail: 'lostfound@wud.ac.in',
    },
  });

  const starexMainCampus = await prisma.campus.create({
    data: {
      id: 'starex-main',
      collegeId: starexCollege.id,
      name: 'Starex Binola Campus',
      code: 'STAREX-MAIN',
      addressLabel: 'NH-48, Binola, Gurugram 122413',
      lostFoundDeskRoom: 'Security Post 1 Gate Reception',
      operatingHours: 'Mon - Sat: 9:00 AM - 5:00 PM',
      contactEmail: 'info@starexuniversity.co.in',
    },
  });

  const kiitMainCampus = await prisma.campus.create({
    data: {
      id: 'kiit-ggn-main',
      collegeId: kiitCollege.id,
      name: 'KIIT Bhondsi Campus',
      code: 'KIIT-GGN',
      addressLabel: 'Sohna Road, Bhondsi, Gurugram 122102',
      lostFoundDeskRoom: 'Main Reception & Security Desk',
      operatingHours: 'Mon - Sat: 9:00 AM - 5:00 PM',
      contactEmail: 'info@kiit.in',
    },
  });

  const gpManesarMainCampus = await prisma.campus.create({
    data: {
      id: 'gp-manesar-main',
      collegeId: gpManesarCollege.id,
      name: 'Government Polytechnic Manesar Campus',
      code: 'GPM-MAIN',
      addressLabel: 'Sector 1, HSIIDC, Manesar, Gurugram 122051',
      lostFoundDeskRoom: 'Principal Office Support Desk',
      operatingHours: 'Mon - Fri: 9:00 AM - 5:00 PM',
      contactEmail: 'gpmanesar@hry.nic.in',
    },
  });

  console.log('📍 Seeded Campuses (Including Greater Noida & Gurgaon Hubs).');

  // 4. Seed Campus Locations
  await prisma.campusLocation.create({
    data: {
      id: 'iilm-lib',
      campusId: iilmMainCampus.id,
      name: 'IILM Central Library',
      building: 'Academic Block A',
      floorLabel: 'Ground Floor Reading Hall',
      locationType: 'library',
      hasDesk: true,
    },
  });

  await prisma.campusLocation.create({
    data: {
      id: 'iilm-cafeteria',
      campusId: iilmMainCampus.id,
      name: 'IILM Student Center & Cafeteria',
      building: 'Student Amenities Block',
      floorLabel: 'Food Court Area',
      locationType: 'canteen',
      hasDesk: false,
    },
  });

  // Retain Sharda School of Business Studies under Sharda University
  await prisma.campusLocation.create({
    data: {
      id: 'sharda-ssbs',
      campusId: shardaMainCampus.id,
      name: 'Sharda School of Business Studies (SSBS)',
      building: 'Block 7 - Business School Complex',
      floorLabel: 'Dean Office & Management Commons',
      locationType: 'building',
      hasDesk: true,
    },
  });

  await prisma.campusLocation.create({
    data: {
      id: 'sharda-lib',
      campusId: shardaMainCampus.id,
      name: 'Swami Vivekananda Central Library',
      building: 'Central Library Tower',
      floorLabel: '2nd Floor Reference Section',
      locationType: 'library',
      hasDesk: true,
    },
  });
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

  // Seed verified IILM University student
  const aarav = await prisma.user.create({
    data: {
      id: 'user-aarav-iilm',
      name: 'Aarav Sharma',
      email: 'aarav.sharma@iilm.edu',
      emailVerified: new Date(),
      passwordHash: defaultPasswordHash,
      image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Computer Science & Engineering',
      gradYear: 2026,
      phone: '+91 98765 43210',
    },
  });

  // Check for environment-configured demo student (non-production only)
  let demoUserRecord = null;
  if (process.env.DEMO_STUDENT_EMAIL && process.env.DEMO_STUDENT_PASSWORD) {
    const demoEmail = process.env.DEMO_STUDENT_EMAIL.trim().toLowerCase();
    const demoPasswordHash = await argon2.hash(process.env.DEMO_STUDENT_PASSWORD, {
      type: argon2.argon2id,
    });
    demoUserRecord = await prisma.user.create({
      data: {
        id: 'user-demo-student',
        name: 'Demo Student',
        email: demoEmail,
        emailVerified: new Date(),
        passwordHash: demoPasswordHash,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        isDemoUser: true,
        department: 'Information Technology',
        gradYear: 2027,
      },
    });
    console.log(`👤 Seeded environment-configured Demo Student (${demoEmail}).`);
  }

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
      {
        userId: aarav.id,
        collegeId: iilmUniversity.id,
        studentIdentifier: 'IILM-2026-8801',
        verificationMethod: 'EMAIL_DOMAIN',
        status: MembershipStatus.VERIFIED,
      },
      ...(demoUserRecord
        ? [
            {
              userId: demoUserRecord.id,
              collegeId: iilmUniversity.id,
              studentIdentifier: 'DEMO-2027-0001',
              verificationMethod: 'EMAIL_DOMAIN',
              status: MembershipStatus.VERIFIED,
            },
          ]
        : []),
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

