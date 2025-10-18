'use client';

import { useEffect, useState } from 'react';

interface Permission {
  resource: string;
  action: string;
}

interface UserRole {
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setUserRoles(userData.roleIds || []);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
    setLoading(false);
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

  return {
    hasPermission,
    canAccess,
    canCreate,
    canUpdate,
    canDelete,
    loading
  };
};

export default usePermissions;
