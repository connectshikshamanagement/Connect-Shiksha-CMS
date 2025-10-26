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

    // Add Payroll for all users (team members see their payout, founders/managers see full payroll)
    baseItems.push({ name: 'Payout', href: '/dashboard/payroll', icon: FiDollarSign });

    // Only add Profile for founders/managers, team members get Payout instead
    if (isFounder || isManager) {
      baseItems.push({ name: 'Profile', href: '/dashboard/profile', icon: FiUser });
    }

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
