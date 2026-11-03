'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { School, Globe, MapPin, Building, Mail, Send, CheckCircle2 } from 'lucide-react';

interface RequestCollegeModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefillName?: string;
}

export const RequestCollegeModal: React.FC<RequestCollegeModalProps> = ({
  isOpen,
  onClose,
  prefillName = '',
}) => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [collegeName, setCollegeName] = useState(prefillName);
  const [shortName, setShortName] = useState('');
  const [country, setCountry] = useState('India');
  const [state, setState] = useState('Uttar Pradesh');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');
  const [domain, setDomain] = useState('');
  const [applicantName, setApplicantName] = useState(user?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(user?.email || '');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  React.useEffect(() => {
    if (prefillName && !collegeName) {
      setCollegeName(prefillName);
    }
  }, [prefillName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!collegeName.trim() || !country.trim() || !state.trim() || !city.trim() || !applicantEmail.trim() || !applicantName.trim()) {
      error('Validation Error', 'College name, country, state, city, your name and email are required');
      return;
    }

    if (domain && domain.includes('@')) {
      error('Invalid Domain', 'Domain must be without @ (e.g. iilm.edu)');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/colleges/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collegeName: collegeName.trim(),
          shortName: shortName.trim() || undefined,
          country: country.trim(),
          state: state.trim(),
          city: city.trim(),
          website: website.trim() || undefined,
          domain: domain.trim().toLowerCase() || undefined,
          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim().toLowerCase(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 201 || data.success) {
        success('College Requested', `Request for "${collegeName}" submitted to platform administrators for verification!`);
        setSubmittedSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2200);
      } else if (data.alreadyPending) {
        success('Already Under Review', data.message);
        handleClose();
      } else {
        error('Request Failed', data.error || 'Failed to submit college request');
      }
    } catch (err: any) {
      error('Network Error', err.message || 'Could not communicate with server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setCollegeName('');
    setShortName('');
    setCity('');
    setWebsite('');
    setDomain('');
    setNotes('');
    setSubmittedSuccess(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSubmitting ? () => {} : handleClose}
      title="Request My College"
      description="Can't find your campus? Submit an institution onboarding request for platform verification."
      maxWidth="md"
    >
      {submittedSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            Request Received!
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Our platform administrators verify all institutional requests to guarantee a secure, trusted campus lost-and-found registry. You will receive an update at <strong>{applicantEmail}</strong>.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Input
                label="College / University Name *"
                placeholder="e.g. Bennett University"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                label="Abbr / Short Name"
                placeholder="e.g. BU"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Country *"
              placeholder="e.g. India"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
            />
            <Input
              label="State / Region *"
              placeholder="e.g. Uttar Pradesh"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
            <Input
              label="City *"
              placeholder="e.g. Greater Noida"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Official Website"
              placeholder="https://www.institution.edu"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <div>
              <Input
                label="Approved Domain (Optional)"
                placeholder="e.g. institution.edu.in"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-0.5">
                Domain only, without &apos;@&apos;
              </p>
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
            <p className="font-bold text-slate-900 dark:text-white mb-2">
              Your Contact Details (for verification updates)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Your Full Name *"
                placeholder="Full Name"
                value={applicantName}
                onChange={(e) => setApplicantName(e.target.value)}
                required
              />
              <Input
                label="Your University / Personal Email *"
                type="email"
                placeholder="student@institution.edu"
                value={applicantEmail}
                onChange={(e) => setApplicantEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Knowledge Park campus, lost-and-found desk located in main library."
              rows={2}
              className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brandTeal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button size="sm" variant="outline" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" type="submit" disabled={isSubmitting}>
              <Send className="w-3.5 h-3.5 mr-1" />
              {isSubmitting ? 'Submitting Request...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
