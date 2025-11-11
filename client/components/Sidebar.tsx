'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiHome,
  FiUsers,
  FiFolder,
  FiCheckSquare,
  FiDollarSign,
  FiShoppingBag,
  FiSettings,
  FiLogOut,
  FiCreditCard,
  FiClock,
  FiDatabase,
  FiMenu,
  FiX,
  FiMapPin
} from 'react-icons/fi';
import usePermissions from '@/hooks/usePermissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome, permission: null },
  { name: 'Teams', href: '/dashboard/teams', icon: FiUsers, permission: 'teams.read' },
  { name: 'Projects', href: '/dashboard/projects', icon: FiFolder, permission: 'projects.read' },
  { name: 'Tasks', href: '/dashboard/tasks', icon: FiCheckSquare, permission: 'tasks.read' },
  { name: 'Clients', href: '/dashboard/clients', icon: FiUsers, permission: 'clients.read', role: 'FOUNDER' },
  { name: 'Finance', href: '/dashboard/finance', icon: FiDollarSign, permission: 'finance.read' },
  { name: 'Products', href: '/dashboard/products', icon: FiShoppingBag, permission: 'finance.read' },
  { name: 'Sales', href: '/dashboard/sales', icon: FiShoppingBag, permission: 'finance.read' },
  { name: 'Payroll', href: '/dashboard/payroll', icon: FiDollarSign, permission: 'payroll.read' },
  { name: 'Attendance', href: '/dashboard/attendance', icon: FiMapPin, permission: null },
  { name: 'Advance Payments', href: '/dashboard/advance-payments', icon: FiCreditCard, permission: 'payroll.read', role: 'FOUNDER' },
  { name: 'My Advance Payments', href: '/dashboard/my-advance-payments', icon: FiCreditCard, permission: null, role: 'TEAM_MEMBER' },
  { name: 'My Finance History', href: '/dashboard/finance-history', icon: FiClock, permission: null, role: 'TEAM_MEMBER' },
  { name: 'My Advance Payments', href: '/dashboard/my-advance-payments', icon: FiCreditCard, permission: null, role: 'TEAM_MANAGER' },
  { name: 'My Finance History', href: '/dashboard/finance-history', icon: FiClock, permission: null, role: 'TEAM_MANAGER' },
  { name: 'Data Management', href: '/dashboard/data-management', icon: FiDatabase, permission: null, role: 'FOUNDER' },
  { name: 'Settings', href: '/dashboard/settings', icon: FiSettings, permission: 'users.read' },
  { name: 'Members', href: '/dashboard/members', icon: FiUsers, permission: 'users.create', role: 'FOUNDER' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { hasPermission, userRole, loading, isFounder, isManager, isMember } = usePermissions();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  // Get user info for display
  const getUserInfo = () => {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          const userData = JSON.parse(user);
          return {
            name: userData.name || 'User',
            email: userData.email || '',
            role: userRole || 'Unknown'
          };
        } catch (error) {
          return { name: 'User', email: '', role: 'Unknown' };
        }
      }
    }
    return { name: 'User', email: '', role: 'Unknown' };
  };

  const userInfo = getUserInfo();

  // Filter navigation based on permissions and role
  const filteredNavigation = navigation.filter(item => {
    // Don't show navigation items while permissions are loading
    if (loading) return false;
    
    const hasPermissionAccess = !item.permission || hasPermission(item.permission);
    
    // Check role access using boolean values
    let hasRoleAccess = true;
    if (item.role === 'FOUNDER') {
      hasRoleAccess = isFounder;
    } else if (item.role === 'TEAM_MANAGER') {
      hasRoleAccess = isManager;
    } else if (item.role === 'TEAM_MEMBER') {
      hasRoleAccess = isMember;
    }
    
    // Hide clients tab for team members and team managers (only founder can access)
    if (item.name === 'Clients' && (isMember || isManager)) {
      return false;
    }
    
    return hasPermissionAccess && hasRoleAccess;
  });

  return (
    <>
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 z-40 w-full bg-primary-600 text-white flex items-center justify-between p-3 md:hidden shadow-lg">
        <h1 className="font-bold text-lg tracking-wide">Connect Shiksha</h1>
        <button 
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiMenu className="text-2xl" />
        </button>
      </div>

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 md:relative md:shadow-none`}>
        
        {/* Desktop Header */}
        <div className="hidden md:flex h-16 items-center justify-center border-b border-primary-700 bg-primary-800">
          <h1 className="text-xl font-bold text-white">Connect Shiksha</h1>
        </div>

        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 md:hidden">
          <h2 className="font-semibold text-lg text-gray-800">Menu</h2>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : (
            filteredNavigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* User Info and Logout Section */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
          {/* User Information */}
          <div className="mb-4 rounded-lg bg-white p-4 shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white flex-shrink-0">
                {userInfo.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userInfo.name}
                </p>
                <p className="text-xs text-gray-500 truncate mt-1">
                  {userInfo.email}
                </p>
                <p className="text-xs text-primary-600 capitalize mt-1 font-medium">
                  {userInfo.role.toLowerCase().replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <FiLogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-30 md:hidden z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
}

