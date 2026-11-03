'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { CollegeSwitcher } from '@/components/common/CollegeSwitcher';
import { RoleSwitcher } from '@/components/common/RoleSwitcher';
import { NotificationService, MessageService } from '@/lib/services/api';
import {
  Compass,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  Bell,
  PlusCircle,
  Menu,
  X,
  Sun,
  Moon,
  LayoutDashboard,
  ShieldAlert,
  Building2,
  Search,
  School,
  User as UserIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, role, serverAuthenticated, isDemoMode } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [unreadMessages, setUnreadMessages] = useState(1);

  useEffect(() => {
    if (user) {
      NotificationService.getNotifications(user.id).then((items) => {
        setUnreadNotifications(items.filter((i) => !i.isRead).length);
      });
      MessageService.getConversations(user.id).then((convs) => {
        const unreadTotal = convs.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
        setUnreadMessages(unreadTotal);
      });
    }
  }, [user, pathname]);

  const navLinks = [
    { label: 'Discover', href: '/discover', icon: Compass },
    { label: 'Colleges', href: '/colleges', icon: School },
    { label: 'Matches', href: '/matches', icon: Sparkles },
    { label: 'Claims', href: '/claims', icon: ShieldCheck },
    { label: 'Messages', href: '/messages', icon: MessageSquare, badge: unreadMessages },
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  ];

  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === 'college_admin' || normalizedRole === 'platform_admin' || normalizedRole === 'college_moderator') {
    navLinks.push({ label: 'College Admin', href: '/college-admin', icon: Building2 });
  }
  if (normalizedRole === 'platform_admin') {
    navLinks.push({ label: 'Platform Admin', href: '/platform-admin', icon: ShieldAlert });
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
      {/* Global Status Banner */}
      <div className="bg-slate-900 dark:bg-slate-950 text-slate-300 px-4 py-1 text-[11px] flex items-center justify-between">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                serverAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
              } animate-pulse`}
            />
            <span className="font-medium">
              {serverAuthenticated && role === 'platform_admin'
                ? 'Platform Governance Active — Authenticated as Dr. Evelyn Reed (PLATFORM_ADMIN)'
                : serverAuthenticated
                ? `LostLink 2.0 Active — Authenticated as ${user?.name} (${role.replace('_', ' ')})`
                : 'LostLink 2.0 Academic Demo — Multi-Campus Architecture Active'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <RoleSwitcher />
          </div>
        </div>
      </div>

      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & College Switcher */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 focus:outline-none">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brandTeal-800 via-brandTeal-600 to-brandBlue-600 flex items-center justify-center text-white shadow-sm font-black text-lg tracking-tight">
              L
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center">
                LostLink
                <span className="text-brandTeal-600 dark:text-brandTeal-400 text-xs ml-1 font-semibold px-1 rounded bg-brandTeal-50 dark:bg-brandTeal-950">
                  2.0
                </span>
              </span>
            </div>
          </Link>

          <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="hidden lg:block">
            <CollegeSwitcher />
          </div>
        </div>

        {/* Center: Main Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-slate-100 dark:bg-slate-800 text-brandTeal-700 dark:text-brandTeal-300'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
                {link.badge && link.badge > 0 ? (
                  <span className="w-4 h-4 rounded-full bg-brandTeal-600 text-white text-[9px] flex items-center justify-center font-bold">
                    {link.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions, Notifications, Theme, User */}
        <div className="flex items-center gap-2">
          {/* Quick Report Buttons */}
          <div className="hidden sm:flex items-center gap-1.5">
            <Link href="/report/lost">
              <Button size="sm" variant="outline" className="border-rose-200 hover:bg-rose-50 text-rose-700 dark:border-rose-900 dark:text-rose-300 text-xs">
                Lost Item
              </Button>
            </Link>
            <Link href="/report/found">
              <Button size="sm" variant="primary" className="text-xs">
                <PlusCircle className="w-3.5 h-3.5 mr-1" />
                Found Item
              </Button>
            </Link>
          </div>

          {/* Notifications Bell */}
          <Link
            href="/notifications"
            className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </Link>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
            title="Toggle Light / Dark mode"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* User Profile Avatar Link */}
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Student Profile"
          >
            <div className="w-7 h-7 rounded-full bg-brandTeal-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0) || 'U'
              )}
            </div>
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-6 space-y-4">
          <div className="pt-1 pb-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Current Institution
            </p>
            <CollegeSwitcher />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link href="/report/lost" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" variant="outline" className="w-full border-rose-300 text-rose-700 text-xs">
                Report Lost Item
              </Button>
            </Link>
            <Link href="/report/found" onClick={() => setMobileMenuOpen(false)}>
              <Button size="sm" variant="primary" className="w-full text-xs">
                Report Found Item
              </Button>
            </Link>
          </div>

          <div className="space-y-1 pt-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-sm font-medium ${
                  isActive(link.href)
                    ? 'bg-brandTeal-50 text-brandTeal-700 dark:bg-brandTeal-950 dark:text-brandTeal-300'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <link.icon className="w-4 h-4 text-slate-500" />
                  <span>{link.label}</span>
                </div>
                {link.badge && link.badge > 0 && (
                  <span className="w-5 h-5 rounded-full bg-brandTeal-600 text-white text-[10px] flex items-center justify-center font-bold">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brandTeal-600 text-white flex items-center justify-center font-bold text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-[10px] text-slate-500">{user?.email}</p>
              </div>
            </div>
            <RoleSwitcher />
          </div>
        </div>
      )}
    </header>
  );
};

