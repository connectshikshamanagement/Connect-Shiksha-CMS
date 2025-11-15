'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { FiUsers, FiEdit, FiTrash2, FiPlus, FiEye, FiDollarSign } from 'react-icons/fi';

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  teamCode?: string;
  salary: number;
  active: boolean;
  roleIds: Array<{
    _id: string;
    key: string;
    name: string;
  }>;
  teamHistory: Array<{
    teamId: {
      _id: string;
      name: string;
    };
    isActive: boolean;
  }>;
}

interface Role {
  _id: string;
  key: string;
  name: string;
  description: string;
}

interface Team {
  _id: string;
  name: string;
  category: string;
}

export default function MembersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    salary: 0,
    roleId: '',
    teamId: '',
    active: true
  });
  const { isFounder } = usePermissions();
  const PROJECT_MANAGER_KEYS = ['PROJECT_MANAGER', 'TEAM_MANAGER'];
  const isProjectManagerRoleKey = (key?: string) => key ? PROJECT_MANAGER_KEYS.includes(key) : false;
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isFounder) {
      fetchUsers();
      fetchRoles();
      fetchTeams();
    }
  }, [isFounder]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeamIds = async () => {
    try {
      setAssigning(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/backfill-teamcodes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        showToast.success(`Assigned ${data.data?.assigned || 0} Team IDs`);
        fetchUsers();
      } else {
        throw new Error(data.message || 'Failed to assign');
      }
    } catch (e: any) {
      showToast.error(e.message || 'Failed to assign Team IDs');
    } finally {
      setAssigning(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch roles');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/teams`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTeams(data.data);
      }
    } catch (error) {
      showToast.error('Failed to fetch teams');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: '',
      salary: user.salary || 0,
      roleId: user.roleIds[0]?._id || '',
      teamId: user.teamHistory[user.teamHistory.length - 1]?.teamId._id || '',
      active: user.active
    });
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    try {
      const url = editingUser 
        ? `${process.env.NEXT_PUBLIC_API_URL}/users/${editingUser._id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/users`;
      
      const method = editingUser ? 'PUT' : 'POST';
      
      // Transform data for API - convert roleId to roleIds array
      const { roleId, ...payload } = formData;
      const finalPayload = {
        ...payload,
        roleIds: formData.roleId ? [formData.roleId] : [],
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalPayload),
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.success(editingUser ? 'User updated successfully' : 'User created successfully');
        setShowModal(false);
        setEditingUser(null);
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          salary: 0,
          roleId: '',
          teamId: '',
          active: true
        });
        fetchUsers();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.success('User deleted successfully');
        fetchUsers();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${user._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !user.active }),
      });

      const data = await response.json();
      
      if (data.success) {
        showToast.success(`User ${!user.active ? 'activated' : 'deactivated'} successfully`);
        fetchUsers();
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      showToast.error(error.message || 'Failed to update user status');
    }
  };

  if (!isFounder) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Members" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-center">
              <FiUsers className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-xl text-gray-600">Access Denied</p>
              <p className="mt-2 text-sm text-gray-500">Only founders can access member management</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Members" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading members...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Members" />

        <div className="p-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Member Management</h2>
              <p className="mt-1 text-sm text-gray-600">Manage team members, roles, and profit sharing</p>
            </div>
            <Button variant="primary" onClick={() => setShowModal(true)} className="w-full sm:w-auto">
              <FiPlus className="mr-2" />
              Add Member
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Total Members</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{users.length}</p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Active Members</p>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {users.filter(u => u.active).length}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Project Managers</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {users.filter(u => u.roleIds.some(r => isProjectManagerRoleKey(r.key))).length}
              </p>
            </div>
            <div className="rounded-lg bg-white p-6 shadow">
              <p className="text-sm font-medium text-gray-600">Team Members</p>
              <p className="mt-2 text-3xl font-bold text-purple-600">
                {users.filter(u => u.roleIds.some(r => r.key === 'TEAM_MEMBER')).length}
              </p>
            </div>
          </div>

          {/* Team IDs Section */}
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">All Team Member IDs</h3>
            {users.filter(u => u.teamCode).length === 0 && (
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">No team IDs assigned yet</p>
                <Button onClick={handleAssignTeamIds} disabled={assigning}>
                  {assigning ? 'Assigning…' : 'Assign Team IDs'}
                </Button>
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {users
                .filter(u => u.teamCode)
                .sort((a, b) => (a.teamCode || '').localeCompare(b.teamCode || ''))
                .map((user) => (
                  <div
                    key={user._id}
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-primary-700 text-lg">{user.teamCode}</div>
                        <div className="mt-1 text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="mt-1 text-xs text-gray-500">{user.email}</div>
                        <div className="mt-1">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.roleIds[0]?.key === 'FOUNDER' ? 'bg-purple-100 text-purple-800' :
                            isProjectManagerRoleKey(user.roleIds[0]?.key) ? 'bg-blue-100 text-blue-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.roleIds[0]?.name || 'No Role'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {users.filter(u => u.teamCode).length === 0 && (
              <p className="text-center text-gray-500 py-4">Click "Assign Team IDs" to generate IDs</p>
            )}
          </div>

          {/* Members Table */}
          <div className="rounded-lg bg-white shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Member
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Team ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Team
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {users.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-sm text-gray-500">{user.phone}</div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {user.teamCode ? (
                          <span className="inline-flex items-center rounded-full bg-primary-100 px-3 py-1 text-sm font-semibold text-primary-800">
                            {user.teamCode}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.roleIds[0]?.key === 'FOUNDER' ? 'bg-purple-100 text-purple-800' :
                          isProjectManagerRoleKey(user.roleIds[0]?.key) ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {user.roleIds[0]?.name || 'No Role'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {user.teamHistory[user.teamHistory.length - 1]?.teamId.name || 'No Team'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        ₹{user.salary?.toLocaleString() || '0'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          user.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleEditUser(user)}
                          >
                            <FiEdit className="mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={user.active ? "danger" : "success"}
                            onClick={() => handleToggleActive(user)}
                          >
                            {user.active ? 'Deactivate' : 'Activate'}
                          </Button>
                          {user.roleIds[0]?.key !== 'FOUNDER' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => handleDeleteUser(user._id)}
                            >
                              <FiTrash2 className="mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {users.length === 0 && (
                <div className="p-12 text-center">
                  <FiUsers className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                  <p className="text-lg font-medium text-gray-900">No members found</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Add your first team member to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingUser(null);
          setFormData({
            name: '',
            email: '',
            phone: '',
            password: '',
            salary: 0,
            roleId: '',
            teamId: '',
            active: true
          });
        }}
        title={editingUser ? 'Edit Member' : 'Add Member'}
      >
        <div className="space-y-4">
          <FormInput
            label="Name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <FormInput
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <FormInput
            label="Phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          {!editingUser && (
            <FormInput
              label="Temp Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              placeholder="Min 6 characters"
            />
          )}
          <FormInput
            label="Salary"
            type="number"
            value={formData.salary}
            onChange={(e) => setFormData({ ...formData, salary: Number(e.target.value) })}
            min="0"
          />
          <FormSelect
            label="Role"
            value={formData.roleId}
            onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
            required
          >
            <option value="">Select Role</option>
            {roles.map((role) => (
              <option key={role._id} value={role._id}>
                {role.name} - {role.description}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="Team"
            value={formData.teamId}
            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
          >
            <option value="">Select Team</option>
            {teams.map((team) => (
              <option key={team._id} value={team._id}>
                {team.name} ({team.category})
              </option>
            ))}
          </FormSelect>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Active Member
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowModal(false);
              setEditingUser(null);
            }}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveUser}>
            {editingUser ? 'Update Member' : 'Add Member'}
          </Button>
        </div>
      </Modal>
      
      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}
