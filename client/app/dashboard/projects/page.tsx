'use client';

import { useEffect, useState } from 'react';
import { projectAPI, teamAPI, userAPI } from '@/lib/api';
import { formatDDMMYY } from '@/lib/date';
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
  leadUserId?: string | User;
  members?: (string | User)[];
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
  budget: string; // UI accepts empty string
  totalDealAmount: string; // UI accepts empty string
  startDate: string;
  endDate: string;
  priority: Project['priority'];
  progress: string; // UI accepts empty string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const { isFounder, isProjectManager, isMember, userRoles } = usePermissions();
  const isManager = isProjectManager;
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: '',
    status: 'planned',
    teamId: '',
    ownerId: '',
    projectMembers: [] as string[],
    budget: '',
    totalDealAmount: '',
    startDate: '',
    endDate: '',
    priority: 'medium',
    progress: '',
  });

  // Track member join dates
  const [memberJoinDates, setMemberJoinDates] = useState<Record<string, string>>({});
  // Track member end dates (left dates)
  const [memberEndDates, setMemberEndDates] = useState<Record<string, string>>({});
  // Track custom share percentages (of the 30% team pool) for members
  const [memberSharePercents, setMemberSharePercents] = useState<Record<string, number>>({});
  // Track per-member active state
  const [memberActiveStates, setMemberActiveStates] = useState<Record<string, boolean>>({});
  // Track existing members (cannot be removed after creation)
  const [existingMemberIds, setExistingMemberIds] = useState<Set<string>>(new Set());

  const isAdmin = (userRoles || []).some((role) => role.key === 'ADMIN');
  const isFounderOrAdmin = isFounder || isAdmin;
  const canCreateProjects = isFounderOrAdmin || isManager;

  useEffect(() => {
    fetchData();
  }, [isManager, isMember, isFounderOrAdmin]);

  const fetchData = async () => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      let me: User | null = null;
      let myId: string | null = null;
      if (raw) {
        me = JSON.parse(raw) as User;
        myId = me?._id || me?.id || null;
      }
      setCurrentUser(me);
      setCurrentUserId(myId);

      // Use role-based API calls
      const projectsPromise = isFounder
        ? projectAPI.getAll()
        : projectAPI.getMyTeamProjects();
      
      const [projectsRes, teamsRes, usersRes] = await Promise.all([
        projectsPromise,
        teamAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (projectsRes.data.success) {
        let list: Project[] = projectsRes.data.data;
        if (myId) {
          // For Project Managers and Team Members, restrict to projects they own or are explicitly a member of
          if (isManager || (isMember && !isManager)) {
            list = list.filter((p) => {
              const ownerId = typeof p.ownerId === 'string' ? p.ownerId : p.ownerId?._id;
              const members = (p.projectMembers || []).map((m) => typeof m === 'string' ? m : (m._id || ''));
              return ownerId === myId || members.includes(myId);
            });
          }
        }
        setProjects(list);
      }
      if (teamsRes.data.success) {
        let teamList: any[] = teamsRes.data.data;
        if (!isFounderOrAdmin && myId) {
          teamList = teamList.filter((team) => {
            const leadValue = team.leadUserId;
            const leadId =
              typeof leadValue === 'string'
                ? leadValue
                : leadValue?._id || leadValue?.toString?.();
            if (leadId === myId) return true;
            const memberIds = (team.members || []).map((member: any) => {
              if (typeof member === 'string') return member;
              if (member?._id) return member._id;
              if (typeof member?.toString === 'function') return member.toString();
              return member;
            });
            return memberIds.includes(myId);
          });
        }
        setTeams(teamList as Team[]);
      }
      if (usersRes.data.success) setUsers(usersRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const submissionOwnerId = isFounderOrAdmin ? formData.ownerId : currentUserId;

    if (!formData.title || !formData.category || !formData.teamId || !submissionOwnerId) {
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
        // Set founder's join date to project start date
        if (formData.startDate) {
          memberJoinDates[founderId] = formData.startDate;
        }
      }
      
      // Prepare project data with automatic founder inclusion and member join dates
      const projectData: any = {
        ...formData,
        ownerId: submissionOwnerId,
        projectMembers: Array.from(memberIds), // Ensure founder is always included
        memberJoinDates: memberJoinDates, // Include join dates for each member
        memberLeftDates: memberEndDates, // Include left dates for each member
        memberSharePercents: memberSharePercents, // Include custom share percentages
        memberActiveStates: memberActiveStates // Include active/deactive states
      };

      // Coerce numeric fields only if provided
      if (formData.budget !== '') projectData.budget = Number(formData.budget);
      if (formData.totalDealAmount !== '') projectData.totalDealAmount = Number(formData.totalDealAmount);
      if (formData.progress !== '') projectData.progress = Number(formData.progress);

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

  const handleEdit = async (project: Project) => {
    setEditingProject(project);
    // Ensure founder is included in edit state
    const founder = users.find((u: User) => (u.roleIds || []).some((r: RoleRef) => r.key === 'FOUNDER')) as User | undefined;
    const existingMembers = (project.projectMembers || []).map((m) => typeof m === 'string' ? m : (m._id || ''));
    const withFounder = founder ? Array.from(new Set([...(existingMembers || []), founder._id])) : existingMembers;
    
  // Fetch project details to get member join dates and share %
  const joinDates: Record<string, string> = {};
  const endDates: Record<string, string> = {};
  const sharePercents: Record<string, number> = {};
  const activeStates: Record<string, boolean> = {};
    try {
      const response = await projectAPI.getOne(project._id);
      if (response.data.success && response.data.data.memberDetails) {
        // Extract join dates from memberDetails
        response.data.data.memberDetails.forEach((detail: any) => {
          const memberId = typeof detail.userId === 'string' ? detail.userId : detail.userId?._id;
          if (memberId && detail.joinedDate) {
            joinDates[memberId] = new Date(detail.joinedDate).toISOString().split('T')[0];
          }
          if (memberId && detail.leftDate) {
            endDates[memberId] = new Date(detail.leftDate).toISOString().split('T')[0];
          }
          if (memberId && typeof detail.sharePercentage === 'number') {
            sharePercents[memberId] = detail.sharePercentage;
          }
          if (memberId && typeof detail.isActive === 'boolean') {
            activeStates[memberId] = !!detail.isActive;
          }
        });
        setExistingMemberIds(new Set(response.data.data.memberDetails.map((d: any) => (typeof d.userId === 'string' ? d.userId : d.userId?._id))));
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
    
    setMemberJoinDates(joinDates);
    setMemberEndDates(endDates);
    setMemberSharePercents(sharePercents);
    setMemberActiveStates(activeStates);
    setFormData({
      title: project.title,
      description: project.description || '',
      category: project.category,
      status: project.status,
      teamId: typeof project.teamId === 'string' ? project.teamId : (project.teamId?._id || ''),
      ownerId: typeof project.ownerId === 'string' ? project.ownerId : (project.ownerId?._id || ''),
      projectMembers: withFounder || [],
      budget: project.budget ? String(project.budget) : '',
      totalDealAmount: project.totalDealAmount ? String(project.totalDealAmount) : '',
      startDate: project.startDate ? new Date(project.startDate as any).toISOString().split('T')[0] : '',
      endDate: project.endDate ? new Date(project.endDate as any).toISOString().split('T')[0] : '',
      priority: project.priority,
      progress: typeof project.progress === 'number' && project.progress > 0 ? String(project.progress) : '',
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
      ownerId: isFounderOrAdmin ? '' : (currentUserId || ''),
      projectMembers: [],
      budget: '',
      totalDealAmount: '',
      startDate: '',
      endDate: '',
      priority: 'medium',
      progress: '',
    });
    setMemberJoinDates({});
    setMemberSharePercents({});
    setMemberEndDates({});
    setMemberActiveStates({});
    setExistingMemberIds(new Set());
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
            {canCreateProjects && (
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
                                <span>Start: {start ? formatDDMMYY(start) : 'N/A'}</span>
                                <span>End: {end ? formatDDMMYY(end) : 'N/A'}</span>
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
                  {(() => {
                    const ownerId =
                      typeof project.ownerId === 'string'
                        ? project.ownerId
                        : project.ownerId?._id;
                    const canManageProject =
                      isFounderOrAdmin || (currentUserId && ownerId === currentUserId);
                    return (
                      canManageProject && (
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
                      )
                    );
                  })()}
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
              {canCreateProjects && (
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


            {isFounderOrAdmin ? (
              <FormSelect
                label="Project Manager"
                required
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                options={users.map((user: any) => ({
                  value: user._id,
                  label: user.name,
                }))}
              />
            ) : (
              <FormInput
                label="Project Manager"
                value={currentUser?.name || 'You'}
                disabled
                readOnly
              />
            )}

            <FormInput
              label="Budget (₹)"
              type="number"
              min="0"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0"
            />

            <FormInput
              label="Total Deal Amount (₹)"
              type="number"
              min="0"
              value={formData.totalDealAmount}
              onChange={(e) => setFormData({ ...formData, totalDealAmount: e.target.value })}
              placeholder="0"
            />

            <FormInput
              label="Progress (%)"
              type="number"
              min="0"
              max="100"
              value={formData.progress}
              onChange={(e) => setFormData({ ...formData, progress: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Members (Optional)
              </label>
            <div className="space-y-3 max-h-96 overflow-y-auto border rounded-md p-3">
                {users
                  .filter((user: any) => user.active)
                  .map((user: any) => {
                    const isFounderUser = (user.roleIds || []).some((r: any) => r.key === 'FOUNDER');
                    const isExisting = existingMemberIds.has(user._id);
                    const checked = formData.projectMembers.includes(user._id) || isFounderUser || isExisting;
                    const checkboxDisabled = isFounderUser || (editingProject && isExisting); // cannot uncheck founder or existing members
                    const fieldsDisabled = isFounderUser; // only founder's fields are locked; others remain editable
                    return (
                      <div key={user._id} className="space-y-2 p-2 bg-gray-50 rounded">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={checkboxDisabled}
                            onChange={(e) => {
                              if (checkboxDisabled) return;
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  projectMembers: Array.from(new Set([...(formData.projectMembers || []), user._id]))
                                });
                                // Set default join date to project start date or today
                                const defaultDate = formData.startDate || new Date().toISOString().split('T')[0];
                                setMemberJoinDates({
                                  ...memberJoinDates,
                                  [user._id]: defaultDate
                                });
                                // Set default end date to today on selection
                                const today = new Date().toISOString().split('T')[0];
                                setMemberEndDates({
                                  ...memberEndDates,
                                  [user._id]: today
                                });
                                // Default active state to true for newly added members
                                setMemberActiveStates((prev) => ({ ...prev, [user._id]: true }));
                              } else {
                                setFormData({
                                  ...formData,
                                  projectMembers: (formData.projectMembers || []).filter(id => id !== user._id)
                                });
                                // Remove join date when unchecking
                                const newDates = { ...memberJoinDates };
                                delete newDates[user._id];
                                setMemberJoinDates(newDates);
                            // Remove custom share percent when unchecking
                            setMemberSharePercents((prev) => {
                              const next = { ...prev } as Record<string, number>;
                              delete next[user._id];
                              return next;
                            });
                            // Remove end date when unchecking
                            setMemberEndDates((prev) => {
                              const next = { ...prev } as Record<string, string>;
                              delete next[user._id];
                              return next;
                            });
                            setMemberActiveStates((prev) => {
                              const next = { ...prev } as Record<string, boolean>;
                              delete next[user._id];
                              return next;
                            });
                              }
                            }}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {user.name}{isFounderUser ? ' — Founder' : (editingProject && isExisting ? ' — Existing' : '')}
                          </span>
                        </label>
                        {checked && (
                          <div className="ml-6">
                            {!isFounderUser && (
                              <div className="mb-2 flex items-center gap-2">
                                <label className="text-xs text-gray-600">Active</label>
                                <input
                                  type="checkbox"
                                  checked={memberActiveStates[user._id] !== false}
                                  onChange={(e) => {
                                    const active = e.target.checked;
                                    setMemberActiveStates((prev) => ({ ...prev, [user._id]: active }));
                                    if (!active) {
                                      if (!memberEndDates[user._id]) {
                                        const today = new Date().toISOString().split('T')[0];
                                        setMemberEndDates((prev) => ({ ...prev, [user._id]: today }));
                                      }
                                    } else {
                                      setMemberEndDates((prev) => {
                                        const next = { ...prev } as Record<string, string>;
                                        delete next[user._id];
                                        return next;
                                      });
                                    }
                                  }}
                                />
                              </div>
                            )}
                            <label className="block text-xs text-gray-600 mb-1">
                              Joining Date {fieldsDisabled ? '(auto-set to project start)' : ''}
                            </label>
                            <input
                              type="date"
                              disabled={fieldsDisabled}
                              value={
                                fieldsDisabled 
                                  ? formData.startDate || '' 
                                  : memberJoinDates[user._id] || ''
                              }
                              onChange={(e) => {
                                setMemberJoinDates({
                                  ...memberJoinDates,
                                  [user._id]: e.target.value
                                });
                              }}
                              className="w-full text-sm rounded border-gray-300 px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              placeholder="Select join date"
                            />
                            {!fieldsDisabled && (
                              <div className="mt-2">
                                <label className="block text-xs text-gray-600 mb-1">
                                  Leave Date
                                </label>
                                <input
                                  type="date"
                                  value={memberEndDates[user._id] || ''}
                                  onChange={(e) => {
                                    setMemberEndDates((prev) => ({
                                      ...prev,
                                      [user._id]: e.target.value,
                                    }));
                                  }}
                                  className="w-full text-sm rounded border-gray-300 px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                  placeholder="Select leave date"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Defaults to today when member is selected.</p>
                              </div>
                            )}
                            {!fieldsDisabled && (
                              <div className="mt-2">
                                <label className="block text-xs text-gray-600 mb-1">
                                  Share % (of 30% team pool)
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={memberSharePercents[user._id] ?? ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const num = val === '' ? undefined : Number(val);
                                    setMemberSharePercents((prev) => {
                                      const next = { ...prev } as Record<string, number>;
                                      if (num === undefined || Number.isNaN(num)) {
                                        delete next[user._id];
                                      } else {
                                        next[user._id] = num;
                                      }
                                      return next;
                                    });
                                  }}
                                  className="w-full text-sm rounded border-gray-300 px-2 py-1 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                  placeholder="Auto"
                                />
                                <p className="text-[10px] text-gray-500 mt-1">Leave blank to auto-distribute equally. Project manager gets +3% bonus.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select team members and set their joining dates. Join dates are used for profit share calculations.
              </p>
            </div>

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