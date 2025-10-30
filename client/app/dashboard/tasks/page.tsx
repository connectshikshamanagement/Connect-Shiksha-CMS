'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { taskAPI, projectAPI, userAPI, teamAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import FABMenu from '@/components/FABMenu';
import MobileNavbar from '@/components/MobileNavbar';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import TaskList from '@/components/tasks/TaskList';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useTaskSocketEvents } from '@/hooks/useTaskSocketEvents';
import { FiPlus, FiSearch, FiFilter, FiCalendar, FiUsers, FiFolder, FiCheckCircle, FiTrash2 } from 'react-icons/fi';

interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  progress: number;
  deadline: string;
  assignedTo: Array<{ _id: string; name: string; email: string }>;
  assignedBy: { _id: string; name: string; email: string };
  teamId: { _id: string; name: string; category: string };
  projectId?: { _id: string; title: string };
  notes: Array<{ userId: { name: string }; text: string; createdAt: string }>;
  createdAt: string;
}

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'todo' | 'in_progress' | 'review' | 'done'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    teamId: '',
    projectId: '',
    priority: '',
    status: ''
  });

  const { userRole, isFounder, isManager, isMember } = usePermissions();

  // Real-time socket events
  useTaskSocketEvents({
    onTaskCreated: (newTask) => {
      setTasks(prev => [...prev, newTask]);
    },
    onTaskUpdated: (updatedTask) => {
      setTasks(prev => prev.map(task => 
        task._id === updatedTask._id ? updatedTask : task
      ));
    },
    onTaskDeleted: (taskId) => {
      setTasks(prev => prev.filter(task => task._id !== taskId));
    },
    onTaskStatusChanged: (data: { taskId: string; status: string }) => {
      setTasks(prev => prev.map(task => 
        task._id === data.taskId ? { ...task, status: data.status as Task['status'] } : task
      ));
    },
    userId: typeof window !== 'undefined' ? localStorage.getItem('userId') || undefined : undefined,
  });

  const formData = {
    title: '',
    description: '',
    teamId: '',
    projectId: '',
    assignedTo: [] as string[],
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    deadline: '',
    checklist: [] as Array<{ text: string; completed: boolean }>,
  };

  const [taskFormData, setTaskFormData] = useState(formData);
  const [bulkTasks, setBulkTasks] = useState<Array<{id: string, title: string, description: string, assignedTo?: string[], checklist?: Array<{ text: string; completed: boolean }>}>>([]);
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [checklistInput, setChecklistInput] = useState('');
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes, teamsRes, usersRes] = await Promise.all([
        taskAPI.getAll(),
        projectAPI.getAll(),
        teamAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (tasksRes.data.success) {
        setTasks(tasksRes.data.data);
        setFilteredTasks(tasksRes.data.data);
      }
      
      let allProjectsData: any[] = [];
      if (projectsRes.data.success) {
        allProjectsData = projectsRes.data.data;
        setProjects(projectsRes.data.data);
        setAllProjects(projectsRes.data.data);
      }
      
      let allTeamsData: any[] = [];
      if (teamsRes.data.success) {
        allTeamsData = teamsRes.data.data;
        setTeams(teamsRes.data.data);
      }
      
      let allUsersData: any[] = [];
      if (usersRes.data.success) {
        allUsersData = usersRes.data.data;
        setUsers(usersRes.data.data);
        setAllMembers(usersRes.data.data);
      }
      
      // Filter projects and teams for team managers
      if (isManager && !isFounder) {
        try {
          const user = localStorage.getItem('user');
          if (user) {
            const userData = JSON.parse(user);
            const userId = userData._id || userData.id;
            
            // Filter teams - team managers can only see teams they lead or are members of
            const filteredTeams = allTeamsData.filter((team: any) => {
              const teamLeadId = typeof team.leadUserId === 'string' ? team.leadUserId : team.leadUserId?._id;
              const isLead = teamLeadId === userId;
              const isMember = team.members?.some((member: any) => {
                const memberId = typeof member === 'string' ? member : member._id;
                return memberId === userId;
              });
              return isLead || isMember;
            });
            setTeams(filteredTeams);
            
            // Filter projects - only show projects from teams the manager is part of
            const teamIds = filteredTeams.map((team: any) => team._id);
            const filteredProjects = allProjectsData.filter((project: any) => {
              const projectTeamId = typeof project.teamId === 'string' ? project.teamId : project.teamId?._id;
              return teamIds.includes(projectTeamId);
            });
            setFilteredProjects(filteredProjects);
          }
        } catch (error) {
          console.error('Error filtering data for team manager:', error);
          setFilteredProjects(allProjectsData);
        }
      } else {
        setFilteredProjects(allProjectsData);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on active tab, search, and filters
  useEffect(() => {
    let filtered = tasks;

    // Filter by tab (exclude done from 'All')
    if (activeTab !== 'all') {
      filtered = filtered.filter(task => task.status === activeTab);
    } else {
      filtered = filtered.filter(task => task.status !== 'done');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.teamId.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.projectId?.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by team
    if (filters.teamId) {
      filtered = filtered.filter(task => task.teamId._id === filters.teamId);
    }

    // Filter by project
    if (filters.projectId) {
      filtered = filtered.filter(task => task.projectId?._id === filters.projectId);
    }

    // Filter by priority
    if (filters.priority) {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(task => task.status === filters.status);
    }

    setFilteredTasks(filtered);
  }, [tasks, activeTab, searchTerm, filters]);

  // Filter projects based on selected team
  useEffect(() => {
    if (taskFormData.teamId) {
      const teamProjects = allProjects.filter((project: any) => {
        const projectTeamId = typeof project.teamId === 'string' ? project.teamId : project.teamId?._id;
        return projectTeamId === taskFormData.teamId;
      });
      setFilteredProjects(teamProjects);
      
      // Clear project selection if current project doesn't belong to selected team
      if (taskFormData.projectId) {
        const isProjectInTeam = teamProjects.some((p: any) => p._id === taskFormData.projectId);
        if (!isProjectInTeam) {
          setTaskFormData({ ...taskFormData, projectId: '', assignedTo: [] });
          setFilteredMembers([]);
        }
      }
    } else {
      // Reset to all filtered projects (based on role)
      if (isManager && !isFounder) {
        const user = localStorage.getItem('user');
        if (user) {
          try {
            const userData = JSON.parse(user);
            const userId = userData._id || userData.id;
            const userTeams = teams.filter((team: any) => {
              const teamLeadId = typeof team.leadUserId === 'string' ? team.leadUserId : team.leadUserId?._id;
              const isLead = teamLeadId === userId;
              const isMember = team.members?.some((member: any) => {
                const memberId = typeof member === 'string' ? member : member._id;
                return memberId === userId;
              });
              return isLead || isMember;
            });
            const teamIds = userTeams.map((team: any) => team._id);
            const filtered = allProjects.filter((project: any) => {
              const projectTeamId = typeof project.teamId === 'string' ? project.teamId : project.teamId?._id;
              return teamIds.includes(projectTeamId);
            });
            setFilteredProjects(filtered);
          } catch (error) {
            setFilteredProjects(allProjects);
          }
        }
      } else {
        setFilteredProjects(allProjects);
      }
    }
  }, [taskFormData.teamId, teams, allProjects, isManager, isFounder]);

  // Filter members based on selected project
  useEffect(() => {
    if (taskFormData.projectId) {
      const selectedProject = allProjects.find((p: any) => p._id === taskFormData.projectId);
      if (selectedProject) {
        // Get project members from projectMembers array and active memberDetails
        const projectMemberIds = (selectedProject.projectMembers || []).map((id: any) => 
          typeof id === 'string' ? id : id._id
        );
        const activeMemberIds = (selectedProject.memberDetails || [])
          .filter((m: any) => m.isActive !== false)
          .map((m: any) => typeof m.userId === 'string' ? m.userId : m.userId._id);
        
        const allProjectMemberIds = [...new Set([...projectMemberIds, ...activeMemberIds])];
        const projectMembers = allMembers.filter((user: any) => 
          allProjectMemberIds.includes(user._id)
        );
        setFilteredMembers(projectMembers);
        
        // Remove assigned members who are not in the project
        const validAssignedMembers = taskFormData.assignedTo.filter(id => 
          allProjectMemberIds.includes(id)
        );
        if (validAssignedMembers.length !== taskFormData.assignedTo.length) {
          setTaskFormData({ ...taskFormData, assignedTo: validAssignedMembers });
        }
      } else {
        setFilteredMembers([]);
      }
    } else {
      setFilteredMembers([]);
    }
  }, [taskFormData.projectId, allProjects, allMembers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskFormData.teamId || !taskFormData.projectId || !taskFormData.deadline) {
      showToast.error('Please fill in all required fields (Team, Project, and Deadline)');
      return;
    }

    if (bulkTasks.length === 0) {
      showToast.error('Please add at least one task');
      return;
    }

    const loadingToast = showToast.loading('Creating tasks...');

    try {
      // Create multiple tasks
      const tasksToCreate = bulkTasks.map(task => {
        if (!task.title || task.title.trim() === '') {
          throw new Error('All tasks must have a title');
        }
        return {
          ...taskFormData,
          title: task.title,
          description: task.description || '',
          assignedTo: (task.assignedTo && task.assignedTo.length > 0) ? task.assignedTo : taskFormData.assignedTo,
          checklist: task.checklist || [],
        };
      });

      const promises = tasksToCreate.map(taskData => {
        if (!taskData.projectId) {
          throw new Error('Project is required for all tasks');
        }
        if (!taskData.assignedTo || taskData.assignedTo.length === 0) {
          throw new Error('At least one member must be assigned to each task');
        }
        return taskAPI.create(taskData);
      });
      await Promise.all(promises);
      
      showToast.success(`${bulkTasks.length} task(s) created successfully!`);
      setBulkTasks([]);
      
      showToast.dismiss(loadingToast);
      setShowModal(false);
      setShowBulkMode(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.message || error.response?.data?.message || 'Operation failed');
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTaskFormData({
      title: task.title,
      description: task.description || '',
      teamId: task.teamId._id,
      projectId: task.projectId?._id || '',
      assignedTo: task.assignedTo.map(user => user._id),
      priority: task.priority,
      deadline: new Date(task.deadline).toISOString().split('T')[0],
      checklist: (task as any).checklist || [],
    });
    setShowModal(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const loadingToast = showToast.loading('Deleting task...');

    try {
      await taskAPI.delete(taskId);
      showToast.dismiss(loadingToast);
      showToast.success('Task deleted successfully!');
      fetchData();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleUpdateProgress = async (taskId: string, progress: number, note?: string, status?: string) => {
    try {
      await taskAPI.updateProgress(taskId, { progress, note, status });
      fetchData(); // Refresh tasks
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update task');
    }
  };

  const resetForm = () => {
    setTaskFormData(formData);
    setEditingTask(null);
    setBulkTasks([]);
    setShowBulkMode(false);
    setChecklistInput('');
  };

  // Bulk task management functions
  const addBulkTask = () => {
    const newTask = {
      id: Date.now().toString(),
      title: '',
      description: '',
      assignedTo: [] as string[],
      checklist: [] as Array<{ text: string; completed: boolean }>,
    };
    setBulkTasks([...bulkTasks, newTask]);
  };

  const removeBulkTask = (id: string) => {
    setBulkTasks(bulkTasks.filter(task => task.id !== id));
  };

  const updateBulkTask = (id: string, field: 'title' | 'description', value: string) => {
    setBulkTasks(bulkTasks.map(task => 
      task.id === id ? { ...task, [field]: value } : task
    ));
  };

  const updateBulkTaskAssignees = (id: string, userId: string, checked: boolean) => {
    setBulkTasks(bulkTasks.map(task => {
      if (task.id !== id) return task;
      const currentAssignees = task.assignedTo || [];
      const newAssignees = checked
        ? [...currentAssignees, userId]
        : currentAssignees.filter((uid: string) => uid !== userId);
      return { ...task, assignedTo: newAssignees };
    }));
  };

  const isAssignedToUser = (task: Task) => {
    if (typeof window === 'undefined') return false;
    return task.assignedTo.some(user => user._id === localStorage.getItem('userId'));
  };

  const getTabCounts = () => {
    return {
      all: tasks.filter(t => t.status !== 'done').length,
      todo: tasks.filter(t => t.status === 'todo').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
    };
  };

  const tabCounts = getTabCounts();

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="Tasks" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading tasks...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto pt-16 md:pt-0">
        <Header title="Tasks" />

        <div className="p-4 md:p-6 pb-20 md:pb-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Task Management</h2>
                <p className="mt-1 text-sm text-gray-600">Manage and track your team's tasks</p>
              </div>
              {(isFounder || isManager) && (
                <div className="flex gap-2">
                  <Button onClick={() => { resetForm(); setShowBulkMode(true); setShowModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Task
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={filters.teamId}
                  onChange={(e) => setFilters({ ...filters, teamId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Teams</option>
                  {teams.map((team: any) => (
                    <option key={team._id} value={team._id}>{team.name}</option>
                  ))}
                </select>

                <select
                  value={filters.projectId}
                  onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Projects</option>
                  {projects.map((project: any) => (
                    <option key={project._id} value={project._id}>{project.title}</option>
                  ))}
                </select>

                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>

                <button
                  onClick={() => setFilters({ teamId: '', projectId: '', priority: '', status: '' })}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Task Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Tasks', icon: FiFolder },
                { key: 'todo', label: 'To Do', icon: FiCalendar },
                { key: 'in_progress', label: 'In Progress', icon: FiUsers },
                { key: 'review', label: 'Review', icon: FiFilter },
                { key: 'done', label: 'Done', icon: FiPlus },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === key
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    activeTab === key ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tabCounts[key as keyof typeof tabCounts]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Task List */}
          <div className="bg-white rounded-lg shadow-sm">
            <TaskList
              tasks={filteredTasks}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onUpdateProgress={handleUpdateProgress}
              userRole={userRole}
              isAssignedToUser={isAssignedToUser}
            />
          </div>
        </div>
      </div>

      {/* Add Task Modal - Bulk Creation */}
      {showBulkMode && showModal && (
        <Modal
          isOpen={showBulkMode && showModal}
          onClose={() => {
            setShowBulkMode(false);
            setShowModal(false);
            resetForm();
          }}
          title="Add Tasks"
          size="lg"
        >
          <form onSubmit={handleSubmit}>
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <FormSelect
                label="Team"
                required
                value={taskFormData.teamId}
                onChange={(e) => setTaskFormData({ ...taskFormData, teamId: e.target.value })}
                options={teams.map((team: any) => ({
                  value: team._id,
                  label: team.name,
                }))}
              />

              <FormSelect
                label="Project"
                required
                value={taskFormData.projectId}
                onChange={(e) => {
                  const newProjectId = e.target.value;
                  setTaskFormData({ 
                    ...taskFormData, 
                    projectId: newProjectId,
                    assignedTo: []
                  });
                }}
                options={[
                  { value: '', label: 'Select Project' },
                  ...filteredProjects.map((project: any) => ({
                    value: project._id,
                    label: project.title,
                  }))
                ]}
              />

              <FormSelect
                label="Priority"
                required
                value={taskFormData.priority}
                onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as any })}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' },
                ]}
              />

              <FormInput
                label="Deadline"
                type="date"
                required
                value={taskFormData.deadline}
                onChange={(e) => setTaskFormData({ ...taskFormData, deadline: e.target.value })}
              />
            </div>

            {/* Default Member Assignment (Optional - can be overridden per task) */}
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Default Assignees (Optional - can be overridden per task)
              </label>
              {!taskFormData.projectId ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">Please select a project first to see available members.</p>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-600">No members available for this project. Please add members to the project first.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {filteredMembers.map((user: any) => (
                      <label key={user._id} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full hover:bg-gray-100 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={taskFormData.assignedTo.includes(user._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTaskFormData({
                                ...taskFormData,
                                assignedTo: [...taskFormData.assignedTo, user._id]
                              });
                            } else {
                              setTaskFormData({
                                ...taskFormData,
                                assignedTo: taskFormData.assignedTo.filter(id => id !== user._id)
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{user.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Selected: {taskFormData.assignedTo.length} member(s) | Available: {filteredMembers.length} member(s) in this project
                  </p>
                </>
              )}
            </div>

            {/* Bulk Tasks */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-800">Tasks to Create</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBulkTask}
                >
                  <FiPlus className="mr-1" />
                  Add Task
                </Button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {bulkTasks.map((task, index) => (
                  <div key={task.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-800">Task {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeBulkTask(task.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={task.title}
                        onChange={(e) => updateBulkTask(task.id, 'title', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      
                      <textarea
                        placeholder="Task description..."
                        value={task.description}
                        onChange={(e) => updateBulkTask(task.id, 'description', e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />

                      {/* Per-task assignees */}
                      {taskFormData.projectId && filteredMembers.length > 0 && (
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700">
                            Assign To (Override default)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {filteredMembers.map((user: any) => {
                              const isAssigned = (task.assignedTo || []).includes(user._id);
                              return (
                                <label key={user._id} className="flex items-center gap-2 px-2 py-1 bg-white rounded-full hover:bg-gray-50 cursor-pointer transition-colors text-sm border border-gray-200">
                                  <input
                                    type="checkbox"
                                    checked={isAssigned}
                                    onChange={(e) => updateBulkTaskAssignees(task.id, user._id, e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="text-xs text-gray-700">{user.name}</span>
                                </label>
                              );
                            })}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {task.assignedTo && task.assignedTo.length > 0 
                              ? `${task.assignedTo.length} member(s) assigned. If none selected, uses default assignees above.`
                              : 'If none selected, uses default assignees above.'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {bulkTasks.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FiPlus className="mx-auto mb-2 h-8 w-8" />
                  <p>No tasks added yet. Click "Add Task" to get started.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowBulkMode(false);
                  setShowModal(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                Create {bulkTasks.length} Task{bulkTasks.length !== 1 ? 's' : ''}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Mobile Components */}
      <FABMenu />
      <MobileNavbar />
    </div>
  );
}