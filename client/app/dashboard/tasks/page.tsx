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
import { FiPlus, FiSearch, FiFilter, FiCalendar, FiUsers, FiFolder, FiCheckCircle } from 'react-icons/fi';

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
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
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
    onTaskStatusChanged: (data) => {
      setTasks(prev => prev.map(task => 
        task._id === data.taskId ? { ...task, status: data.status } : task
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
    priority: 'medium' as const,
    deadline: '',
  };

  const [taskFormData, setTaskFormData] = useState(formData);
  const [bulkTasks, setBulkTasks] = useState<Array<{id: string, title: string, description: string}>>([]);
  const [showBulkMode, setShowBulkMode] = useState(false);

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
      if (projectsRes.data.success) setProjects(projectsRes.data.data);
      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on active tab, search, and filters
  useEffect(() => {
    let filtered = tasks;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(task => task.status === activeTab);
    }

    // Hide done tasks for team members
    if (isMember) {
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

    // Sort tasks by priority and date
    filtered.sort((a, b) => {
      // Priority order: urgent > high > medium > low
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by deadline (earliest first)
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

    setFilteredTasks(filtered);
  }, [tasks, activeTab, searchTerm, filters, isMember]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!taskFormData.teamId || !taskFormData.assignedTo.length || !taskFormData.deadline) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingTask ? 'Updating task...' : 'Creating task...');

    try {
      if (showBulkMode && bulkTasks.length > 0) {
        // Create multiple tasks
        const tasksToCreate = bulkTasks.map(task => ({
          ...taskFormData,
          title: task.title,
          description: task.description,
        }));

        const promises = tasksToCreate.map(taskData => taskAPI.create(taskData));
        await Promise.all(promises);
        
        showToast.success(`${bulkTasks.length} tasks created successfully!`);
        setBulkTasks([]);
      } else {
        // Create single task
        if (!taskFormData.title) {
          showToast.error('Please provide a task title');
          return;
        }

        if (editingTask) {
          await taskAPI.update(editingTask._id, taskFormData);
          showToast.success('Task updated successfully!');
        } else {
          await taskAPI.create(taskFormData);
          showToast.success('Task created successfully!');
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
  };

  // Bulk task management functions
  const addBulkTask = () => {
    const newTask = {
      id: Date.now().toString(),
      title: '',
      description: ''
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

  const isAssignedToUser = (task: Task) => {
    if (typeof window === 'undefined') return false;
    return task.assignedTo.some(user => user._id === localStorage.getItem('userId'));
  };

  const getTabCounts = () => {
    return {
      all: tasks.length,
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
                  <Button onClick={() => { resetForm(); setShowModal(true); }}>
                    <FiPlus className="mr-2" />
                    Add Task
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => { resetForm(); setShowBulkMode(true); setShowModal(true); }}
                  >
                    <FiPlus className="mr-2" />
                    Bulk Create
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters - Hidden for team members */}
          {!isMember && (
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

                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="done">Done</option>
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
          )}

          {/* Simple Search for Team Members */}
          {isMember && (
            <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search your tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Task Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Tasks', icon: FiFolder },
                { key: 'todo', label: 'To Do', icon: FiCalendar },
                { key: 'in_progress', label: 'In Progress', icon: FiUsers },
                { key: 'review', label: 'Review', icon: FiFilter },
                // Hide Done tab for team members
                ...(isMember ? [] : [{ key: 'done', label: 'Done', icon: FiCheckCircle }]),
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

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingTask ? 'Edit Task' : showBulkMode ? 'Bulk Create Tasks' : 'Create New Task'}
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
              label="Project (Optional)"
              value={taskFormData.projectId}
              onChange={(e) => setTaskFormData({ ...taskFormData, projectId: e.target.value })}
              options={[
                { value: '', label: 'No Project' },
                ...projects.map((project: any) => ({
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

          {/* Member Assignment */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Assign To Members (Required)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3">
              {users.map((user: any) => (
                <label key={user._id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
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
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{user.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Selected: {taskFormData.assignedTo.length} member(s)
            </p>
          </div>

          {/* Single Task Mode */}
          {!showBulkMode && (
            <div className="mb-6">
              <FormInput
                label="Task Title"
                required
                value={taskFormData.title}
                onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                placeholder="e.g., Design workshop materials"
              />
              
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Detailed description of the task..."
                />
              </div>
            </div>
          )}

          {/* Bulk Task Mode */}
          {showBulkMode && (
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

              <div className="space-y-4 max-h-60 overflow-y-auto">
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
          )}

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
              {editingTask ? 'Update Task' : showBulkMode ? `Create ${bulkTasks.length} Tasks` : 'Create Task'}
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