export type NotificationType =
  | 'match_found'
  | 'claim_received'
  | 'claim_approved'
  | 'claim_rejected'
  | 'handover_scheduled'
  | 'handover_completed'
  | 'moderation_alert'
  | 'system_update';

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl?: string;
  isRead: boolean;
  relatedReportId?: string;
  relatedClaimId?: string;
  createdAt: string;
}

