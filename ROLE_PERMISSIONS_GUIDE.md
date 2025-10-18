# 🔐 Role-Based Permission System Guide

## Overview
This CRM system uses a comprehensive role-based permission system that controls access to different features and actions based on user roles.

## 📁 Permission Structure

### 1. **Permission Model Location**
- **File**: `models/Role.js` (Lines 16-64)
- **Structure**: Each role has permissions for different resources with CRUD operations

### 2. **Available Resources**
- `users` - User management
- `teams` - Team management  
- `projects` - Project management
- `tasks` - Task management
- `finance` - Financial operations
- `payroll` - Payroll management
- `clients` - Client management
- `reports` - Report generation

### 3. **Available Actions**
- `create` - Create new records
- `read` - View records
- `update` - Modify existing records
- `delete` - Remove records

## 🛠️ How to Set Permissions

### Method 1: Using the Permission Script
```bash
node scripts/setRolePermissions.js
```

### Method 2: Database Direct Update
```javascript
const Role = require('./models/Role');

await Role.findOneAndUpdate(
  { key: 'INNOVATION_LEAD' },
  {
    permissions: {
      finance: { create: true, read: true, update: true, delete: false },
      users: { create: false, read: true, update: false, delete: false },
      // ... other permissions
    }
  }
);
```

### Method 3: Manual Database Update
1. Connect to MongoDB
2. Navigate to the `roles` collection
3. Update the `permissions` field for specific roles

## 👥 Current Role Permissions

### **FOUNDER** (Full Access)
- ✅ All resources: Full CRUD access
- ✅ Can manage users, teams, projects, tasks, finance, payroll, clients, reports

### **INNOVATION_LEAD** (High Access)
- ✅ Teams: Create, Read, Update
- ✅ Projects: Create, Read, Update  
- ✅ Tasks: Create, Read, Update
- ✅ Finance: Create, Read, Update
- ✅ Clients: Create, Read, Update
- ✅ Reports: Create, Read, Update
- ❌ Users: Read only
- ❌ Payroll: Read only

### **COACHING_MANAGER** (Medium Access)
- ✅ Teams: Read, Update
- ✅ Projects: Create, Read, Update
- ✅ Tasks: Create, Read, Update
- ✅ Clients: Create, Read, Update
- ✅ Finance: Read only
- ✅ Payroll: Read only
- ❌ Users: Read only
- ❌ Reports: Read only

### **MEDIA_MANAGER** (Limited Access)
- ✅ Reports: Create, Read, Update
- ✅ Teams: Read only
- ✅ Projects: Read only
- ✅ Tasks: Read only
- ✅ Clients: Read only
- ✅ Finance: Read only
- ✅ Payroll: Read only
- ❌ Users: Read only

### **MENTOR** (Basic Access)
- ✅ Tasks: Create, Read, Update
- ✅ Teams: Read only
- ✅ Projects: Read only
- ✅ Clients: Read only
- ✅ Reports: Read only
- ❌ Users: Read only
- ❌ Finance: No access
- ❌ Payroll: No access

## 🔧 Backend Enforcement

### Route Protection
```javascript
// Example from routes/incomeRoutes.js
router.post('/', authorize('finance.create'), async (req, res) => {
  // Only users with finance.create permission can access
});

router.get('/', authorize('finance.read'), async (req, res) => {
  // Only users with finance.read permission can access
});
```

### Middleware Usage
```javascript
const { authorize } = require('../middleware/auth');

// Single permission
router.post('/', authorize('users.create'), controller.create);

// Multiple permissions (OR logic)
router.get('/', authorize('finance.read', 'payroll.read'), controller.getAll);
```

## 🎨 Frontend Enforcement

### Permission Hook Usage
```javascript
import usePermissions from '@/hooks/usePermissions';

function MyComponent() {
  const { hasPermission, canCreate, canUpdate, canDelete } = usePermissions();

  return (
    <div>
      {canCreate('finance') && (
        <button>Add Income</button>
      )}
      
      {canUpdate('finance') && (
        <button>Edit</button>
      )}
      
      {canDelete('finance') && (
        <button>Delete</button>
      )}
    </div>
  );
}
```

### Sidebar Navigation
The sidebar automatically filters navigation items based on user permissions:
- Dashboard: Always visible
- Other sections: Only visible if user has read permission

## 📝 Adding New Permissions

### 1. Update Role Model
```javascript
// In models/Role.js
permissions: {
  // ... existing permissions
  newResource: {
    create: { type: Boolean, default: false },
    read: { type: Boolean, default: true },
    update: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
  }
}
```

### 2. Update Permission Script
```javascript
// In scripts/setRolePermissions.js
const rolePermissions = {
  'FOUNDER': {
    // ... existing permissions
    newResource: { create: true, read: true, update: true, delete: true }
  }
};
```

### 3. Protect Routes
```javascript
// In routes/newResourceRoutes.js
router.post('/', authorize('newResource.create'), controller.create);
router.get('/', authorize('newResource.read'), controller.getAll);
```

### 4. Update Frontend
```javascript
// In components/Sidebar.tsx
const navigation = [
  // ... existing items
  { name: 'New Resource', href: '/dashboard/new-resource', icon: FiIcon, permission: 'newResource.read' },
];
```

## 🚀 Quick Setup Commands

### Set All Role Permissions
```bash
node scripts/setRolePermissions.js
```

### Check Current Permissions
```javascript
// In MongoDB shell or Node.js
const Role = require('./models/Role');
const roles = await Role.find({});
console.log(roles.map(r => ({ key: r.key, permissions: r.permissions })));
```

### Test User Permissions
```javascript
// Login as different users and check localStorage
const user = JSON.parse(localStorage.getItem('user'));
console.log('User roles:', user.roleIds);
```

## 🔍 Troubleshooting

### Common Issues
1. **Permission not working**: Check if role has correct permissions in database
2. **Frontend not filtering**: Ensure user data includes roleIds with permissions
3. **Route access denied**: Verify middleware is applied correctly

### Debug Steps
1. Check user roles in localStorage
2. Verify role permissions in database
3. Test API endpoints with different user accounts
4. Check browser console for permission errors

## 📊 Permission Matrix

| Role | Users | Teams | Projects | Tasks | Finance | Payroll | Clients | Reports |
|------|-------|-------|----------|-------|---------|---------|---------|---------|
| FOUNDER | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD | CRUD |
| INNOVATION_LEAD | R | CRU | CRU | CRU | CRU | R | CRU | CRU |
| COACHING_MANAGER | R | RU | CRU | CRU | R | R | CRU | R |
| MEDIA_MANAGER | R | R | R | R | R | R | R | CRU |
| MENTOR | R | R | R | CRU | - | - | R | R |

**Legend**: C=Create, R=Read, U=Update, D=Delete, -=No Access
