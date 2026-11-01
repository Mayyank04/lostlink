'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ItemReport } from '@/types/report';
import { ReportService, MatchingService } from '@/lib/services/api';
import { StatusBadge } from '@/components/common/StatusBadge';
import { MatchScore } from '@/components/matching/MatchScore';
import { ClaimForm } from '@/components/claims/ClaimForm';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS, formatDate, formatDateTime } from '@/lib/utils';
import { MOCK_COLLEGES } from '@/data/colleges';
import {
  MapPin,
  Calendar,
  Building,
  ShieldCheck,
  Share2,
  Flag,
  ArrowLeft,
  Sparkles,
  MessageSquare,
  Lock,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const { success, error, info } = useToast();

  const [item, setItem] = useState<ItemReport | null>(null);
  const [similarItems, setSimilarItems] = useState<ItemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    ReportService.getReportById(id).then((found) => {
      if (found) {
        setItem(found);
        setSelectedImage(found.images[0] || '');
        ReportService.incrementViews(found.id);

        // Fetch similar items in same category
        ReportService.getReports({ category: found.category, collegeId: found.collegeId }).then((all) => {
          setSimilarItems(all.filter((r) => r.id !== found.id).slice(0, 3));
        });
      }
      setIsLoading(false);
    });
  }, [id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl text-center">
        <div className="w-10 h-10 border-4 border-brandTeal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading item verification record...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="container mx-auto px-4 sm:px-6 py-16 max-w-md text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Listing Not Found</h2>
        <p className="text-xs text-slate-500">This report may have been archived, returned, or deleted by its author.</p>
        <Link href="/discover">
          <Button size="sm" variant="primary">Return to Catalog</Button>
        </Link>
      </div>
    );
  }

  const college = MOCK_COLLEGES.find((c) => c.id === item.collegeId);
  const categoryInfo = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.other;

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      success('Link Copied', 'Direct reference link copied to your clipboard.');
    } else {
      info('URL', window.location.href);
    }
  };

  const handleFlagReport = () => {
    success('Moderation Alert Sent', 'Thank you. Campus safety staff will review this report.');
    setFlagModalOpen(false);
    setFlagReason('');
  };

  const isOwner = user?.id === item.reporterId;

  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 max-w-5xl space-y-6">
      {/* Back button and quick actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to listings
        </button>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleShare} className="text-xs">
            <Share2 className="w-3.5 h-3.5 mr-1" /> Share
          </Button>
          {!isOwner && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setFlagModalOpen(true)}
              className="text-xs text-slate-400 hover:text-rose-600"
            >
              <Flag className="w-3.5 h-3.5 mr-1" /> Flag
            </Button>
          )}
        </div>
      </div>

      {/* Main Item Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative h-80 sm:h-96 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800">
            {selectedImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selectedImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                No Safe Public Photo Provided
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-2">
              <StatusBadge status={item.status} type={item.type} />
              {item.finderDepositedWithOffice && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-600 text-white shadow-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Campus Safe Custody
                </span>
              )}
            </div>

            <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-md bg-slate-900/80 backdrop-blur-xs font-mono text-xs text-white">
              {item.referenceNumber}
            </div>
          </div>

          {/* Thumbnails if multiple images */}
          {item.images && item.images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {item.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img
                      ? 'border-brandTeal-600 scale-95'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Zero-Knowledge Privacy Guarantee Banner */}
          <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 flex items-start gap-3">
            <Lock className="w-5 h-5 text-brandTeal-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Zero-Knowledge Privacy Guaranteed
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Private ownership markers (inscribed initials, serial snippets, lock screen images) and phone numbers are hidden from public view to protect students from fraud.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Key Details & Actions */}
        <div className="lg:col-span-5 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-brandTeal-700 dark:text-brandTeal-400">
                {categoryInfo.label}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400" />
                {item.viewsCount} views
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {item.title}
            </h1>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              {item.publicDescription}
            </p>
          </div>

          {/* Attribute Checklist Box */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 text-xs">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase text-[11px] tracking-wider">
              Verification Specifications
            </h4>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-slate-400 text-[11px]">Primary Color</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.color}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Brand / Maker</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.brand || 'Unspecified'}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Date Last Seen / Found</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(item.dateOccurred)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-[11px]">Approximate Time</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">{item.timeOccurred || 'Not recorded'}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <span className="text-slate-400 text-[11px]">Campus Facility / Grounds</span>
              <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brandTeal-600" />
                {item.locationBuilding} {item.locationRoomOrSpecifics ? `(${item.locationRoomOrSpecifics})` : ''}
              </p>
              <p className="text-[11px] text-slate-500 pl-5">
                {college?.name}
              </p>
            </div>

            {item.finderDepositedWithOffice && (
              <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-900 dark:text-blue-300">
                <strong>Campus Office Storage:</strong> {item.officeLocationNotes || 'Kept at central lost & found circulation desk.'}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="space-y-2.5">
            {item.type === 'found' && (
              <Button
                size="lg"
                variant="primary"
                onClick={() => setClaimModalOpen(true)}
                className="w-full text-sm font-bold shadow-card"
                disabled={item.status === 'returned' || item.status === 'closed'}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                {item.status === 'pending_claim' ? 'Claim in Progress (Submit Alternate Proof)' : 'This is Mine — Claim Item'}
              </Button>
            )}

            {item.type === 'lost' && (
              <Link href={`/report/found`}>
                <Button size="lg" variant="secondary" className="w-full text-sm font-bold shadow-card">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Found This? Report Found Match
                </Button>
              </Link>
            )}

            <Link href="/messages">
              <Button size="md" variant="outline" className="w-full text-xs">
                <MessageSquare className="w-4 h-4 mr-2" />
                Message Campus Custodian Desk
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Similar Items in Same Category */}
      {similarItems.length > 0 && (
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Similar Items in {categoryInfo.label}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {similarItems.map((sim) => (
              <Link
                key={sim.id}
                href={`/items/${sim.id}`}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-subtle transition-all flex items-center gap-3"
              >
                <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                  {sim.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sim.images[0]} alt={sim.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{sim.title}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sim.locationBuilding}</p>
                  <StatusBadge status={sim.status} type={sim.type} showDot={false} className="mt-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Claim Form Modal */}
      <Modal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        title="Submit Ownership Verification Claim"
        description={`Found item: "${item.title}" (${item.referenceNumber})`}
        maxWidth="lg"
      >
        <ClaimForm
          foundReport={item}
          onSuccess={(claim) => {
            setClaimModalOpen(false);
            router.push(`/claims/${claim.id}`);
          }}
          onCancel={() => setClaimModalOpen(false)}
        />
      </Modal>

      {/* Flag / Moderation Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        title="Report Listing to Campus Moderation"
        description="Notify campus safety of inaccurate, inappropriate, or suspicious posts."
        maxWidth="md"
      >
        <div className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-700 dark:text-slate-300">Reason for Report</label>
            <textarea
              rows={3}
              placeholder="e.g. Inappropriate photo, fraudulent report, duplicate listing..."
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setFlagModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="destructive" onClick={handleFlagReport}>
              Submit Flag
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

