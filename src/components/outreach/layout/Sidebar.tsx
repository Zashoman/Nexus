'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  Inbox,
  Users,
  BarChart3,
  MessageSquareHeart,
  Settings,
  LogOut,
  TreePine,
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/outreach', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/outreach/campaigns', icon: Megaphone },
  { name: 'Inbox', href: '/outreach/inbox', icon: Inbox },
  { name: 'Personas', href: '/outreach/personas', icon: Users },
  { name: 'Analytics', href: '/outreach/analytics', icon: BarChart3 },
  { name: 'Feedback', href: '/outreach/feedback', icon: MessageSquareHeart },
];

const bottomNav = [
  { name: 'Settings', href: '/outreach/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/outreach') return pathname === '/outreach';
    return pathname.startsWith(href);
  };

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
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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
              BT
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white/90 truncate">Blue Tree</p>
              <p className="text-[11px] text-white/40 truncate">Admin</p>
            </div>
            <button className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
