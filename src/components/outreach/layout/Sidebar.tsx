'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Inbox,
  Settings,
  LogOut,
  TreePine,
  Brain,
  Database,
  Target,
  PenTool,
  Bell,
  BarChart3,
  Users,
  MessageSquareHeart,
  Megaphone,
} from 'lucide-react';
import { useAuth } from '@/components/outreach/AuthProvider';

// v2 primary navigation
const navigation = [
  { name: 'Dashboard', href: '/outreach', icon: LayoutDashboard },
  { name: 'Prospects', href: '/outreach/sales', icon: Target },
  { name: 'Pitch Studio', href: '/outreach/pitch-studio', icon: PenTool },
  { name: 'Inbox', href: '/outreach/inbox', icon: Inbox },
  { name: 'Reminders', href: '/outreach/reminders', icon: Bell },
];

// Secondary navigation (existing features kept accessible)
const secondaryNav = [
  { name: 'Campaigns', href: '/outreach/campaigns', icon: Megaphone },
  { name: 'Personas', href: '/outreach/personas', icon: Users },
  { name: 'Learning', href: '/outreach/learning', icon: Brain },
  { name: 'Training', href: '/outreach/training', icon: Database },
  { name: 'Analytics', href: '/outreach/analytics', icon: BarChart3 },
  { name: 'Feedback', href: '/outreach/feedback', icon: MessageSquareHeart },
];

const bottomNav = [
  { name: 'Settings', href: '/outreach/settings', icon: Settings },
];

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return 'BT';
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const isActive = (href: string) => {
    if (href === '/outreach') return pathname === '/outreach';
    return pathname.startsWith(href);
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
  const displayRole = profile?.role
    ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1).replace('_', ' ')
    : 'Team';
  const initials = getInitials(profile?.full_name ?? null, user?.email ?? null);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-64 bg-bt-sidebar flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-bt-primary-light to-bt-teal flex items-center justify-center">
          <TreePine className="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white leading-none">Blue Tree</h1>
          <p className="text-[10px] text-white/50 mt-0.5">Outreach Agent</p>
        </div>
      </div>

      {/* Main navigation */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <div className="space-y-1">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }
              `}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-bt-primary-light' : ''}`} />
              {item.name}
            </Link>
          );
        })}
        </div>

        {/* Secondary nav */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="px-3 text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">More</p>
          <div className="space-y-0.5">
          {secondaryNav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium
                  transition-all duration-150
                  ${
                    active
                      ? 'bg-white/10 text-white'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/70'
                  }
                `}
              >
                <Icon className={`w-[16px] h-[16px] ${active ? 'text-bt-primary-light' : ''}`} />
                {item.name}
              </Link>
            );
          })}
          </div>
        </div>
      </nav>

      {/* Bottom navigation */}
      <div className="px-3 pb-3 space-y-1">
        {bottomNav.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150
                ${
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/90'
                }
              `}
            >
              <Icon className={`w-[18px] h-[18px] ${active ? 'text-bt-primary-light' : ''}`} />
              {item.name}
            </Link>
          );
        })}

        {/* User profile / logout */}
        <div className="pt-3 mt-1 border-t border-white/10">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-bt-primary to-bt-teal flex items-center justify-center text-xs font-bold text-white">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">{displayName}</p>
              <p className="text-[11px] text-white/40 truncate">{displayRole}</p>
            </div>
            <button
              onClick={signOut}
              className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
