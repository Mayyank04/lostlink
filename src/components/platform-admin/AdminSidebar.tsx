'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  FileCheck,
  UserCheck,
  Users,
  FileText,
  ShieldAlert,
  GitCompare,
  Megaphone,
  Shield,
  BarChart3,
  Server,
  ScrollText,
  Lock,
  Settings,
} from 'lucide-react';

export type PlatformAdminSection =
  | 'overview'
  | 'colleges'
  | 'applications'
  | 'admins'
  | 'students'
  | 'reports'
  | 'claims'
  | 'matching'
  | 'announcements'
  | 'moderation'
  | 'analytics'
  | 'infrastructure'
  | 'audit'
  | 'security'
  | 'settings';

interface AdminSidebarProps {
  currentSection: PlatformAdminSection;
  onSelectSection: (section: PlatformAdminSection) => void;
  pendingApplicationsCount?: number;
}

export const NAV_ITEMS: { id: PlatformAdminSection; label: string; icon: any; badge?: string }[] = [
  { id: 'overview', label: '1. Overview', icon: LayoutDashboard },
  { id: 'colleges', label: '2. Manage Colleges', icon: Building2 },
  { id: 'applications', label: '3. College Applications', icon: FileCheck },
  { id: 'admins', label: '4. College Admins', icon: UserCheck },
  { id: 'students', label: '5. Students', icon: Users },
  { id: 'reports', label: '6. Reports', icon: FileText },
  { id: 'claims', label: '7. Claims & Disputes', icon: ShieldAlert },
  { id: 'matching', label: '8. Matching Operations', icon: GitCompare },
  { id: 'announcements', label: '9. Announcements', icon: Megaphone },
  { id: 'moderation', label: '10. Moderation', icon: Shield },
  { id: 'analytics', label: '11. Analytics', icon: BarChart3 },
  { id: 'infrastructure', label: '12. Infrastructure Health', icon: Server },
  { id: 'audit', label: '13. Audit Logs', icon: ScrollText },
  { id: 'security', label: '14. Security & RBAC', icon: Lock },
  { id: 'settings', label: '15. Platform Settings', icon: Settings },
];

export function AdminSidebar({
  currentSection,
  onSelectSection,
  pendingApplicationsCount = 0,
}: AdminSidebarProps) {
  return (
    <aside className="w-full md:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-card shrink-0">
      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Command Center Sections
        </p>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentSection === item.id;
          const hasBadge = item.id === 'applications' && pendingApplicationsCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectSection(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all ${
                isActive
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {hasBadge && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                  {pendingApplicationsCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
