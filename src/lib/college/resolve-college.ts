import { prisma } from '@/lib/db';
import { CollegeStatus, DomainStatus } from '@prisma/client';

export const PUBLIC_EMAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'ymail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'aol.com',
  'zoho.com',
  'zohomail.com',
  'gmx.com',
  'gmx.net',
  'yandex.com',
  'yandex.ru',
  'fastmail.com',
  'tutanota.com',
  'tutamail.com',
]);

export interface CollegeResolutionSuccess {
  success: true;
  collegeId: string;
  collegeName: string;
  shortName: string | null;
  slug: string;
  domain: string;
  status: 'ACTIVE';
  domainStatus: 'VERIFIED';
  campusSlug?: string;
  primaryColor?: string;
  logoUrl?: string | null;
}

export interface CollegeResolutionFailure {
  success: false;
  code:
    | 'INVALID_EMAIL_FORMAT'
    | 'PUBLIC_EMAIL_PROVIDER'
    | 'NON_EDUCATIONAL_DOMAIN'
    | 'UNREGISTERED_DOMAIN'
    | 'COLLEGE_INACTIVE'
    | 'DOMAIN_PENDING_VERIFICATION'
    | 'DOMAIN_REJECTED';
  message: string;
  domain?: string;
  collegeName?: string;
}

export type CollegeResolutionResult = CollegeResolutionSuccess | CollegeResolutionFailure;

/**
 * Extracts and normalizes the domain from an email address
 */
export function extractDomainFromEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const parts = email.trim().toLowerCase().split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const domain = parts[1].trim();
  // Basic validation of domain structure (contains dot, no spaces)
  if (!domain.includes('.') || domain.startsWith('.') || domain.endsWith('.')) {
    return null;
  }
  return domain;
}

/**
 * Checks if the given domain belongs to a consumer / public email provider
 */
export function isPublicEmailProvider(domain: string): boolean {
  if (!domain) return false;
  const normalized = domain.toLowerCase().trim();
  return PUBLIC_EMAIL_PROVIDERS.has(normalized);
}

/**
 * Validates whether an email has a plausible educational structure and is not a public provider
 */
export function isValidEducationalEmail(email: string): boolean {
  const domain = extractDomainFromEmail(email);
  if (!domain) return false;
  if (isPublicEmailProvider(domain)) return false;

  // Recognized institutional educational TLDs or subdomains
  const isEduTld =
    domain.endsWith('.edu') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.uk') ||
    domain.endsWith('.edu.au') ||
    domain.endsWith('.edu.sg') ||
    domain.endsWith('.ac.nz') ||
    domain.endsWith('.res.in');

  return isEduTld;
}

/**
 * Authoritatively resolves a college from a verified student/faculty email address.
 * 
 * Strict Server Authority Rules:
 * 1. Checks relational CollegeEmailDomain first.
 * 2. Falls back to College.emailDomains array for backwards compatibility.
 * 3. Enforces College status === ACTIVE.
 * 4. Enforces Domain verification status === VERIFIED.
 * 5. Rejects personal/public email providers with descriptive guidance.
 */
export async function resolveCollegeFromEmail(email: string): Promise<CollegeResolutionResult> {
  const domain = extractDomainFromEmail(email);
  if (!domain) {
    return {
      success: false,
      code: 'INVALID_EMAIL_FORMAT',
      message: 'Please provide a valid institutional email address (e.g. yourname@university.edu).',
    };
  }

  if (isPublicEmailProvider(domain)) {
    return {
      success: false,
      code: 'PUBLIC_EMAIL_PROVIDER',
      domain,
      message:
        'Personal email addresses (e.g. @gmail.com, @yahoo.com, @outlook.com) are not allowed. Please enter your official campus-issued institutional email.',
    };
  }

  // 1. Check relational CollegeEmailDomain model first
  const domainRecord = await prisma.collegeEmailDomain.findUnique({
    where: { domain },
    include: {
      college: {
        include: {
          campuses: {
            take: 1,
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (domainRecord) {
    const { college } = domainRecord;

    if (college.status !== CollegeStatus.ACTIVE) {
      return {
        success: false,
        code: 'COLLEGE_INACTIVE',
        collegeName: college.name,
        domain,
        message: `${college.name} is currently suspended or inactive on LostLink. Please contact campus administration.`,
      };
    }

    if (domainRecord.verificationStatus === DomainStatus.PENDING_VERIFICATION) {
      return {
        success: false,
        code: 'DOMAIN_PENDING_VERIFICATION',
        collegeName: college.name,
        domain,
        message: `The institutional domain "@${domain}" for ${college.name} is currently pending official verification. Access will be enabled once administrative verification completes.`,
      };
    }

    if (
      domainRecord.verificationStatus === DomainStatus.REJECTED ||
      domainRecord.verificationStatus === DomainStatus.REVOKED
    ) {
      return {
        success: false,
        code: 'DOMAIN_REJECTED',
        collegeName: college.name,
        domain,
        message: `The institutional domain "@${domain}" is not authorized or has been revoked for ${college.name}.`,
      };
    }

    if (domainRecord.verificationStatus === DomainStatus.VERIFIED) {
      const defaultCampusSlug = college.campuses[0]?.code?.toLowerCase() || college.slug;
      return {
        success: true,
        collegeId: college.id,
        collegeName: college.name,
        shortName: college.shortName,
        slug: college.slug,
        domain,
        status: 'ACTIVE',
        domainStatus: 'VERIFIED',
        campusSlug: defaultCampusSlug,
        primaryColor: college.primaryColor,
        logoUrl: college.logoUrl,
      };
    }
  }

  // 2. Fallback to College.emailDomains array for backward compatibility
  // Prefer an ACTIVE and VERIFIED college first if multiple exist
  let legacyCollege = await prisma.college.findFirst({
    where: {
      emailDomains: { has: domain },
      status: CollegeStatus.ACTIVE,
      domainVerificationStatus: 'VERIFIED',
    },
    include: {
      campuses: {
        take: 1,
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!legacyCollege) {
    legacyCollege = await prisma.college.findFirst({
      where: {
        emailDomains: { has: domain },
      },
      include: {
        campuses: {
          take: 1,
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (legacyCollege) {
    if (legacyCollege.status !== CollegeStatus.ACTIVE) {
      return {
        success: false,
        code: 'COLLEGE_INACTIVE',
        collegeName: legacyCollege.name,
        domain,
        message: `${legacyCollege.name} is currently suspended or inactive on LostLink. Please contact campus administration.`,
      };
    }

    if (
      legacyCollege.domainVerificationStatus &&
      legacyCollege.domainVerificationStatus !== 'VERIFIED'
    ) {
      return {
        success: false,
        code: 'DOMAIN_PENDING_VERIFICATION',
        collegeName: legacyCollege.name,
        domain,
        message: `The institutional domain "@${domain}" for ${legacyCollege.name} is currently pending official verification.`,
      };
    }

    const defaultCampusSlug = legacyCollege.campuses[0]?.code?.toLowerCase() || legacyCollege.slug;
    return {
      success: true,
      collegeId: legacyCollege.id,
      collegeName: legacyCollege.name,
      shortName: legacyCollege.shortName,
      slug: legacyCollege.slug,
      domain,
      status: 'ACTIVE',
      domainStatus: 'VERIFIED',
      campusSlug: defaultCampusSlug,
      primaryColor: legacyCollege.primaryColor,
      logoUrl: legacyCollege.logoUrl,
    };
  }

  return {
    success: false,
    code: 'UNREGISTERED_DOMAIN',
    domain,
    message: `The email domain "@${domain}" is not currently registered on LostLink. Please ensure you are using your official university-issued email or apply to register your campus.`,
  };
}
