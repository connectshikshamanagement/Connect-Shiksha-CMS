'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { taskAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import TaskList from '@/components/tasks/TaskList';
import { showToast } from '@/lib/toast';
import { usePermissions } from '@/hooks/usePermissions';
import { useTaskSocketEvents } from '@/hooks/useTaskSocketEvents';
import { FiCalendar, FiUsers, FiFilter, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';

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

export default function MyTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'todo' | 'in_progress' | 'review' | 'done'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const { userRole, isMember } = usePermissions();

  // Real-time socket events
  useTaskSocketEvents({
    onTaskCreated: (newTask) => {
      // Only add if assigned to current user
      const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
      if (userId && newTask.assignedTo?.some((user: any) => user._id === userId)) {
        setTasks(prev => [...prev, newTask]);
      }
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Redirect non-members to main tasks page
    if (!isMember) {
      router.push('/dashboard/tasks');
      return;
    }

    fetchMyTasks();
  }, [router, isMember]);

  const fetchMyTasks = async () => {
    try {
      const response = await taskAPI.getAll();
      if (response.data.success) {
        // Filter tasks assigned to current user
        const myTasks = response.data.data.filter((task: Task) =>
          task.assignedTo.some(user => user._id === localStorage.getItem('userId'))
        );
        setTasks(myTasks);
        setFilteredTasks(myTasks);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  // Filter tasks based on active tab and search
  useEffect(() => {
    let filtered = tasks;

    // Filter by tab
    if (activeTab !== 'all') {
      filtered = filtered.filter(task => task.status === activeTab);
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

    setFilteredTasks(filtered);
  }, [tasks, activeTab, searchTerm]);

  const handleUpdateProgress = async (taskId: string, progress: number, note?: string, status?: string) => {
    try {
      await taskAPI.updateProgress(taskId, { progress, note, status });
      fetchMyTasks(); // Refresh tasks
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update task');
    }
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

  const getTaskStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const overdueTasks = tasks.filter(t => {
      const deadline = new Date(t.deadline);
      const now = new Date();
      return deadline < now && t.status !== 'done';
    }).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    };
  };

  const tabCounts = getTabCounts();
  const stats = getTaskStats();

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="My Tasks" />
          <div className="flex h-96 items-center justify-center">
            <div className="text-xl">Loading your tasks...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 overflow-auto">
        <Header title="My Tasks" />

        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
            <p className="mt-1 text-sm text-gray-600">Track and manage your assigned tasks</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalTasks}</p>
                </div>
                <FiCalendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
                </div>
                <FiCheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
                </div>
                <FiUsers className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.completionRate}%</p>
                </div>
                <FiTrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
            <div className="relative">
              <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search your tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Task Tabs */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All Tasks', icon: FiCalendar },
                { key: 'todo', label: 'To Do', icon: FiCalendar },
                { key: 'in_progress', label: 'In Progress', icon: FiUsers },
                { key: 'review', label: 'Review', icon: FiFilter },
                { key: 'done', label: 'Done', icon: FiCheckCircle },
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

          {/* Overdue Tasks Alert */}
          {stats.overdueTasks > 0 && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <FiCalendar className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">
                    {stats.overdueTasks} overdue task{stats.overdueTasks > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-red-600">
                    Please review and update your overdue tasks
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Task List */}
          <div className="bg-white rounded-lg shadow-sm">
            <TaskList
              tasks={filteredTasks}
              onEdit={() => {}} // Team members can't edit tasks
              onDelete={() => {}} // Team members can't delete tasks
              onUpdateProgress={handleUpdateProgress}
              userRole={userRole}
              isAssignedToUser={isAssignedToUser}
            />
          </div>
        </div>
      </div>
    </div>
  );
}