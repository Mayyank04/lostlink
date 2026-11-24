import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, requirePlatformAdmin, errorResponse } from '@/lib/auth/tenant';
import { CollegeStatus, DomainStatus } from '@prisma/client';
import { z } from 'zod';

const domainActionSchema = z.object({
  action: z.enum([
    'APPROVE',
    'REJECT',
    'REVOKE',
    'SET_UNDER_REVIEW',
    'ADD_DOMAIN',
    'REMOVE_DOMAIN',
  ]),
  reason: z.string().min(3, 'A clear reason or verification reference is required'),
  domain: z.string().optional(),
  metadata: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);
    const { id } = await Promise.resolve(params);

    const college = await prisma.college.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        emailDomains: true,
        domains: true,
        pendingDomains: true,
        domainVerificationStatus: true,
        domainMetadata: true,
        status: true,
        website: true,
        reviewNotes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    // Retrieve domain verification audit events
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        collegeId: id,
        action: {
          in: [
            'APPROVE_DOMAINS',
            'REJECT_DOMAINS',
            'REVOKE_DOMAIN_VERIFICATION',
            'SET_DOMAIN_UNDER_REVIEW',
            'ADD_COLLEGE_DOMAIN',
            'REMOVE_COLLEGE_DOMAIN',
            'COLLEGE_DOMAINS_MODIFIED_UNDER_REVIEW',
          ],
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      college,
      domainVerificationStatus: college.domainVerificationStatus,
      verificationHistory: auditLogs,
      verificationAuditLogs: auditLogs,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth(req);
    requirePlatformAdmin(user);
    const { id } = await Promise.resolve(params);

    const body = await req.json();
    const result = domainActionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || 'Invalid domain action parameters' },
        { status: 400 }
      );
    }

    const { action, reason, domain, metadata } = result.data;

    const college = await prisma.college.findUnique({
      where: { id },
    });

    if (!college) {
      return NextResponse.json({ error: 'College not found' }, { status: 404 });
    }

    let updatedCollege;
    let auditAction = '';
    let newStatus = college.domainVerificationStatus;
    let newEmailDomains = [...college.emailDomains];
    let newPendingDomains = [...college.pendingDomains];

    if (action === 'APPROVE') {
      newStatus = 'VERIFIED';
      auditAction = 'APPROVE_DOMAINS';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      auditAction = 'REJECT_DOMAINS';
    } else if (action === 'REVOKE') {
      newStatus = 'PENDING';
      auditAction = 'REVOKE_DOMAIN_VERIFICATION';
    } else if (action === 'SET_UNDER_REVIEW') {
      newStatus = 'UNDER_REVIEW';
      auditAction = 'SET_DOMAIN_UNDER_REVIEW';
    } else if (action === 'ADD_DOMAIN') {
      if (!domain) {
        return NextResponse.json({ error: 'Domain name is required for ADD_DOMAIN' }, { status: 400 });
      }
      const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
      if (!newEmailDomains.includes(cleanDomain)) {
        newEmailDomains.push(cleanDomain);
      }
      newStatus = 'UNDER_REVIEW'; // Adding domain triggers re-review
      auditAction = 'ADD_COLLEGE_DOMAIN';
    } else if (action === 'REMOVE_DOMAIN') {
      if (!domain) {
        return NextResponse.json({ error: 'Domain name is required for REMOVE_DOMAIN' }, { status: 400 });
      }
      const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
      newEmailDomains = newEmailDomains.filter((d) => d !== cleanDomain);
      auditAction = 'REMOVE_COLLEGE_DOMAIN';
    }

    updatedCollege = await prisma.$transaction(async (tx) => {
      const col = await tx.college.update({
        where: { id },
        data: {
          domainVerificationStatus: newStatus,
          emailDomains: newEmailDomains,
          pendingDomains: newPendingDomains,
          domainMetadata: metadata || college.domainMetadata,
          reviewNotes: reason,
          // When domains are approved, college also transitions to ACTIVE if pending
          ...(action === 'APPROVE' && college.status === CollegeStatus.PENDING
            ? { status: CollegeStatus.ACTIVE }
            : {}),
        },
      });

      // Synchronize relational CollegeEmailDomain records
      if (action === 'APPROVE') {
        await tx.collegeEmailDomain.updateMany({
          where: { collegeId: id },
          data: {
            verificationStatus: DomainStatus.VERIFIED,
            verifiedAt: new Date(),
          },
        });
      } else if (action === 'REJECT') {
        await tx.collegeEmailDomain.updateMany({
          where: { collegeId: id },
          data: {
            verificationStatus: DomainStatus.REJECTED,
            verifiedAt: null,
          },
        });
      } else if (action === 'REVOKE') {
        await tx.collegeEmailDomain.updateMany({
          where: { collegeId: id },
          data: {
            verificationStatus: DomainStatus.REVOKED,
            verifiedAt: null,
          },
        });
      } else if (action === 'ADD_DOMAIN' && domain) {
        const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
        await tx.collegeEmailDomain.upsert({
          where: { domain: cleanDomain },
          update: {
            collegeId: id,
            verificationStatus: DomainStatus.PENDING_VERIFICATION,
            verificationSource: reason,
          },
          create: {
            collegeId: id,
            domain: cleanDomain,
            verificationStatus: DomainStatus.PENDING_VERIFICATION,
            verificationSource: reason,
          },
        });
      } else if (action === 'REMOVE_DOMAIN' && domain) {
        const cleanDomain = domain.trim().toLowerCase().replace(/^@/, '');
        await tx.collegeEmailDomain.deleteMany({
          where: { domain: cleanDomain },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: col.id,
          action: auditAction,
          resourceType: 'COLLEGE_DOMAIN_VERIFICATION',
          resourceId: col.id,
          metadata: JSON.stringify({
            action,
            reason,
            affectedDomain: domain || null,
            previousVerificationStatus: college.domainVerificationStatus,
            newVerificationStatus: newStatus,
            emailDomains: newEmailDomains,
            authorizedBy: user.email,
            timestamp: new Date().toISOString(),
          }),
        },
      });

      return col;
    });

    return NextResponse.json({
      success: true,
      message: `Domain verification updated to ${newStatus} for "${updatedCollege.name}".`,
      college: updatedCollege,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
