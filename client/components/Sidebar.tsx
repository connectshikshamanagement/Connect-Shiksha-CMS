'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiDollarSign,
  FiShoppingBag,
  FiFileText,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome },
  { name: 'Teams', href: '/dashboard/teams', icon: FiUsers },
  { name: 'Projects', href: '/dashboard/projects', icon: FiFolder },
  { name: 'Tasks', href: '/dashboard/tasks', icon: FiCheckSquare },
  { name: 'Clients', href: '/dashboard/clients', icon: FiUsers },
  { name: 'Finance', href: '/dashboard/finance', icon: FiDollarSign },
  { name: 'Products', href: '/dashboard/products', icon: FiShoppingBag },
  { name: 'Sales', href: '/dashboard/sales', icon: FiShoppingBag },
  { name: 'Payroll', href: '/dashboard/payroll', icon: FiDollarSign },
  { name: 'Reports', href: '/dashboard/reports', icon: FiFileText },
  { name: 'Settings', href: '/dashboard/settings', icon: FiSettings },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <div className="flex w-64 flex-col bg-primary-800 text-white">
      <div className="flex h-16 items-center justify-center border-b border-primary-700">
        <h1 className="text-xl font-bold">Connect Shiksha</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-100 hover:bg-primary-700 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-primary-700 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium text-primary-100 hover:bg-primary-700 hover:text-white"
        >
          <FiLogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

