'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  AdminSidebar,
  PlatformAdminSection,
  NAV_ITEMS,
} from '@/components/platform-admin/AdminSidebar';
import { OverviewSection } from '@/components/platform-admin/OverviewSection';
import { CollegesSection } from '@/components/platform-admin/CollegesSection';
import { ApplicationsSection } from '@/components/platform-admin/ApplicationsSection';
import { AdminsSection } from '@/components/platform-admin/AdminsSection';
import { StudentsSection } from '@/components/platform-admin/StudentsSection';
import { ReportsSection } from '@/components/platform-admin/ReportsSection';
import { ClaimsSection } from '@/components/platform-admin/ClaimsSection';
import { MatchingSection } from '@/components/platform-admin/MatchingSection';
import { AnnouncementsSection } from '@/components/platform-admin/AnnouncementsSection';
import { ModerationSection } from '@/components/platform-admin/ModerationSection';
import { AnalyticsSection } from '@/components/platform-admin/AnalyticsSection';
import { InfrastructureSection } from '@/components/platform-admin/InfrastructureSection';
import { AuditLogsSection } from '@/components/platform-admin/AuditLogsSection';
import { SecuritySection } from '@/components/platform-admin/SecuritySection';
import { SettingsSection } from '@/components/platform-admin/SettingsSection';
import { ShieldAlert, Globe2, RefreshCw, ChevronRight } from 'lucide-react';
import Link from 'next/link';

function PlatformAdminContent() {
  const searchParams = useSearchParams();
  const { user, role, serverAuthenticated, login } = useAuth();
  const { error, success } = useToast();

  const [activeSection, setActiveSection] = useState<PlatformAdminSection>('overview');
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab') as PlatformAdminSection;
    if (tab && NAV_ITEMS.some((n) => n.id === tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleSelectSection = (section: PlatformAdminSection) => {
    setActiveSection(section);
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      params.set('tab', section);
      window.history.pushState(null, '', `?${params.toString()}`);
    }
  };

  const loadOverview = async () => {
    setIsLoadingOverview(true);
    try {
      const res = await fetch('/api/platform-admin/overview');
      const data = await res.json();
      if (data.success || data.summary) {
        setOverviewData(data);
      }
    } catch (err: any) {
      console.error('Error fetching overview', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  const loadPendingApplications = async () => {
    try {
      const res = await fetch('/api/platform-admin/applications?status=PENDING');
      const data = await res.json();
      if (data.success && data.applications) {
        setPendingAppsCount(data.applications.length);
      }
    } catch {}
  };

  useEffect(() => {
    if (serverAuthenticated && role === 'platform_admin') {
      loadOverview();
      loadPendingApplications();
    }
  }, [serverAuthenticated, role]);

  // Auth Guard: Genuine Server Session Required
  if (!serverAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Platform Administrator Session Required
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          Accessing the Super Admin Command Center, provisioning institution tenants, and managing federation
          infrastructure requires an authenticated <code className="font-mono font-bold text-purple-600">PLATFORM_ADMIN</code> server session.
          Demo simulation mode cannot perform live database modifications.
        </p>

        <div className="pt-3 flex flex-col sm:flex-row gap-2 justify-center">
          <Link
            href="/auth/login?redirect=/platform-admin"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-700 text-white hover:bg-purple-800 transition-colors shadow-sm"
          >
            Sign In with Administrator Credentials
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
          >
            Return to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (role !== 'platform_admin') {
    return (
      <div className="container mx-auto px-4 py-16 max-w-lg text-center space-y-4">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/60 flex items-center justify-center">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          Access Restricted: Super Administrator Only
        </h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          This command center requires the <code className="font-mono font-bold text-rose-600">PLATFORM_ADMIN</code> role.
          If this is a local development instance, promote your account using:
        </p>
        <div className="p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] text-left">
          npm run admin:bootstrap -- --email your.email@institution.edu
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const currentNav = NAV_ITEMS.find((n) => n.id === activeSection);

  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 space-y-6 max-w-7xl">
      {/* Top Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
            <Globe2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Super Admin Command Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                PLATFORM_ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Federation Governance, Dynamic College Onboarding & Cloud Infrastructure Control
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto text-xs">
          <span className="text-slate-400 font-mono hidden sm:inline">
            Logged in as: <strong>{user?.email}</strong>
          </span>
          <button
            onClick={() => {
              loadOverview();
              loadPendingApplications();
            }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            title="Refresh All Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Body: 17-Section Sidebar + Active Content Panel */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <AdminSidebar
          currentSection={activeSection}
          onSelectSection={handleSelectSection}
          pendingApplicationsCount={pendingAppsCount}
        />

        <main className="flex-1 w-full min-w-0 space-y-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
            <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Platform
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-purple-600">Command Center</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 dark:text-white">
              {currentNav?.label || activeSection}
            </span>
          </div>

          {activeSection === 'overview' && (
            <OverviewSection
              overviewData={overviewData}
              isLoading={isLoadingOverview}
              onRefresh={loadOverview}
              onNavigateSection={handleSelectSection}
            />
          )}

          {activeSection === 'colleges' && <CollegesSection initialAddOpen={false} />}

          {activeSection === 'add-college' && <CollegesSection initialAddOpen={true} />}

          {activeSection === 'applications' && <ApplicationsSection />}

          {activeSection === 'admins' && <AdminsSection />}

          {activeSection === 'students' && <StudentsSection />}

          {activeSection === 'reports' && <ReportsSection />}

          {activeSection === 'matching' && <MatchingSection />}

          {activeSection === 'claims' && <ClaimsSection />}

          {activeSection === 'moderation' && <ModerationSection />}

          {(activeSection === 'notifications' || (activeSection as any) === 'announcements') && (
            <AnnouncementsSection />
          )}

          {activeSection === 'analytics' && (
            <AnalyticsSection overviewData={overviewData} />
          )}

          {activeSection === 'infrastructure' && <InfrastructureSection />}

          {activeSection === 'workers' && <MatchingSection />}

          {activeSection === 'audit' && <AuditLogsSection />}

          {activeSection === 'security' && <SecuritySection />}

          {activeSection === 'settings' && <SettingsSection />}
        </main>
      </div>
    </div>
  );
}

export default function PlatformAdminPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Command Center...</div>}>
      <PlatformAdminContent />
    </Suspense>
  );
}
