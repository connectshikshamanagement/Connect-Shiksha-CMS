'use client';

import { useEffect, useState } from 'react';
import { teamAPI, userAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiEdit, FiTrash2, FiUsers, FiPlus } from 'react-icons/fi';

export default function TeamsPage() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teamsRes, usersRes] = await Promise.all([
        teamAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
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
  };

  const handleOpenModal = () => {
    resetForm();
    setShowModal(true);
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
      
      <div className="flex-1 overflow-auto">
        <Header title="Teams" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
              <p className="mt-1 text-sm text-gray-600">Manage your organization's teams and members</p>
            </div>
            <Button onClick={handleOpenModal}>
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

                <div className="mt-4 flex gap-2">
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
              label: `${user.name} (${user.email})`,
            }))}
          />

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Team Members
            </label>
            <select
              multiple
              value={formData.members}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setFormData({ ...formData, members: selected });
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              size={5}
            >
              {users.map((user: any) => (
                <option key={user._id} value={user._id}>
                  {user.name} - {user.email}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple members</p>
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
    </div>
  );
}
