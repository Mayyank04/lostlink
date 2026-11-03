'use client';

import React from 'react';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileCheck,
  UserCheck,
  Users,
  FileText,
  ShieldAlert,
  GitCompare,
  Megaphone,
  Bell,
  Shield,
  BarChart3,
  Server,
  Activity,
  ScrollText,
  Lock,
  Settings,
} from 'lucide-react';

export type PlatformAdminSection =
  | 'overview'
  | 'colleges'
  | 'add-college'
  | 'applications'
  | 'admins'
  | 'students'
  | 'reports'
  | 'matching'
  | 'claims'
  | 'moderation'
  | 'notifications'
  | 'analytics'
  | 'infrastructure'
  | 'workers'
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
  { id: 'colleges', label: '2. Colleges', icon: Building2 },
  { id: 'add-college', label: '3. Add College', icon: PlusCircle },
  { id: 'applications', label: '4. College Applications', icon: FileCheck },
  { id: 'admins', label: '5. College Administrators', icon: UserCheck },
  { id: 'students', label: '6. Students and Users', icon: Users },
  { id: 'reports', label: '7. Lost/Found Reports', icon: FileText },
  { id: 'matching', label: '8. Matches', icon: GitCompare },
  { id: 'claims', label: '9. Claims and Disputes', icon: ShieldAlert },
  { id: 'moderation', label: '10. Moderation', icon: Shield },
  { id: 'notifications', label: '11. Notifications', icon: Bell },
  { id: 'analytics', label: '12. Platform Analytics', icon: BarChart3 },
  { id: 'infrastructure', label: '13. Kubernetes and Infrastructure', icon: Server },
  { id: 'workers', label: '14. Worker Monitoring', icon: Activity },
  { id: 'audit', label: '15. Audit Logs', icon: ScrollText },
  { id: 'security', label: '16. Security', icon: Lock },
  { id: 'settings', label: '17. Platform Settings', icon: Settings },
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

