'use client';

import { useEffect, useState } from 'react';
import { projectAPI, teamAPI, userAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiEdit, FiTrash2, FiPlus, FiFolder, FiClock, FiDollarSign } from 'react-icons/fi';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    status: 'planned',
    teamId: '',
    ownerId: '',
    budget: 0,
    startDate: '',
    endDate: '',
    priority: 'medium',
    progress: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [projectsRes, teamsRes, usersRes] = await Promise.all([
        projectAPI.getAll(),
        teamAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (projectsRes.data.success) setProjects(projectsRes.data.data);
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
    
    if (!formData.title || !formData.category || !formData.teamId || !formData.ownerId) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingProject ? 'Updating project...' : 'Creating project...');

    try {
      if (editingProject) {
        await projectAPI.update(editingProject._id, formData);
        showToast.success('Project updated successfully!');
      } else {
        await projectAPI.create(formData);
        showToast.success('Project created successfully!');
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

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description || '',
      category: project.category,
      status: project.status,
      teamId: project.teamId?._id || project.teamId,
      ownerId: project.ownerId?._id || project.ownerId,
      budget: project.budget || 0,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
      priority: project.priority,
      progress: project.progress || 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This will also delete all associated tasks.')) return;

    const loadingToast = showToast.loading('Deleting project...');

    try {
      await projectAPI.delete(projectId);
      showToast.dismiss(loadingToast);
      showToast.success('Project deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      status: 'planned',
      teamId: '',
      ownerId: '',
      budget: 0,
      startDate: '',
      endDate: '',
      priority: 'medium',
      progress: 0,
    });
    setEditingProject(null);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      planned: 'bg-gray-100 text-gray-800',
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      'on-hold': 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'text-gray-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Projects" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading projects...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="Projects" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Project Management</h2>
              <p className="mt-1 text-sm text-gray-600">Track and manage your organization's projects</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="mr-2" />
              Create Project
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {projects.map((project: any) => (
              <div key={project._id} className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FiFolder className="h-5 w-5 text-primary-600" />
                      <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(project.priority)}`}>
                        ● {project.priority}
                      </span>
                    </div>
                    
                    {project.description && (
                      <p className="mt-2 text-gray-600">{project.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-6 text-sm">
                      <div className="flex items-center text-gray-600">
                        <FiFolder className="mr-2" />
                        <span className="font-medium">Category:</span>
                        <span className="ml-1">{project.category}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <FiDollarSign className="mr-2" />
                        <span className="font-medium">Budget:</span>
                        <span className="ml-1">₹{project.budget?.toLocaleString()}</span>
                      </div>
                      {project.startDate && (
                        <div className="flex items-center text-gray-600">
                          <FiClock className="mr-2" />
                          <span className="font-medium">Start:</span>
                          <span className="ml-1">{new Date(project.startDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {project.endDate && (
                        <div className="flex items-center text-gray-600">
                          <FiClock className="mr-2" />
                          <span className="font-medium">End:</span>
                          <span className="ml-1">{new Date(project.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {project.progress !== undefined && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>Progress</span>
                          <span className="font-medium">{project.progress}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className="h-full bg-primary-600 transition-all"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(project)}
                    >
                      <FiEdit className="mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(project._id)}
                    >
                      <FiTrash2 className="mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <FiFolder className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No projects found</p>
              <p className="mt-1 text-sm text-gray-500">Get started by creating your first project</p>
              <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                <FiPlus className="mr-2" />
                Create Project
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
        title={editingProject ? 'Edit Project' : 'Create New Project'}
        size="xl"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput
                label="Project Title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., JEE/NEET Coaching Batch - Oct 2025"
              />
            </div>

            <FormSelect
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              options={[
                { value: 'Coaching', label: 'Coaching' },
                { value: 'Workshops', label: 'Workshops' },
                { value: 'Media', label: 'Media' },
                { value: 'Innovation', label: 'Innovation' },
                { value: 'Funding', label: 'Funding' },
                { value: 'Product Sales', label: 'Product Sales' },
                { value: 'Other', label: 'Other' },
              ]}
            />

            <FormSelect
              label="Status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'planned', label: 'Planned' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'on-hold', label: 'On Hold' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />

            <FormSelect
              label="Priority"
              required
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />

            <FormSelect
              label="Team"
              required
              value={formData.teamId}
              onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Project Owner"
              required
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              options={users.map((user: any) => ({
                value: user._id,
                label: `${user.name} (${user.email})`,
              }))}
            />

            <FormInput
              label="Budget (₹)"
              type="number"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Progress (%)"
              type="number"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />

            <FormInput
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Brief description of the project..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
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
              {editingProject ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
