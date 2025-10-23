'use client';

import { useState } from 'react';
import { FiPlus, FiClipboard, FiFolder, FiDollarSign, FiUsers, FiShoppingBag } from 'react-icons/fi';
import Link from 'next/link';
import usePermissions from '@/hooks/usePermissions';

export default function FABMenu() {
  const [open, setOpen] = useState(false);
  const { isFounder, isManager, isMember } = usePermissions();

  // Define quick actions based on user role
  const getQuickActions = () => {
    const baseActions = [
      { 
        name: 'Tasks', 
        href: '/dashboard/tasks', 
        icon: FiClipboard, 
        color: 'bg-blue-500',
        permission: 'tasks.read'
      },
      { 
        name: 'Projects', 
        href: '/dashboard/projects', 
        icon: FiFolder, 
        color: 'bg-green-500',
        permission: 'projects.read'
      }
    ];

    if (isFounder || isManager) {
      baseActions.push(
        { 
          name: 'Payroll', 
          href: '/dashboard/payroll', 
          icon: FiDollarSign, 
          color: 'bg-yellow-500',
          permission: 'payroll.read'
        },
        { 
          name: 'Clients', 
          href: '/dashboard/clients', 
          icon: FiUsers, 
          color: 'bg-purple-500',
          permission: 'clients.read'
        }
      );
    }

    if (isFounder) {
      baseActions.push(
        { 
          name: 'Finance', 
          href: '/dashboard/finance', 
          icon: FiDollarSign, 
          color: 'bg-emerald-500',
          permission: 'finance.read'
        },
        { 
          name: 'Sales', 
          href: '/dashboard/sales', 
          icon: FiShoppingBag, 
          color: 'bg-orange-500',
          permission: 'finance.read'
        }
      );
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end space-y-3 md:bottom-6 md:right-6">
      {/* Quick Action Items */}
      {open && (
        <div className="flex flex-col mb-2 space-y-3 animate-fade-in">
          {quickActions.map((action, index) => (
            <Link
              key={action.name}
              href={action.href}
              className="bg-white shadow-lg px-4 py-3 rounded-full text-sm font-medium flex items-center space-x-3 hover:shadow-xl transition-all duration-200 hover:scale-105 animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className={`${action.color} rounded-full p-2 text-white`}>
                <action.icon className="w-4 h-4" />
              </div>
              <span className="text-gray-700">{action.name}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Main FAB Button */}
      <button
        onClick={() => setOpen(!open)}
        className="bg-primary-600 hover:bg-primary-700 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary-300"
      >
        <FiPlus 
          className={`text-2xl transition-transform duration-300 ${
            open ? 'rotate-45' : 'rotate-0'
          }`} 
        />
      </button>
    </div>
  );
}
