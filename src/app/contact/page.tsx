'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { School, MapPin, Mail, Phone, ShieldCheck } from 'lucide-react';

export default function ContactPage() {
  const { activeCollege, activeCampus } = useAuth();
  const { success } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      success('Inquiry Dispatched', `Your message was delivered to ${activeCollege.shortName} Campus Dispatch.`);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl space-y-8">
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-brandTeal-700 dark:text-brandTeal-400">
          Campus Custody Dispatch
        </span>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Contact Lost & Found Office
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Reach property administrators at {activeCollege.name} or file an institutional escalation.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Contact Form */}
        <div className="md:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-card space-y-4 text-xs"
          >
            <Input
              label="Your Name *"
              placeholder="Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label="University Email *"
              type="email"
              placeholder="student@apex.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Subject / Report Reference"
              placeholder="e.g. Inquiring regarding LL-2026-8812"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />

            <Textarea
              label="Message *"
              placeholder="Detail your question or report concern..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" size="md" className="w-full text-xs font-bold" isLoading={isSubmitting}>
              Send Message to Campus Desk
            </Button>
          </form>
        </div>

        {/* Office Details */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-subtle space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <School className="w-4 h-4 text-brandTeal-600" />
              {activeCollege.name}
            </h3>

            <div className="space-y-3 text-slate-600 dark:text-slate-400">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Main Custody Location</p>
                  <p>{activeCampus?.lostFoundOffice.room}</p>
                  <p className="text-[11px] text-slate-400">{activeCampus?.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Official Dispatch Email</p>
                  <p className="text-brandTeal-600 font-mono">{activeCampus?.lostFoundOffice.contactEmail}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Campus Safety Desk Phone</p>
                  <p>{activeCollege.supportPhone || '+1 (555) 234-5678'}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Operating Schedule: {activeCampus?.lostFoundOffice.operatingHours}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

