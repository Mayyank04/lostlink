import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '@/lib/db';
import { ItemReportType, ItemStatus, ClaimStatus, UserRole, UserStatus } from '@prisma/client';

describe('Phase 3 Real PostgreSQL Messaging Architecture', () => {
  let userA: any;
  let userB: any;
  let userC: any; // Outsider
  let testItem: any;
  let testClaim: any;
  let conversation: any;

  beforeAll(async () => {
    const college = await prisma.college.findFirst({ include: { campuses: true } });
    if (!college || college.campuses.length === 0) {
      throw new Error('College with campus required in DB');
    }

    const timestamp = Date.now();

    userA = await prisma.user.create({
      data: {
        name: 'Alice Student',
        email: `alice.msg.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    userB = await prisma.user.create({
      data: {
        name: 'Bob Finder',
        email: `bob.msg.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    userC = await prisma.user.create({
      data: {
        name: 'Charlie Outsider',
        email: `charlie.msg.${timestamp}@test.edu`,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      },
    });

    testItem = await prisma.item.create({
      data: {
        reportNumber: `FD-MSG-${timestamp}`,
        reporterId: userB.id,
        collegeId: college.id,
        campusId: college.campuses[0].id,
        locationBuilding: 'Science Center',
        type: ItemReportType.FOUND,
        name: 'TI-84 Plus CE Graphing Calculator',
        category: 'electronics',
        color: 'Black',
        description: 'Black calculator left in math lecture hall',
        occurredAt: new Date(),
        status: ItemStatus.OPEN,
      },
    });

    testClaim = await prisma.claim.create({
      data: {
        referenceNumber: `CLM-MSG-${timestamp}`,
        itemId: testItem.id,
        claimantId: userA.id,
        privateEvidenceReference: JSON.stringify({ answers: [] }),
        status: ClaimStatus.PENDING,
      },
    });
  });

  it('initializes a conversation linked to a claim with two participants', async () => {
    conversation = await prisma.conversation.create({
      data: {
        claimId: testClaim.id,
        itemId: testItem.id,
        title: `Inquiry regarding ${testItem.name}`,
        participants: {
          create: [
            { userId: userA.id, lastReadAt: new Date() },
            { userId: userB.id, lastReadAt: new Date(0) }, // Bob has not read yet
          ],
        },
      },
      include: {
        participants: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

    expect(conversation.id).toBeDefined();
    expect(conversation.participants).toHaveLength(2);
    expect(conversation.participants.some((p: any) => p.userId === userA.id)).toBe(true);
    expect(conversation.participants.some((p: any) => p.userId === userB.id)).toBe(true);
  });

  it('persists sent messages and calculates unread count accurately', async () => {
    // Alice sends a message
    const msg1 = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userA.id,
        content: 'Hi Bob, I noticed you found my TI-84 calculator. Does it have custom programs saved?',
      },
    });

    expect(msg1.id).toBeDefined();
    expect(msg1.content).toContain('TI-84 calculator');

    // Bob has not opened the conversation yet (lastReadAt = 0)
    const bobParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: userB.id,
        },
      },
    });

    const bobUnreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userB.id },
        createdAt: { gt: bobParticipant!.lastReadAt },
      },
    });

    expect(bobUnreadCount).toBe(1);

    // Alice has read her own message
    const aliceParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: userA.id,
        },
      },
    });

    const aliceUnreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userA.id },
        createdAt: { gt: aliceParticipant!.lastReadAt },
      },
    });

    expect(aliceUnreadCount).toBe(0);
  });

  it('enforces participant-level authorization (outsiders cannot access conversation)', async () => {
    // Check if userC is a participant
    const isParticipant = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: userC.id,
        },
      },
    });

    expect(isParticipant).toBeNull();

    // Verify security guard function
    const authorizeAccess = async (userId: string, convId: string) => {
      const p = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId: convId, userId } },
      });
      if (!p) {
        throw new Error('Forbidden: User is not a participant in this conversation');
      }
      return true;
    };

    await expect(authorizeAccess(userC.id, conversation.id)).rejects.toThrow('Forbidden');
    await expect(authorizeAccess(userA.id, conversation.id)).resolves.toBe(true);
  });

  it('updates participant lastReadAt timestamp when reading messages', async () => {
    // Bob marks conversation as read
    const readTimestamp = new Date();
    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: userB.id,
        },
      },
      data: {
        lastReadAt: readTimestamp,
      },
    });

    const refreshedBob = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId: conversation.id,
          userId: userB.id,
        },
      },
    });

    expect(refreshedBob?.lastReadAt.getTime()).toBeGreaterThanOrEqual(readTimestamp.getTime() - 100);

    const updatedBobUnreadCount = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: userB.id },
        createdAt: { gt: refreshedBob!.lastReadAt },
      },
    });

    expect(updatedBobUnreadCount).toBe(0);
  });

  it('records message abuse reports for moderator review', async () => {
    const message = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
    });
    expect(message).not.toBeNull();
    if (!message) return;

    const report = await prisma.messageReport.create({
      data: {
        messageId: message.id,
        reporterId: userB.id,
        reason: 'Harassment / spam testing violation',
        status: 'PENDING',
      },
    });

    expect(report.id).toBeDefined();
    expect(report.status).toBe('PENDING');

    const pendingReports = await prisma.messageReport.findMany({
      where: { status: 'PENDING' },
    });
    expect(pendingReports.some((r) => r.id === report.id)).toBe(true);
  });
});
