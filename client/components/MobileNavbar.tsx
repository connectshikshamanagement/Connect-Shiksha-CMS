'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiClipboard, FiFolder, FiDollarSign, FiUser, FiHome } from 'react-icons/fi';
import usePermissions from '@/hooks/usePermissions';

export default function MobileNavbar() {
  const pathname = usePathname();
  const { isFounder, isManager, isMember } = usePermissions();

  // Define navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '/dashboard', icon: FiHome },
      { name: 'Tasks', href: '/dashboard/tasks', icon: FiClipboard },
      { name: 'Projects', href: '/dashboard/projects', icon: FiFolder },
    ];

    // Founder: keep Payroll and Profile
    if (isFounder) {
      baseItems.push({ name: 'Payroll', href: '/dashboard/payroll', icon: FiDollarSign });
      baseItems.push({ name: 'Profile', href: '/dashboard/profile', icon: FiUser });
      return baseItems;
    }

    // Team Manager and Team Member: replace Profile with Payroll
    if (isManager || isMember) {
      baseItems.push({ name: 'Payroll', href: '/dashboard/payroll', icon: FiDollarSign });
      return baseItems;
    }

    // Default: show Profile
    baseItems.push({ name: 'Profile', href: '/dashboard/profile', icon: FiUser });
    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white shadow-inner flex justify-around py-3 z-40 md:hidden border-t border-gray-200">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`text-sm flex flex-col items-center px-2 py-1 rounded-lg transition-colors ${
              isActive 
                ? 'text-primary-600 bg-primary-50' 
                : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
            }`}
          >
            <item.icon className={`text-xl mb-1 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
            <span className="text-xs font-medium">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
