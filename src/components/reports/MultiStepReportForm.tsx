'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { ReportType, ItemCategory, ItemReport } from '@/types/report';
import { ReportService, MatchingService } from '@/lib/services/api';
import { CATEGORY_LABELS, generateReferenceNumber } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PhotoUploader } from '@/components/reports/PhotoUploader';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Building,
  MapPin,
  Calendar,
  Lock,
  ShieldCheck,
  FileText,
  Sparkles,
  Info,
} from 'lucide-react';

interface MultiStepReportFormProps {
  reportType: ReportType;
}

export const MultiStepReportForm: React.FC<MultiStepReportFormProps> = ({ reportType }) => {
  const router = useRouter();
  const { user, activeCollege, allColleges } = useAuth();
  const { success, error } = useToast();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdReport, setCreatedReport] = useState<ItemReport | null>(null);
  const [potentialMatchesCount, setPotentialMatchesCount] = useState<number>(0);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ItemCategory>('electronics');
  const [brand, setBrand] = useState('');
  const [color, setColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');
  const [publicDescription, setPublicDescription] = useState('');

  const [collegeId, setCollegeId] = useState(activeCollege.id);
  const selectedCollege = allColleges.find((c) => c.id === collegeId) || activeCollege;
  const [campusId, setCampusId] = useState(selectedCollege.campuses[0]?.id || '');
  const [locationBuilding, setLocationBuilding] = useState('');
  const [locationRoomOrSpecifics, setLocationRoomOrSpecifics] = useState('');
  const [dateOccurred, setDateOccurred] = useState(new Date().toISOString().split('T')[0]);
  const [timeOccurred, setTimeOccurred] = useState('14:00');

  const [images, setImages] = useState<string[]>([]);
  const [depositedWithOffice, setDepositedWithOffice] = useState(false);
  const [officeLocationNotes, setOfficeLocationNotes] = useState('');
  const [uniqueIdentifiers, setUniqueIdentifiers] = useState('');
  const [serialNumberSnippet, setSerialNumberSnippet] = useState('');
  const [privateNotes, setPrivateNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!title.trim()) newErrors.title = 'Item title is required';
      if (!color.trim()) newErrors.color = 'Primary color is required';
      if (!publicDescription.trim() || publicDescription.trim().length < 15) {
        newErrors.publicDescription = 'Please provide at least 15 characters describing the item';
      }
    } else if (currentStep === 2) {
      if (!locationBuilding.trim()) newErrors.locationBuilding = 'Building / campus facility is required';
      if (!dateOccurred) newErrors.dateOccurred = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => Math.min(4, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2)) return;

    setIsSubmitting(true);
    try {
      const prefix = reportType === 'lost' ? 'LL' : 'FD';
      const referenceNumber = generateReferenceNumber(prefix);

      const newReport: ItemReport = {
        id: `rep-${Date.now()}`,
        referenceNumber,
        type: reportType,
        title: title.trim(),
        category,
        brand: brand.trim() || undefined,
        color: color.trim(),
        secondaryColor: secondaryColor.trim() || undefined,
        publicDescription: publicDescription.trim(),
        collegeId,
        campusId,
        locationBuilding: locationBuilding.trim(),
        locationRoomOrSpecifics: locationRoomOrSpecifics.trim() || undefined,
        dateOccurred,
        timeOccurred: timeOccurred || undefined,
        images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80'],
        finderDepositedWithOffice: depositedWithOffice,
        officeLocationNotes: depositedWithOffice ? officeLocationNotes : undefined,
        privateEvidence: {
          uniqueIdentifiers: uniqueIdentifiers.trim() || undefined,
          serialNumberSnippet: serialNumberSnippet.trim() || undefined,
          privateNotes: privateNotes.trim() || undefined,
        },
        reporterId: user?.id || 'user-maya',
        reporterName: user?.name || 'Maya Lin',
        reporterEmail: user?.email || 'maya.lin@apex.edu',
        reporterPhone: user?.phone,
        status: 'active',
        moderationStatus: 'approved',
        viewsCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const created = await ReportService.createReport(newReport);
      setCreatedReport(created);

      // Check for immediate matches using matching engine
      const matches = await MatchingService.findMatchesForReport(created.id);
      setPotentialMatchesCount(matches.length);

      success(
        `${reportType === 'lost' ? 'Lost Item' : 'Found Item'} Reported Successfully`,
        `Reference: ${referenceNumber}. Your report is now active.`
      );
    } catch (e) {
      console.error(e);
      error('Submission Error', 'Failed to save report. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success Confirmation Screen
  if (createdReport) {
    return (
      <div className="max-w-xl mx-auto p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-card text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/30">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-2">
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
            {createdReport.referenceNumber}
          </span>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {reportType === 'lost' ? 'Lost Report Published' : 'Found Property Registered'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Your listing has been securely recorded. Campus members and campus lost-and-found desks can now discover this report.
          </p>
        </div>

        {potentialMatchesCount > 0 && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-left flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-brandTeal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-brandTeal-900 dark:text-brandTeal-200">
                {potentialMatchesCount} Potential Match{potentialMatchesCount > 1 ? 'es' : ''} Detected!
              </p>
              <p className="text-xs text-brandTeal-700/90 dark:text-brandTeal-300 mt-0.5">
                Our rule-based engine has identified existing reports that closely align with your submission.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            variant="primary"
            onClick={() => router.push(`/items/${createdReport.id}`)}
            className="w-full sm:w-auto text-xs"
          >
            View Published Report
          </Button>
          {potentialMatchesCount > 0 ? (
            <Button
              variant="secondary"
              onClick={() => router.push('/matches')}
              className="w-full sm:w-auto text-xs"
            >
              Review Matches ({potentialMatchesCount})
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push('/discover')}
              className="w-full sm:w-auto text-xs"
            >
              Browse Directory
            </Button>
          )}
        </div>
      </div>
    );
  }

  const stepsList = [
    { number: 1, title: 'Item Details' },
    { number: 2, title: 'Location & Time' },
    { number: 3, title: 'Photos & Verification' },
    { number: 4, title: 'Review & Publish' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Stepper */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-subtle">
        <div className="flex items-center justify-between">
          {stepsList.map((s, idx) => {
            const isCompleted = step > s.number;
            const isCurrent = step === s.number;
            return (
              <React.Fragment key={s.number}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCompleted
                        ? 'bg-brandTeal-700 text-white'
                        : isCurrent
                        ? 'bg-brandTeal-100 text-brandTeal-800 border-2 border-brandTeal-700 dark:bg-brandTeal-950 dark:text-brandTeal-300'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.number}
                  </div>
                  <span
                    className={`hidden sm:inline text-xs font-semibold ${
                      isCurrent
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    {s.title}
                  </span>
                </div>
                {idx < stepsList.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 rounded ${
                      step > s.number ? 'bg-brandTeal-600' : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-card space-y-6">
        {/* STEP 1: ITEM DETAILS */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 1: Item Identification
              </h3>
              <p className="text-xs text-slate-500">
                Provide clear, public-facing descriptions so peers and staff can identify the item.
              </p>
            </div>

            <Input
              label="Item Title / Name *"
              placeholder="e.g. 14-inch MacBook Pro, Toyota Car Key Fob, Student ID Card"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              error={errors.title}
              helperText="Be specific. Include device model or noticeable exterior type."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Item Category *"
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
              >
                {Object.entries(CATEGORY_LABELS).map(([key, info]) => (
                  <option key={key} value={key}>
                    {info.label}
                  </option>
                ))}
              </Select>

              <Input
                label="Brand / Manufacturer (Optional)"
                placeholder="e.g. Apple, Sony, Hydro Flask, North Face"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Color *"
                placeholder="e.g. Space Gray, Navy Blue, Silver, Black"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                error={errors.color}
              />

              <Input
                label="Secondary Accent Color (Optional)"
                placeholder="e.g. Teal Lanyard, Red Zipper, White Trim"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
              />
            </div>

            <Textarea
              label="Public Description *"
              placeholder="Describe where it was seen, general appearance, and noticeable non-private exterior traits..."
              rows={4}
              value={publicDescription}
              onChange={(e) => setPublicDescription(e.target.value)}
              error={errors.publicDescription}
              helperText="Do not include secret unlock passwords, full phone numbers, or private verification marks."
            />
          </div>
        )}

        {/* STEP 2: LOCATION & TIME */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 2: Campus Location & Timestamp
              </h3>
              <p className="text-xs text-slate-500">
                Where and when was this belonging last seen or found?
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="University / Institution *"
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  const col = allColleges.find((c) => c.id === e.target.value);
                  if (col && col.campuses[0]) setCampusId(col.campuses[0].id);
                }}
              >
                {allColleges.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Campus / Branch *"
                value={campusId}
                onChange={(e) => setCampusId(e.target.value)}
              >
                {selectedCollege.campuses.map((camp) => (
                  <option key={camp.id} value={camp.id}>
                    {camp.name}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              label="Campus Building / Facility *"
              placeholder="e.g. Alan Turing Memorial Library, Engineering Hall, Dining Hall"
              value={locationBuilding}
              onChange={(e) => setLocationBuilding(e.target.value)}
              error={errors.locationBuilding}
            />

            <Input
              label="Specific Room / Area (Optional)"
              placeholder="e.g. 2nd Floor Quiet Study Pod #14, Table near entrance"
              value={locationRoomOrSpecifics}
              onChange={(e) => setLocationRoomOrSpecifics(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date Occurred *"
                type="date"
                value={dateOccurred}
                onChange={(e) => setDateOccurred(e.target.value)}
                error={errors.dateOccurred}
              />

              <Input
                label="Approximate Time"
                type="time"
                value={timeOccurred}
                onChange={(e) => setTimeOccurred(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* STEP 3: PHOTOS & PRIVATE EVIDENCE */}
        {step === 3 && (
          <div className="space-y-5 animate-fade-in">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 3: Photographs & Private Verification Clues
              </h3>
              <p className="text-xs text-slate-500">
                Add optional photos and private details used strictly to confirm legitimate ownership.
              </p>
            </div>

            <PhotoUploader images={images} onChange={setImages} />

            {reportType === 'found' ? (
              <div className="p-4 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositedWithOffice}
                    onChange={(e) => setDepositedWithOffice(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brandTeal-600 focus:ring-brandTeal-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Deposited with Official Campus Lost & Found Office
                    </span>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      Check this if you have handed the item to campus security, library circulation desk, or student union staff.
                    </p>
                  </div>
                </label>

                {depositedWithOffice && (
                  <Input
                    label="Office Custody Room / Desk Reference"
                    placeholder="e.g. Student Union Room 104, Desk Attendant Sarah"
                    value={officeLocationNotes}
                    onChange={(e) => setOfficeLocationNotes(e.target.value)}
                  />
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/30 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span>Private Ownership Evidence (Strictly Confidential)</span>
                </div>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300 leading-relaxed">
                  These details will <strong>NEVER</strong> be displayed publicly. They are held in escrow and used solely during the claim verification step to prove the item belongs to you.
                </p>

                <Input
                  label="Secret Physical Marks / Stickers"
                  placeholder="e.g. Specific sticker on right palm rest, engraving on back"
                  value={uniqueIdentifiers}
                  onChange={(e) => setUniqueIdentifiers(e.target.value)}
                />

                <Input
                  label="Serial Number Snippet / Last 4 Digits"
                  placeholder="e.g. Ending in ...89F2"
                  value={serialNumberSnippet}
                  onChange={(e) => setSerialNumberSnippet(e.target.value)}
                />

                <Textarea
                  label="Lock Screen Wallpaper or Secret Content Clues"
                  placeholder="e.g. Lock screen photo is a dog on a beach; front pouch has yellow highlighter"
                  rows={2}
                  value={privateNotes}
                  onChange={(e) => setPrivateNotes(e.target.value)}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: REVIEW & SUBMIT */}
        {step === 4 && (
          <div className="space-y-5 animate-fade-in">
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Step 4: Review Your Report
              </h3>
              <p className="text-xs text-slate-500">
                Verify details before publishing to your campus directory.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="p-3.5 flex items-start justify-between">
                <div>
                  <span className="text-slate-400">Item Title:</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{title}</p>
                </div>
                <button onClick={() => setStep(1)} className="text-brandTeal-600 font-semibold hover:underline">
                  Edit
                </button>
              </div>

              <div className="p-3.5 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400">Category:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{CATEGORY_LABELS[category].label}</p>
                </div>
                <div>
                  <span className="text-slate-400">Color & Brand:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{color} {brand ? `• ${brand}` : ''}</p>
                </div>
              </div>

              <div className="p-3.5 flex items-start justify-between">
                <div>
                  <span className="text-slate-400">Campus Facility:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{locationBuilding}</p>
                  <p className="text-[11px] text-slate-500">{(selectedCollege.shortName || selectedCollege.name)} • {dateOccurred}</p>
                </div>
                <button onClick={() => setStep(2)} className="text-brandTeal-600 font-semibold hover:underline">
                  Edit
                </button>
              </div>

              <div className="p-3.5">
                <span className="text-slate-400">Public Description:</span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5 leading-relaxed">{publicDescription}</p>
              </div>

              <div className="p-3.5 flex items-start justify-between">
                <div>
                  <span className="text-slate-400">Attached Images:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{images.length} photos uploaded</p>
                </div>
                <button onClick={() => setStep(3)} className="text-brandTeal-600 font-semibold hover:underline">
                  Edit
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-brandTeal-600 shrink-0 mt-0.5" />
              <span>
                By submitting this report, you certify the information is genuine under university student conduct guidelines.
              </span>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={prevStep} disabled={isSubmitting}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button variant="primary" size="sm" onClick={nextStep}>
              Next Step <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button variant="primary" size="md" onClick={handleSubmit} isLoading={isSubmitting}>
              Publish {reportType === 'lost' ? 'Lost Report' : 'Found Property'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

