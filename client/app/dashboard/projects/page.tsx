'use client';

import { useEffect, useState } from 'react';
import { projectAPI, teamAPI, userAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiEdit, FiTrash2, FiPlus, FiFolder, FiClock, FiDollarSign, FiUsers } from 'react-icons/fi';

// Types
interface RoleRef { key: string }
interface User {
  _id: string;
  id?: string;
  name: string;
  email?: string;
  roleIds?: RoleRef[];
  active?: boolean;
}

interface Team {
  _id: string;
  name: string;
}

interface ProjectMember { _id?: string; name?: string }

interface Project {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: 'planned' | 'active' | 'completed' | 'on-hold' | 'cancelled';
  teamId?: string | Team;
  ownerId?: string | User;
  projectMembers?: (string | ProjectMember)[];
  budget?: number;
  totalDealAmount?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
  totalExpense?: number;
}

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  status: Project['status'];
  teamId: string;
  ownerId: string;
  projectMembers: string[];
  budget: number;
  totalDealAmount: number;
  startDate: string;
  endDate: string;
  priority: Project['priority'];
  progress: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const { isFounder, isManager, isMember } = usePermissions();
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: '',
    status: 'planned',
    teamId: '',
    ownerId: '',
    projectMembers: [] as string[],
    budget: 0,
    totalDealAmount: 0,
    startDate: '',
    endDate: '',
    priority: 'medium',
    progress: 0,
  });

  useEffect(() => {
    fetchData();
  }, [isManager, isMember]);

  const fetchData = async () => {
    try {
      // Use role-based API calls
      const projectsPromise = (isFounder)
        ? projectAPI.getAll()
        : projectAPI.getMyTeamProjects();
      
      const [projectsRes, teamsRes, usersRes] = await Promise.all([
        projectsPromise,
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
      // Find founder user
      const founder = users.find((user: User) => 
        (user.roleIds || []).some((role: RoleRef) => role.key === 'FOUNDER')
      );

      // Ensure founder is included in project members (auto-check)
      const founderId = founder?._id || founder?.id;
      const memberIds = new Set(formData.projectMembers);
      
      // Auto-add founder if not already included
      if (founderId && !memberIds.has(founderId)) {
        memberIds.add(founderId);
      }
      
      // Prepare project data with automatic founder inclusion
      const projectData = {
        ...formData,
        projectMembers: Array.from(memberIds) // Ensure founder is always included
      };

      if (editingProject) {
        await projectAPI.update(editingProject._id, projectData);
        showToast.success('Project updated successfully!');
      } else {
        await projectAPI.create(projectData);
        showToast.success('Project created successfully!');
        if (founder) {
          showToast.success(`Founder automatically added to project members with 70% profit sharing`);
        }
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

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    // Ensure founder is included in edit state
    const founder = users.find((u: User) => (u.roleIds || []).some((r: RoleRef) => r.key === 'FOUNDER')) as User | undefined;
    const existingMembers = (project.projectMembers || []).map((m) => typeof m === 'string' ? m : (m._id || ''));
    const withFounder = founder ? Array.from(new Set([...(existingMembers || []), founder._id])) : existingMembers;
    setFormData({
      title: project.title,
      description: project.description || '',
      category: project.category,
      status: project.status,
      teamId: typeof project.teamId === 'string' ? project.teamId : (project.teamId?._id || ''),
      ownerId: typeof project.ownerId === 'string' ? project.ownerId : (project.ownerId?._id || ''),
      projectMembers: withFounder || [],
      budget: project.budget || 0,
      totalDealAmount: project.totalDealAmount || 0,
      startDate: project.startDate ? new Date(project.startDate as any).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate as any).toISOString().split('T')[0] : '',
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
      projectMembers: [],
      budget: 0,
      totalDealAmount: 0,
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

const toCap = (value: string) => value.replace(/\b\w/g, (c) => c.toUpperCase());

const diffDays = (a: Date, b: Date) => {
  const ms = a.getTime() - b.getTime();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
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
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Projects" />

        <div className="p-4 md:p-8 pb-20 md:pb-8">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">
                {isMember ? "My Projects" : "Project Management"}
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                {isMember ? "View projects you are assigned to" : "Track and manage your organization's projects"}
              </p>
            </div>
            {(isFounder || isManager) && (
              <Button onClick={() => { resetForm(); setShowModal(true); }} className="w-full sm:w-auto">
                <FiPlus className="mr-2" />
                Create Project
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-6">
            {projects.map((project: Project) => (
              <div key={project._id} className="rounded-xl bg-white p-6 shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-lg hover:border-primary-200">
                <div className="space-y-4">
                  {/* Project Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary-100 rounded-lg">
                          <FiFolder className="h-5 w-5 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900">{project.title}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${getStatusColor(project.status)}`}>
                          {toCap(project.status)}
                        </span>
                        <span className={`inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(project.priority)}`}>
                          Priority: {toCap(project.priority)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Project Description */}
                  {project.description && (
                    <p className="text-gray-600 text-sm leading-relaxed">{project.description}</p>
                  )}

                  {/* Project Details Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center text-gray-600 mb-1">
                        
                        <span className="text-xs font-medium uppercase tracking-wide">Category</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{project.category}</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center text-gray-600 mb-1">
                        
                        <span className="text-xs font-medium uppercase tracking-wide">Budget</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">₹{project.budget?.toLocaleString()}</p>
                    </div>
                    
                    {(project.totalDealAmount ?? 0) > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center text-gray-600 mb-1">
                         
                          <span className="text-xs font-medium uppercase tracking-wide">Deal Amount</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">₹{(project.totalDealAmount ?? 0).toLocaleString()}</p>
                      </div>
                    )}
                    
                    {/* Timeline (combined dates) */}
                    {(project.startDate || project.endDate) && (
                      <div className={`rounded-lg p-3 col-span-3 lg:col-span-3 border ${(() => {
                        const start = project.startDate ? new Date(project.startDate as any) : null;
                        const end = project.endDate ? new Date(project.endDate as any) : null;
                        const today = new Date();
                        const total = start && end ? diffDays(end, start) : 0;
                        const elapsed = start ? diffDays(today, start) : 0;
                        const remaining = Math.max(0, total - elapsed);
                        if (end && today > end) return 'bg-red-50 border-red-200';
                        if (total > 0 && remaining / total <= 0.2) return 'bg-yellow-50 border-yellow-200';
                        return 'bg-blue-50 border-blue-200';
                      })()}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center text-gray-700">
                            <FiClock className="mr-2 h-4 w-4" />
                            <span className="text-xs font-semibold uppercase tracking-wide">Timeline</span>
                          </div>
                          {(() => {
                            const start = project.startDate ? new Date(project.startDate as any) : null;
                            const end = project.endDate ? new Date(project.endDate as any) : null;
                            const today = new Date();
                            const overdue = end && today > end;
                            const total = start && end ? diffDays(end, start) : 0;
                            const elapsed = start ? diffDays(today, start) : 0;
                            const remaining = Math.max(0, total - elapsed);
                            const near = total > 0 && remaining / total <= 0.2 && !overdue;
                            return (
                              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${
                                overdue ? 'bg-red-100 text-red-800' : near ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {overdue ? 'Overdue' : near ? 'Near Deadline' : 'On Track'}
                              </span>
                            );
                          })()}
                        </div>
                        {(() => {
                          const start = project.startDate ? new Date(project.startDate as any) : null;
                          const end = project.endDate ? new Date(project.endDate as any) : null;
                          const today = new Date();
                          const total = start && end ? diffDays(end, start) : 0;
                          const elapsed = start ? diffDays(today, start) : 0;
                          const remaining = Math.max(0, total - elapsed);
                          const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;
                          return (
                            <div>
                              <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-900">
                                <span>Start: {start ? start.toLocaleDateString() : 'N/A'}</span>
                                <span>End: {end ? end.toLocaleDateString() : 'N/A'}</span>
                                <span>Total: {total} days</span>
                                <span>Elapsed: {elapsed}</span>
                                <span>Remaining: {remaining}</span>
                              </div>
                              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/50">
                                <div className={`h-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Budget Utilization Status */}
                  {(project.budget ?? 0) > 0 && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">Budget Status</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          (project.totalExpense ?? 0) > (project.budget ?? 0)
                            ? 'bg-red-100 text-red-800' 
                            : (project.totalExpense ?? 0) > ((project.budget ?? 0) * 0.8)
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {(project.totalExpense ?? 0) > (project.budget ?? 0)
                            ? 'Over Budget' 
                            : (project.totalExpense ?? 0) > ((project.budget ?? 0) * 0.8)
                            ? 'Near Limit'
                            : 'Within Budget'
                          }
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Utilization</span>
                          <span className="font-semibold text-gray-900">
                            {(project.budget ?? 0) > 0 ? Math.round(((project.totalExpense ?? 0) / (project.budget ?? 0)) * 100) : 0}%
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          ₹{(project.totalExpense ?? 0).toLocaleString()} / ₹{(project.budget ?? 0).toLocaleString()}
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (project.totalExpense ?? 0) > (project.budget ?? 0)
                                ? 'bg-red-500' 
                                : (project.totalExpense ?? 0) > ((project.budget ?? 0) * 0.8)
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ 
                              width: `${Math.min(((project.totalExpense ?? 0) / (project.budget ?? 0)) * 100 || 0, 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

{/* Project Progress */}
{project.progress !== undefined && (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">Project Progress</h4>
                        <span className="text-sm font-bold text-gray-900">{project.progress}%</span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Project Members */}
                  {project.projectMembers && project.projectMembers.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center text-gray-700 mb-3">
                        <FiUsers className="mr-2 h-4 w-4" />
                        <span className="text-sm font-semibold">Project Members</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.projectMembers.map((member, index: number) => {
                          const label = typeof member === 'string' ? member : (member.name || member._id || '');
                          return (
                            <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  

                  {/* Action Buttons */}
                  {(isFounder || isManager) && (
                    <div className="flex  flex-row gap-3 pt-4 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEdit(project)}
                      >
                        <FiEdit className="mr-2 h-4 w-4" />
                        Edit Project
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleDelete(project._id)}
                      >
                        <FiTrash2 className="mr-2 h-4 w-4" />
                        Delete Project
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <FiFolder className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium text-gray-900">No projects found</p>
              <p className="mt-1 text-sm text-gray-500">
                {isMember ? "You are not assigned to any projects yet" : "Get started by creating your first project"}
              </p>
              {(isFounder || isManager) && (
                <Button className="mt-4" onClick={() => { resetForm(); setShowModal(true); }}>
                  <FiPlus className="mr-2" />
                  Create Project
                </Button>
              )}
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
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Project['status'] })}
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
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as Project['priority'] })}
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
              onChange={(e) => setFormData({ ...formData, teamId: e.target.value, projectMembers: [] })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Members (Optional)
              </label>
            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {users
                  .filter((user: any) => user.active)
                  .map((user: any) => {
                    const isFounderUser = (user.roleIds || []).some((r: any) => r.key === 'FOUNDER');
                    const checked = formData.projectMembers.includes(user._id) || isFounderUser;
                    const disabled = isFounderUser; // Founder cannot be removed
                    return (
                      <label key={user._id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={(e) => {
                            if (disabled) return;
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                projectMembers: Array.from(new Set([...(formData.projectMembers || []), user._id]))
                              });
                            } else {
                              setFormData({
                                ...formData,
                                projectMembers: (formData.projectMembers || []).filter(id => id !== user._id)
                              });
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-700">
                          {user.name}{disabled ? ' — Founder' : ''}
                        </span>
                      </label>
                    );
                  })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select specific team members for this project. If none selected, all team members will be eligible for profit sharing.
              </p>
            </div>

            <FormSelect
              label="Project Owner"
              required
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              options={users.map((user: any) => ({
                value: user._id,
                label: user.name,
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
              label="Total Deal Amount (₹)"
              type="number"
              min="0"
              value={formData.totalDealAmount}
              onChange={(e) => setFormData({ ...formData, totalDealAmount: Number(e.target.value) })}
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
      
      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}
