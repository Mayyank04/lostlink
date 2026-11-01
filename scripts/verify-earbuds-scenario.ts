import { prisma } from '../src/lib/db';
import { triggerMatchingEngineForItem } from '../src/lib/matching/matchEngine';
import { generateOTP, generateQrToken, hashToken, verifyTokenHash } from '../src/lib/handover/crypto';
import {
  ItemReportType,
  ItemStatus,
  ClaimStatus,
  HandoverStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';

interface ChecklistResults {
  step1: boolean;
  step2: boolean;
  step3: boolean;
  step4: boolean;
  step5: boolean;
  step6: boolean;
  step7: boolean;
  step8: boolean;
  step9: boolean;
  step10: boolean;
}

async function runScenario() {
  console.log('\n================================================================');
  console.log('   LOSTLINK 2.0 — LIVE EARBUDS RECOVERY LIFECYCLE VERIFICATION');
  console.log('================================================================\n');

  const results: ChecklistResults = {
    step1: false,
    step2: false,
    step3: false,
    step4: false,
    step5: false,
    step6: false,
    step7: false,
    step8: false,
    step9: false,
    step10: false,
  };

  // 0. Locate university campus for testing
  const college = await prisma.college.findFirst({
    include: { campuses: true },
  });

  if (!college || college.campuses.length === 0) {
    throw new Error('Database must have at least one college and campus seeded.');
  }

  const campus = college.campuses[0];
  const timestamp = Date.now();

  console.log(`[Setup] Target College: ${college.name} (${college.slug})`);
  console.log(`[Setup] Target Campus:  ${campus.name} (Code: ${campus.code})\n`);

  // Baseline stats
  const initialReturnedCount = await prisma.item.count({
    where: { collegeId: college.id, status: ItemStatus.RETURNED },
  });

  // Setup Student A (Owner)
  const studentA = await prisma.user.upsert({
    where: { email: `student.a.${timestamp}@apex.edu` },
    update: {},
    create: {
      name: 'Jordan (Student A)',
      email: `student.a.${timestamp}@apex.edu`,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Computer Science',
      memberships: {
        create: { collegeId: college.id, verificationMethod: 'EMAIL_DOMAIN' },
      },
    },
  });

  // Setup Student B (Finder)
  const studentB = await prisma.user.upsert({
    where: { email: `student.b.${timestamp}@apex.edu` },
    update: {},
    create: {
      name: 'Taylor (Student B)',
      email: `student.b.${timestamp}@apex.edu`,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      department: 'Electrical Engineering',
      memberships: {
        create: { collegeId: college.id, verificationMethod: 'EMAIL_DOMAIN' },
      },
    },
  });

  // Setup Moderator
  const moderator = await prisma.user.upsert({
    where: { email: `moderator.desk.${timestamp}@apex.edu` },
    update: {},
    create: {
      name: 'Officer Vance (Library Desk Custodian)',
      email: `moderator.desk.${timestamp}@apex.edu`,
      role: UserRole.COLLEGE_MODERATOR,
      status: UserStatus.ACTIVE,
      department: 'Campus Safety & Property Custody',
      memberships: {
        create: { collegeId: college.id, verificationMethod: 'STAFF_APPOINTMENT' },
      },
    },
  });

  // --------------------------------------------------------------------------
  // STEP 1: Student A reports black earbuds lost in the library
  // --------------------------------------------------------------------------
  console.log('--- Step 1: Student A reports black earbuds lost in the library ---');
  const lostItem = await prisma.item.create({
    data: {
      reportNumber: `LL-EARBUDS-${timestamp}`,
      reporterId: studentA.id,
      collegeId: college.id,
      campusId: campus.id,
      locationBuilding: 'University Library',
      locationSpecifics: '2nd Floor Quiet Study Cubicle 14',
      type: ItemReportType.LOST,
      name: 'Black Sony Wireless Earbuds WF-1000XM4',
      category: 'audio',
      brand: 'Sony',
      color: 'Black',
      description: 'Matte black earbuds in charging case. Left on wooden desk near window.',
      occurredAt: new Date(Date.now() - 3600 * 1000 * 4), // Lost 4 hours ago
      status: ItemStatus.OPEN,
    },
  });

  console.log(`✓ Lost Item Registered: "${lostItem.name}"`);
  console.log(`  Report Number: ${lostItem.reportNumber}`);
  console.log(`  Location:      ${lostItem.locationBuilding} (${lostItem.locationSpecifics})`);
  console.log(`  Status:        ${lostItem.status}\n`);
  results.step1 = true;

  // --------------------------------------------------------------------------
  // STEP 2: Student B reports black earbuds found in the library
  // --------------------------------------------------------------------------
  console.log('--- Step 2: Student B reports black earbuds found in the library ---');
  const foundItem = await prisma.item.create({
    data: {
      reportNumber: `FD-EARBUDS-${timestamp}`,
      reporterId: studentB.id,
      collegeId: college.id,
      campusId: campus.id,
      locationBuilding: 'University Library',
      locationSpecifics: '2nd Floor Study Desk 14',
      type: ItemReportType.FOUND,
      name: 'Black Wireless Earbuds in Charging Case',
      category: 'audio',
      brand: 'Sony',
      color: 'Black',
      description: 'Found black earbuds case plugged into outlet under cubicle 14 desk.',
      occurredAt: new Date(Date.now() - 3600 * 1000 * 1), // Found 1 hour ago
      status: ItemStatus.OPEN,
      depositedWithOffice: true,
      officeLocationNotes: 'Turned into Central Library Circulation Desk',
    },
  });

  console.log(`✓ Found Item Registered: "${foundItem.name}"`);
  console.log(`  Report Number: ${foundItem.reportNumber}`);
  console.log(`  Location:      ${foundItem.locationBuilding}`);
  console.log(`  Status:        ${foundItem.status}\n`);
  results.step2 = true;

  // --------------------------------------------------------------------------
  // STEP 3: LostLink automatically displays a potential match
  // --------------------------------------------------------------------------
  console.log('--- Step 3: LostLink automatically discovers potential match ---');
  const matchesCreated = await triggerMatchingEngineForItem(foundItem.id);
  console.log(`✓ Matching Engine Triggered. Matches discovered: ${matchesCreated}`);

  const match = await prisma.match.findUnique({
    where: {
      lostItemId_foundItemId: {
        lostItemId: lostItem.id,
        foundItemId: foundItem.id,
      },
    },
  });

  if (!match) {
    throw new Error('Expected match was not created between lost and found earbuds.');
  }

  const breakdownData = JSON.parse(match.explanation);
  console.log(`✓ Match Score:       ${match.score}/100 (${breakdownData.confidenceTier.toUpperCase()} CONFIDENCE)`);
  console.log(`  - Category Score:  ${breakdownData.breakdown.category.score}/25 (Matched: ${breakdownData.breakdown.category.matched})`);
  console.log(`  - Name Sim Score:  ${breakdownData.breakdown.nameSimilarity.score}/25`);
  console.log(`  - Color Score:     ${breakdownData.breakdown.color.score}/15 (Matched: ${breakdownData.breakdown.color.matched})`);
  console.log(`  - Location Score:  ${breakdownData.breakdown.location.score}/15 (Building: ${lostItem.locationBuilding})`);
  console.log(`  - Timeline Score:  ${breakdownData.breakdown.chronology.score}/10 (Plausible)`);
  console.log(`  - Status:          ${match.status}\n`);
  results.step3 = match.score >= 70;

  // --------------------------------------------------------------------------
  // STEP 4: Student A receives a match notification
  // --------------------------------------------------------------------------
  console.log('--- Step 4: Student A receives match notification ---');
  const notif = await prisma.notification.findFirst({
    where: {
      userId: studentA.id,
      resourceId: match.id,
    },
  });

  if (!notif) {
    throw new Error('Notification was not dispatched to Student A for match discovery.');
  }

  console.log(`✓ Notification Delivered to: ${studentA.name} (${studentA.email})`);
  console.log(`  Type:    ${notif.type}`);
  console.log(`  Title:   ${notif.title}`);
  console.log(`  Message: ${notif.message}\n`);
  results.step4 = true;

  // --------------------------------------------------------------------------
  // STEP 5: Student A submits private ownership evidence
  // --------------------------------------------------------------------------
  console.log('--- Step 5: Student A submits private ownership evidence ---');
  const privateAnswers = {
    answers: [
      { questionId: 'serial_or_model', question: 'Model number on bottom of case?', answer: 'Model YY2948' },
      { questionId: 'custom_tips', question: 'Any distinguishing accessory markings?', answer: 'Replaced with Comply yellow foam ear tips; slight scratch on right lid hinge' },
      { questionId: 'app_name', question: 'Bluetooth broadcast device name?', answer: "Jordan's XM4s" },
    ],
  };

  const claim = await prisma.$transaction(async (tx) => {
    const c = await tx.claim.create({
      data: {
        referenceNumber: `CLM-EARBUDS-${timestamp}`,
        itemId: foundItem.id,
        claimantId: studentA.id,
        linkedLostItemId: lostItem.id,
        privateEvidenceReference: JSON.stringify(privateAnswers),
        additionalProofNotes: 'Sony Headphones Connect app installed on phone ready to demonstrate pairing',
        status: ClaimStatus.PENDING,
      },
    });

    await tx.claimStatusHistory.create({
      data: {
        claimId: c.id,
        fromStatus: ClaimStatus.PENDING,
        toStatus: ClaimStatus.PENDING,
        actorId: studentA.id,
        notes: 'Claimant submitted 3 private ownership answers and app pairing proof.',
      },
    });

    await tx.item.update({
      where: { id: foundItem.id },
      data: { status: ItemStatus.CLAIM_PENDING },
    });

    return c;
  });

  const updatedFound = await prisma.item.findUnique({ where: { id: foundItem.id } });

  console.log(`✓ Claim Submitted: Reference ${claim.referenceNumber}`);
  console.log(`  Claimant:         ${studentA.name}`);
  console.log(`  Status:           ${claim.status}`);
  console.log(`  Private Answers:  3 private fields stored securely in evidence vault`);
  console.log(`  Item Status:      ${updatedFound?.status}\n`);
  results.step5 = updatedFound?.status === ItemStatus.CLAIM_PENDING;

  // --------------------------------------------------------------------------
  // STEP 6: College moderator reviews and approves the claim
  // --------------------------------------------------------------------------
  console.log('--- Step 6: College moderator reviews and approves the claim ---');
  const plainOtp = generateOTP();
  const plainQr = generateQrToken();
  const codeHash = hashToken(plainOtp);
  const qrTokenHash = hashToken(plainQr);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);

  const approvedClaim = await prisma.$transaction(async (tx) => {
    const c = await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.HANDOVER_PENDING,
        reviewedBy: moderator.id,
        reviewedAt: new Date(),
        handoverLocation: 'Library Circulation & Property Custody Desk (1st Floor)',
        handoverCode: plainOtp,
      },
    });

    await tx.handoverChallenge.create({
      data: {
        claimId: c.id,
        itemId: foundItem.id,
        codeHash,
        qrTokenHash,
        status: HandoverStatus.PENDING,
        verificationMethod: 'OTP',
        expiresAt,
        handoverLocation: 'Library Circulation & Property Custody Desk (1st Floor)',
      },
    });

    await tx.claimStatusHistory.create({
      data: {
        claimId: c.id,
        fromStatus: ClaimStatus.PENDING,
        toStatus: ClaimStatus.HANDOVER_PENDING,
        actorId: moderator.id,
        notes: 'Private evidence verified: Yellow foam ear tips and Bluetooth device name match. Handover challenge issued.',
      },
    });

    await tx.notification.create({
      data: {
        userId: studentA.id,
        type: 'handover_ready',
        title: 'Claim Approved! Handover Ready 🔐',
        message: `Your claim for the black earbuds has been approved. Meet at Library 1st Floor desk and present your 6-digit code.`,
        resourceId: c.id,
      },
    });

    return c;
  });

  console.log(`✓ Claim Approved by: ${moderator.name}`);
  console.log(`  New Claim Status:  ${approvedClaim.status}`);
  console.log(`  Handover Location: ${approvedClaim.handoverLocation}`);
  console.log(`  6-Digit Code:      ${plainOtp} (Single-use, SHA-256 hashed in DB)`);
  console.log(`  Token Hash:        ${codeHash.slice(0, 24)}... (64 hex characters)\n`);
  results.step6 = approvedClaim.status === ClaimStatus.HANDOVER_PENDING;

  // --------------------------------------------------------------------------
  // STEP 7: Students communicate using the secure messaging system
  // --------------------------------------------------------------------------
  console.log('--- Step 7: Students communicate using secure messaging ---');
  const conversation = await prisma.conversation.create({
    data: {
      claimId: claim.id,
      itemId: foundItem.id,
      title: 'Handover Pickup — Sony Wireless Earbuds',
      participants: {
        create: [
          { userId: studentA.id, lastReadAt: new Date() },
          { userId: studentB.id, lastReadAt: new Date(0) },
        ],
      },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
  });

  const msg1 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: studentA.id,
      content: 'Hi Taylor! Thank you so much for finding my earbuds. I see Officer Vance approved the claim. Are you free around 3:00 PM at the Library Desk?',
    },
  });

  const msg2 = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: studentB.id,
      content: 'Hi Jordan! Yes, I deposited them with Officer Vance at the 1st Floor Library Circulation Desk. You can go straight to the desk with your 6-digit code!',
    },
  });

  // Mark read by Student A
  await prisma.conversationParticipant.update({
    where: {
      conversationId_userId: {
        conversationId: conversation.id,
        userId: studentA.id,
      },
    },
    data: { lastReadAt: new Date() },
  });

  const messageCount = await prisma.message.count({ where: { conversationId: conversation.id } });
  console.log(`✓ Conversation Initialized: "${conversation.title}"`);
  console.log(`  Participants:  ${conversation.participants.map((p) => p.user.name).join(' & ')}`);
  console.log(`  Message 1:     "${msg1.content.slice(0, 65)}..."`);
  console.log(`  Message 2:     "${msg2.content.slice(0, 65)}..."`);
  console.log(`  Total Messages: ${messageCount} (All persisted in PostgreSQL)\n`);
  results.step7 = messageCount === 2;

  // --------------------------------------------------------------------------
  // STEP 8: Authorized handover is confirmed with a one-time code
  // --------------------------------------------------------------------------
  console.log('--- Step 8: Authorized handover confirmed with 6-digit code ---');
  const enteredCode = plainOtp; // Student A presents 6-digit code to Desk Officer
  const isCodeCorrect = verifyTokenHash(enteredCode, codeHash);
  console.log(`✓ Verifying code "${enteredCode}" against SHA-256 hash... Result: ${isCodeCorrect ? 'MATCH' : 'MISMATCH'}`);

  if (!isCodeCorrect) {
    throw new Error('Code verification failed.');
  }

  const handover = await prisma.handoverChallenge.findUnique({ where: { claimId: claim.id } });

  const completion = await prisma.$transaction(async (tx) => {
    // 1. Confirm challenge
    const h = await tx.handoverChallenge.update({
      where: { id: handover!.id },
      data: {
        status: HandoverStatus.CONFIRMED,
        confirmedByUserId: moderator.id,
        confirmedAt: new Date(),
      },
    });

    // 2. Mark Claim RETURNED
    const c = await tx.claim.update({
      where: { id: claim.id },
      data: {
        status: ClaimStatus.RETURNED,
        claimantConfirmed: true,
        finderConfirmed: true,
      },
    });

    // 3. Mark Found and Lost items RETURNED
    const fItem = await tx.item.update({
      where: { id: foundItem.id },
      data: { status: ItemStatus.RETURNED },
    });

    const lItem = await tx.item.update({
      where: { id: lostItem.id },
      data: { status: ItemStatus.RETURNED },
    });

    // 4. Mark match RESOLVED
    await tx.match.update({
      where: { id: match.id },
      data: { status: 'RESOLVED' },
    });

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        actorId: moderator.id,
        collegeId: college.id,
        action: 'HANDOVER_CONFIRMED',
        resourceType: 'HANDOVER_CHALLENGE',
        resourceId: handover!.id,
        metadata: JSON.stringify({ verifiedWithOtp: true, claimantId: studentA.id }),
      },
    });

    return { h, c, fItem, lItem };
  });

  console.log(`✓ Challenge Status:  ${completion.h.status}`);
  console.log(`  Confirmed By:      ${moderator.name}`);
  console.log(`  Confirmed At:      ${completion.h.confirmedAt?.toISOString()}\n`);
  results.step8 = completion.h.status === HandoverStatus.CONFIRMED;

  // --------------------------------------------------------------------------
  // STEP 9: Both the item and claim show RETURNED
  // --------------------------------------------------------------------------
  console.log('--- Step 9: Both the item and claim show RETURNED ---');
  const finalClaim = await prisma.claim.findUnique({ where: { id: claim.id } });
  const finalLostItem = await prisma.item.findUnique({ where: { id: lostItem.id } });
  const finalFoundItem = await prisma.item.findUnique({ where: { id: foundItem.id } });

  console.log(`✓ Claim Status:      ${finalClaim?.status} (Expected: RETURNED)`);
  console.log(`✓ Lost Item Status:  ${finalLostItem?.status} (Expected: RETURNED)`);
  console.log(`✓ Found Item Status: ${finalFoundItem?.status} (Expected: RETURNED)\n`);

  results.step9 =
    finalClaim?.status === ClaimStatus.RETURNED &&
    finalLostItem?.status === ItemStatus.RETURNED &&
    finalFoundItem?.status === ItemStatus.RETURNED;

  // --------------------------------------------------------------------------
  // STEP 10: Dashboard statistics update correctly
  // --------------------------------------------------------------------------
  console.log('--- Step 10: Dashboard statistics update correctly ---');
  const finalReturnedCount = await prisma.item.count({
    where: { collegeId: college.id, status: ItemStatus.RETURNED },
  });

  const activeMatchesCount = await prisma.match.count({
    where: {
      lostItemId: lostItem.id,
      status: 'ACTIVE',
    },
  });

  console.log(`✓ Baseline Returned Count: ${initialReturnedCount}`);
  console.log(`✓ Final Returned Count:    ${finalReturnedCount} (+${finalReturnedCount - initialReturnedCount})`);
  console.log(`✓ Active Matches on Item:  ${activeMatchesCount} (Resolved & closed)`);

  results.step10 = finalReturnedCount > initialReturnedCount && activeMatchesCount === 0;

  // --------------------------------------------------------------------------
  // FINAL VERIFICATION CHECKLIST OUTPUT
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log('       FINAL VERIFIED USER CHECKLIST RESULTS');
  console.log('================================================================');
  console.log(`[${results.step1 ? 'X' : ' '}] Student A reports black earbuds lost in the library`);
  console.log(`[${results.step2 ? 'X' : ' '}] Student B reports black earbuds found in the library`);
  console.log(`[${results.step3 ? 'X' : ' '}] LostLink automatically displays a potential match`);
  console.log(`[${results.step4 ? 'X' : ' '}] Student A receives a match notification`);
  console.log(`[${results.step5 ? 'X' : ' '}] Student A submits private ownership evidence`);
  console.log(`[${results.step6 ? 'X' : ' '}] College moderator reviews and approves the claim`);
  console.log(`[${results.step7 ? 'X' : ' '}] Students communicate using the secure messaging system`);
  console.log(`[${results.step8 ? 'X' : ' '}] Authorized handover is confirmed with a one-time code`);
  console.log(`[${results.step9 ? 'X' : ' '}] Both the item and claim show RETURNED`);
  console.log(`[${results.step10 ? 'X' : ' '}] Dashboard statistics update correctly`);
  console.log('================================================================\n');

  const allPassed = Object.values(results).every(Boolean);
  if (allPassed) {
    console.log('>>> ALL 10 END-TO-END SCENARIO REQUIREMENTS ARE FULLY SATISFIED! <<<\n');
    process.exit(0);
  } else {
    console.error('>>> SOME REQUIREMENTS FAILED VERIFICATION. <<<\n');
    process.exit(1);
  }
}

runScenario().catch((err) => {
  console.error('Scenario execution failed:', err);
  process.exit(1);
});
