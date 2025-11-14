'use client';

import { useEffect, useState } from 'react';

interface Permission {
  resource: string;
  action: string;
}

interface UserRole {
  _id: string;
  key: string;
  name: string;
  permissions: {
    [key: string]: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
  };
}

export const usePermissions = () => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserData = async () => {
      const user = localStorage.getItem('user');
      
      // Check if user has new role structure
      let needsRefresh = false;
      if (user) {
        try {
          const userData = JSON.parse(user);
          const roles = userData.roleIds || [];
          const hasNewRoles = roles.some((role: UserRole) => 
            ['FOUNDER', 'PROJECT_MANAGER', 'TEAM_MEMBER'].includes(role.key)
          );
          needsRefresh = !hasNewRoles;
        } catch (error) {
          needsRefresh = true;
        }
      } else {
        needsRefresh = true;
      }

      // Refresh user data if needed
      if (needsRefresh) {
        try {
          const token = localStorage.getItem('token');
          if (token) {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            });

            if (response.ok) {
              const userData = await response.json();
              if (userData.success) {
                localStorage.setItem('user', JSON.stringify(userData.data));
                const roles = userData.data.roleIds || [];
                setUserRoles(roles);
                
                // Set primary role
                if (roles.length > 0) {
                  const primaryRole =
                    roles.find((role: UserRole) => role.key === 'FOUNDER') ||
                    roles.find((role: UserRole) => role.key === 'PROJECT_MANAGER') ||
                    roles.find((role: UserRole) => role.key === 'TEAM_MEMBER') ||
                    roles[0];
                  setUserRole(primaryRole?.key || 'TEAM_MEMBER');
                } else {
                  setUserRole('TEAM_MEMBER');
                }
              }
            }
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      } else if (user) {
        // Use existing user data
        try {
          const userData = JSON.parse(user);
          const roles = userData.roleIds || [];
          setUserRoles(roles);
          
          // Set primary role
          if (roles.length > 0) {
            const primaryRole =
              roles.find((role: UserRole) => role.key === 'FOUNDER') ||
                    roles.find((role: UserRole) => role.key === 'PROJECT_MANAGER') ||
              roles.find((role: UserRole) => role.key === 'TEAM_MEMBER') ||
              roles[0];
            setUserRole(primaryRole?.key || 'TEAM_MEMBER');
          } else {
            setUserRole('TEAM_MEMBER');
          }
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      }
      
      setLoading(false);
    };

    loadUserData();
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (loading || !userRoles.length) return false;

    const [resource, action] = permission.split('.');
    
    return userRoles.some(role => 
      role.permissions[resource] && 
      role.permissions[resource][action as keyof typeof role.permissions[typeof resource]]
    );
  };

  const canAccess = (resource: string): boolean => {
    return hasPermission(`${resource}.read`);
  };

  const canCreate = (resource: string): boolean => {
    return hasPermission(`${resource}.create`);
  };

  const canUpdate = (resource: string): boolean => {
    return hasPermission(`${resource}.update`);
  };

  const canDelete = (resource: string): boolean => {
    return hasPermission(`${resource}.delete`);
  };

  // Role-based helper functions
  const isFounder = userRole === 'FOUNDER';
  const isProjectManager = userRole === 'PROJECT_MANAGER';
  const isMember = userRole === 'TEAM_MEMBER';

  return {
    hasPermission,
    canAccess,
    canCreate,
    canUpdate,
    canDelete,
    loading,
    userRole,
    userRoles,
    isFounder,
    isProjectManager,
    isMember
  };
};

export default usePermissions;
