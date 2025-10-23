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
  FiCreditCard,
  FiClock,
  FiDatabase,
} from 'react-icons/fi';
import usePermissions from '@/hooks/usePermissions';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: FiHome, permission: null },
  { name: 'Teams', href: '/dashboard/teams', icon: FiUsers, permission: 'teams.read' },
  { name: 'Projects', href: '/dashboard/projects', icon: FiFolder, permission: 'projects.read' },
  { name: 'Tasks', href: '/dashboard/tasks', icon: FiCheckSquare, permission: 'tasks.read' },
  { name: 'Clients', href: '/dashboard/clients', icon: FiUsers, permission: 'clients.read' },
  { name: 'Finance', href: '/dashboard/finance', icon: FiDollarSign, permission: 'finance.read' },
  { name: 'Products', href: '/dashboard/products', icon: FiShoppingBag, permission: 'finance.read' },
  { name: 'Sales', href: '/dashboard/sales', icon: FiShoppingBag, permission: 'finance.read' },
  { name: 'Payroll', href: '/dashboard/payroll', icon: FiDollarSign, permission: 'payroll.read' },
  { name: 'Advance Payments', href: '/dashboard/advance-payments', icon: FiCreditCard, permission: 'payroll.read', role: 'FOUNDER' },
  { name: 'My Advance Payments', href: '/dashboard/my-advance-payments', icon: FiCreditCard, permission: null, role: 'TEAM_MEMBER' },
  { name: 'My Finance History', href: '/dashboard/finance-history', icon: FiClock, permission: null, role: 'TEAM_MEMBER' },
  { name: 'Reports', href: '/dashboard/reports', icon: FiFileText, permission: 'reports.read' },
  { name: 'Data Management', href: '/dashboard/data-management', icon: FiDatabase, permission: null, role: 'FOUNDER' },
  { name: 'Settings', href: '/dashboard/settings', icon: FiSettings, permission: 'users.read' },
  { name: 'Members', href: '/dashboard/members', icon: FiUsers, permission: 'users.create', role: 'FOUNDER' },
];

export default function Sidebar() {
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
    
    // Hide clients tab for team members
    if (item.name === 'Clients' && isMember) {
      return false;
    }
    
    return hasPermissionAccess && hasRoleAccess;
  });

  return (
    <div className="flex w-64 flex-col bg-primary-800 text-white">
      <div className="flex h-16 items-center justify-center border-b border-primary-700">
        <h1 className="text-xl font-bold">Connect Shiksha</h1>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-primary-200">Loading...</div>
          </div>
        ) : (
          filteredNavigation.map((item) => {
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
          })
        )}
      </nav>

      {/* User Info and Logout Section */}
      <div className="border-t border-primary-700 p-4">
        {/* User Information */}
        <div className="mb-4 rounded-lg bg-primary-700/50 p-3">
          <div className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
              {userInfo.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userInfo.name}
              </p>
              <p className="text-xs text-primary-200 truncate">
                {userInfo.email}
              </p>
              <p className="text-xs text-primary-300 capitalize">
                {userInfo.role.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center space-x-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-primary-800"
        >
          <FiLogOut className="h-4 w-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

