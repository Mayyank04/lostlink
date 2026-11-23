import { itemRepository, ItemFilters } from '../repositories/item.repository';
import { AuthenticatedUser } from '@/lib/auth/session';
import { requireCollegeMembership } from '@/lib/auth/tenant';
import { encryptEvidence } from '@/lib/crypto/evidenceEncryption';
import { triggerMatchingEngineForItem } from '@/lib/matching/matchEngine';
import { enqueueMatchingJob } from '@/lib/hybrid/queue';
import { NotFoundError, AuthorizationError, ValidationError } from '@/lib/errors';
import { ItemReportType, ItemStatus } from '@prisma/client';
import { prisma } from '@/lib/db';

export interface CreateReportInput {
  type: 'LOST' | 'FOUND';
  title: string;
  category: string;
  brand?: string | null;
  color?: string | null;
  description: string;
  dateIncident: string;
  timeIncident?: string | null;
  collegeId: string;
  campusId?: string | null;
  locationId?: string | null;
  locationDescription: string;
  isPublic?: boolean;
  depositedWithOffice?: boolean;
  images?: Array<{ url: string; isPrimary?: boolean }>;
  privateEvidence?: Array<{
    evidenceType: string;
    description?: string | null;
    fileUrl?: string | null;
  }>;
}

export const itemService = {
  async getItems(filters: ItemFilters) {
    const [items, total] = await Promise.all([
      itemRepository.findMany(filters),
      itemRepository.count(filters),
    ]);
    return { items, total };
  },

  async getItemById(id: string) {
    const item = await itemRepository.findById(id);
    if (!item) {
      throw new NotFoundError('Item not found');
    }
    return item;
  },

  async createReport(user: AuthenticatedUser, input: CreateReportInput) {
    requireCollegeMembership(user, input.collegeId);

    let campusId = input.campusId;
    if (!campusId) {
      const defaultCampus = await prisma.campus.findFirst({
        where: { collegeId: input.collegeId },
      });
      campusId = defaultCampus?.id || '';
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const prefix = input.type === 'LOST' ? 'LL' : 'FD';
    const reportNumber = `${prefix}-${new Date().getFullYear()}-${randomSuffix}`;

    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          reportNumber,
          type: input.type === 'LOST' ? ItemReportType.LOST : ItemReportType.FOUND,
          name: input.title,
          category: input.category,
          brand: input.brand || null,
          color: input.color || 'Unspecified',
          description: input.description,
          occurredAt: new Date(input.dateIncident),
          collegeId: input.collegeId,
          campusId: campusId!,
          locationId: input.locationId || null,
          locationBuilding: input.locationDescription,
          depositedWithOffice: input.depositedWithOffice || false,
          reporterId: user.id,
          status: ItemStatus.OPEN,
        },
      });

      if (input.images && input.images.length > 0) {
        await tx.itemImage.createMany({
          data: input.images.map((img, idx) => ({
            itemId: item.id,
            objectKey: `uploads/${item.id}-${idx}`,
            url: img.url,
            visibility: 'PUBLIC',
          })),
        });
      }

      if (input.privateEvidence && input.privateEvidence.length > 0) {
        await tx.privateItemEvidence.create({
          data: {
            itemId: item.id,
            encryptedEvidence: encryptEvidence(input.privateEvidence),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          collegeId: input.collegeId,
          action: 'CREATE_REPORT',
          resourceType: 'ITEM',
          resourceId: item.id,
          metadata: JSON.stringify({
            reportNumber,
            type: input.type,
            hasEvidence: (input.privateEvidence?.length || 0) > 0,
          }),
        },
      });

      return item;
    });

    triggerMatchingEngineForItem(createdItem.id).catch((err) =>
      console.error('Match engine execution failed:', err)
    );

    enqueueMatchingJob(createdItem.id).catch((err) =>
      console.error('[HybridQueue] Failed to enqueue matching job:', err)
    );

    return createdItem;
  },

  async archiveItem(user: AuthenticatedUser, itemId: string) {
    const item = await itemRepository.findById(itemId);
    if (!item) {
      throw new NotFoundError('Item not found');
    }

    if (item.reporterId !== user.id && user.role !== 'PLATFORM_ADMIN' && user.role !== 'COLLEGE_ADMIN') {
      throw new AuthorizationError('You are not authorized to archive this report');
    }

    return itemRepository.archive(itemId);
  },
};
