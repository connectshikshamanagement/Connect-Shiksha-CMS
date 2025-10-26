'use client';

import { useEffect, useState } from 'react';
import { teamAPI, userAPI, roleAPI, teamPerformanceAPI, teamBudgetAPI, financeAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiEdit, FiTrash2, FiUsers, FiPlus, FiTrendingUp, FiDollarSign, FiTarget, FiCheckCircle, FiClock, FiAlertTriangle } from 'react-icons/fi';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    leadUserId: '',
    members: [] as string[],
    category: '',
  });
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    roleId: '',
    teamId: '',
  });
  const [creatingMember, setCreatingMember] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any>(null);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetData, setBudgetData] = useState({
    monthlyBudget: 0,
    creditLimit: 0,
    memberBudgets: [] as any[]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, usersRes, rolesRes] = await Promise.all([
        teamAPI.getAll(),
        userAPI.getAll(),
        roleAPI.getAll(),
      ]);
      
      // Populate team lead data if not already populated
      if (teamsRes.data.success) {
        const teamsData = teamsRes.data.data;
        const teamsWithLead = await Promise.all(teamsData.map(async (team: any) => {
          // If leadUserId is not populated, fetch the user data
          if (team.leadUserId && !team.leadUserId.name) {
            try {
              const userData = await userAPI.getOne(team.leadUserId);
              if (userData.data.success) {
                team.leadUserId = {
                  _id: team.leadUserId,
                  name: userData.data.data.name,
                  email: userData.data.data.email
                };
              }
            } catch (error) {
              console.error('Error fetching team lead:', error);
            }
          }
          return team;
        }));
        setTeams(teamsWithLead);
      }
      
      if (usersRes.data.success) setUsers(usersRes.data.data);
      if (rolesRes.data.success) setRoles(rolesRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.leadUserId || !formData.category) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingTeam ? 'Updating team...' : 'Creating team...');

    try {
      if (editingTeam) {
        await teamAPI.update(editingTeam._id, formData);
        showToast.success('Team updated successfully!');
      } else {
        await teamAPI.create(formData);
        showToast.success('Team created successfully!');
      }
      
      showToast.dismiss(loadingToast);
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (team: any) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      leadUserId: team.leadUserId?._id || team.leadUserId,
      members: team.members?.map((m: any) => m._id || m) || [],
      category: team.category,
    });
    setShowModal(true);
  };

  const handleDelete = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    const loadingToast = showToast.loading('Deleting team...');

    try {
      await teamAPI.delete(teamId);
      showToast.dismiss(loadingToast);
      showToast.success('Team deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      leadUserId: '',
      members: [],
      category: '',
    });
    setEditingTeam(null);
    setShowAddMember(false);
    setNewMember({ name: '', email: '', phone: '', password: '', roleId: '', teamId: '' });
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
  };

  const handleViewPerformance = async (team: any) => {
    setSelectedTeam(team);
    setShowPerformanceModal(true);
    
    try {
      const response = await teamPerformanceAPI.getTeamSummary(team._id);
      if (response.data.success) {
        setTeamPerformance(response.data.data);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch performance data');
    }
  };

  const handleManageBudget = async (team: any) => {
    setSelectedTeam(team);
    setBudgetData({
      monthlyBudget: team.monthlyBudget || 0,
      creditLimit: team.creditLimit || 0,
      memberBudgets: team.memberBudgets || []
    });
    setShowBudgetModal(true);
  };

  const handleUpdateBudget = async () => {
    const loadingToast = showToast.loading('Updating team budget...');

    try {
      await financeAPI.updateTeamBudget(selectedTeam._id, budgetData);
      showToast.dismiss(loadingToast);
      showToast.success('Team budget updated successfully!');
      setShowBudgetModal(false);
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to update budget');
    }
  };

  const handleUpdateMemberBudget = async (memberId: string, monthlyLimit: number, creditLimit: number) => {
    const loadingToast = showToast.loading('Updating member budget...');

    try {
      await teamBudgetAPI.updateMemberBudget(selectedTeam._id, memberId, {
        monthlyLimit,
        creditLimit
      });
      showToast.dismiss(loadingToast);
      showToast.success('Member budget updated successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to update member budget');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Teams" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading teams...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Teams" />

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Team Management</h2>
              <p className="mt-1 text-sm text-gray-600">Manage your organization's teams and members</p>
            </div>
            <Button onClick={handleOpenModal} className="w-full sm:w-auto">
              <FiPlus className="mr-2" />
              Add Team
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team: any) => (
              <div key={team._id} className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                    <p className="text-sm text-primary-600">{team.category}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${team.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {team.active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {team.description && (
                  <p className="mb-4 text-sm text-gray-600 line-clamp-2">{team.description}</p>
                )}

                <div className="space-y-2 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Team Lead:</span>
                    <span className="font-medium">{team.leadUserId?.name || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Members:</span>
                    <span className="flex items-center font-medium">
                      <FiUsers className="mr-1" />
                      {team.members?.length || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(team)}
                    >
                      <FiEdit className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDelete(team._id)}
                    >
                      <FiTrash2 className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {teams.length === 0 && (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <FiUsers className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No teams found</p>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first team</p>
              <Button className="mt-4" onClick={handleOpenModal}>
                <FiPlus className="mr-2" />
                Create Team
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingTeam ? 'Edit Team' : 'Create New Team'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <FormInput
            label="Team Name"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Coaching Center"
          />

          <FormSelect
            label="Category"
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            options={[
              { value: 'Funding & Innovation', label: 'Funding & Innovation' },
              { value: 'Coaching Center', label: 'Coaching Center' },
              { value: 'Media & Content', label: 'Media & Content' },
              { value: 'Workshop Teams', label: 'Workshop Teams' },
              { value: 'Other', label: 'Other' },
            ]}
          />

          <FormSelect
            label="Team Lead"
            required
            value={formData.leadUserId}
            onChange={(e) => setFormData({ ...formData, leadUserId: e.target.value })}
            options={users.map((user: any) => ({
              value: user._id,
              label: user.name,
            }))}
          />

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Team Members
            </label>
            <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-gray-300 p-3">
              {users.map((user: any) => (
                <label key={user._id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                  <input
                    type="checkbox"
                    checked={formData.members.includes(user._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          members: [...formData.members, user._id]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          members: formData.members.filter(id => id !== user._id)
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{user.name} ({user.email})</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Select team members ({formData.members.length} selected)
            </p>

            <div className="mt-3">
              <button
                type="button"
                className="text-sm text-primary-600 hover:underline"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                {showAddMember ? 'Hide quick add' : 'Quick add new member'}
              </button>
            </div>

            {showAddMember && (
              <div className="mt-3 rounded-lg border border-gray-200 p-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="Name"
                      value={newMember.name}
                      onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                      placeholder="Full name"
                    />
                    <FormInput
                      label="Email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormInput
                      label="Phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                      placeholder="10-digit phone"
                    />
                    <FormInput
                      label="Temp Password"
                      type="password"
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      placeholder="min 6 chars"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                      <select
                        value={newMember.roleId}
                        onChange={(e) => setNewMember({ ...newMember, roleId: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select role</option>
                        {roles.map((role: any) => (
                          <option key={role._id} value={role._id}>{role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">Assign to Team</label>
                      <select
                        value={newMember.teamId}
                        onChange={(e) => setNewMember({ ...newMember, teamId: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      >
                        <option value="">Select team (optional)</option>
                        {teams.map((t: any) => (
                          <option key={t._id} value={t._id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (!newMember.name || !newMember.email || !newMember.phone || !newMember.password || !newMember.roleId) {
                        showToast.error('Fill name, email, phone, password, role');
                        return;
                      }
                      if (!/^\d{10}$/.test(newMember.phone)) {
                        showToast.error('Phone must be 10 digits');
                        return;
                      }
                      setCreatingMember(true);
                      try {
                        const res = await userAPI.create({
                          name: newMember.name,
                          email: newMember.email,
                          phone: newMember.phone,
                          password: newMember.password,
                          roleIds: [newMember.roleId],
                        });
                        if (res.data?.success) {
                          // Refresh users and select the newly created member
                          const usersRes = await userAPI.getAll();
                          if (usersRes.data.success) {
                            setUsers(usersRes.data.data);
                            const newId = res.data.data._id;
                            setFormData((prev) => ({ ...prev, members: Array.from(new Set([...(prev.members || []), newId])) }));
                            // Optionally assign to a team via Teams update if different from current editing team
                            if (newMember.teamId && (!editingTeam || newMember.teamId !== editingTeam._id)) {
                              const targetTeam = teams.find((t: any) => t._id === newMember.teamId) as any;
                              if (targetTeam) {
                                const existingMembers = (targetTeam.members || [])
                                  .map((m: any) => (typeof m === 'string' ? m : m._id));
                                await teamAPI.update(targetTeam._id, { members: Array.from(new Set([...existingMembers, newId])) });
                              }
                            }
                            showToast.success('Member created and added');
                            setShowAddMember(false);
                            setNewMember({ name: '', email: '', phone: '', password: '', roleId: '', teamId: '' });
                          }
                        }
                      } catch (err: any) {
                        showToast.error(err.response?.data?.message || 'Failed to create member');
                      } finally {
                        setCreatingMember(false);
                      }
                    }}
                    disabled={creatingMember}
                  >
                    {creatingMember ? 'Adding...' : 'Add Member'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Brief description of the team's purpose..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              {editingTeam ? 'Update Team' : 'Create Team'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Performance Modal */}
      <Modal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        title={`Performance Report - ${selectedTeam?.name || ''}`}
        size="lg"
      >
        {teamPerformance && (
          <div className="space-y-6">
            {/* Performance Rating */}
            <div className="rounded-lg bg-gray-50 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Overall Performance</h3>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  teamPerformance.performanceRating === 'Excellent' ? 'bg-green-100 text-green-800' :
                  teamPerformance.performanceRating === 'Good' ? 'bg-blue-100 text-blue-800' :
                  teamPerformance.performanceRating === 'Average' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {teamPerformance.performanceRating}
                </span>
                <span className="text-sm text-gray-600">
                  Period: {teamPerformance.period}
                </span>
              </div>
            </div>

            {/* Task Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <FiTarget className="h-5 w-5 text-blue-600" />
                  <h4 className="font-medium text-gray-900">Tasks</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{teamPerformance.tasks.totalTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-medium">{teamPerformance.tasks.completedTasks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completion Rate:</span>
                    <span className="font-medium">{teamPerformance.tasks.completionRate.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-white p-4 border">
                <div className="flex items-center gap-2 mb-2">
                  <FiDollarSign className="h-5 w-5 text-green-600" />
                  <h4 className="font-medium text-gray-900">Financial</h4>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Income:</span>
                    <span className="font-medium">₹{teamPerformance.financial.income.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Expenses:</span>
                    <span className="font-medium">₹{teamPerformance.financial.expenses.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payroll:</span>
                    <span className="font-medium">₹{teamPerformance.financial.payroll.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget Summary */}
            <div className="rounded-lg bg-white p-4 border">
              <h4 className="font-medium text-gray-900 mb-3">Budget Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex justify-between">
                  <span>Monthly Budget:</span>
                  <span className="font-medium">₹{teamPerformance.budgetSummary.monthlyBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Used:</span>
                  <span className="font-medium">₹{teamPerformance.budgetSummary.totalUsed.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Remaining:</span>
                  <span className="font-medium">₹{teamPerformance.budgetSummary.remaining.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usage:</span>
                  <span className="font-medium">{teamPerformance.budgetSummary.budgetUsage.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Member Performance */}
            {teamPerformance.memberPerformance && teamPerformance.memberPerformance.length > 0 && (
              <div className="rounded-lg bg-white p-4 border">
                <h4 className="font-medium text-gray-900 mb-3">Member Performance</h4>
                <div className="space-y-3">
                  {teamPerformance.memberPerformance.map((member: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{member.memberName}</p>
                        <p className="text-sm text-gray-600">{member.memberEmail}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p>Tasks: {member.completedTasks}/{member.totalTasks}</p>
                        <p>Rate: {member.completionRate.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Budget Management Modal */}
      <Modal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        title={`Budget Management - ${selectedTeam?.name || ''}`}
        size="lg"
      >
        <div className="space-y-6">
          {/* Team Budget */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Budget Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <FormInput
                label="Monthly Budget (₹)"
                type="number"
                min="0"
                value={budgetData.monthlyBudget}
                onChange={(e) => setBudgetData({ ...budgetData, monthlyBudget: Number(e.target.value) })}
              />
              <FormInput
                label="Credit Limit (₹)"
                type="number"
                min="0"
                value={budgetData.creditLimit}
                onChange={(e) => setBudgetData({ ...budgetData, creditLimit: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Member Budgets */}
          {selectedTeam && selectedTeam.members && (
            <div className="rounded-lg bg-white p-4 border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Budget Settings</h3>
              <div className="space-y-4">
                {selectedTeam.members.map((member: any) => {
                  const memberBudget = budgetData.memberBudgets.find(b => String(b.memberId) === String(member._id));
                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-600">{member.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Monthly Limit"
                          min="0"
                          value={memberBudget?.monthlyLimit || 0}
                          onChange={(e) => {
                            const newBudgets = budgetData.memberBudgets.filter(b => String(b.memberId) !== String(member._id));
                            newBudgets.push({
                              memberId: member._id,
                              monthlyLimit: Number(e.target.value),
                              creditLimit: memberBudget?.creditLimit || 0
                            });
                            setBudgetData({ ...budgetData, memberBudgets: newBudgets });
                          }}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Credit Limit"
                          min="0"
                          value={memberBudget?.creditLimit || 0}
                          onChange={(e) => {
                            const newBudgets = budgetData.memberBudgets.filter(b => String(b.memberId) !== String(member._id));
                            newBudgets.push({
                              memberId: member._id,
                              monthlyLimit: memberBudget?.monthlyLimit || 0,
                              creditLimit: Number(e.target.value)
                            });
                            setBudgetData({ ...budgetData, memberBudgets: newBudgets });
                          }}
                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowBudgetModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateBudget}>
              Update Budgets
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}
