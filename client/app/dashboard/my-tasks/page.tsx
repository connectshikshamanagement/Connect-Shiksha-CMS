'use client';

import { useEffect, useState } from 'react';
import { enhancedTaskAPI, teamAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { 
  FiPlus, FiEdit, FiTrash2, FiCheck, FiClock, FiAlertTriangle, 
  FiCalendar, FiUser, FiTarget, FiMessageSquare, FiTrendingUp,
  FiFilter, FiSearch
} from 'react-icons/fi';

export default function MyTasksPage() {
  const [tasks, setTasks] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });
  const [newComment, setNewComment] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTaskData, setCreateTaskData] = useState({
    teamId: '',
    assignedTo: '',
    title: '',
    description: '',
    deadline: '',
    priority: 'medium',
    projectId: ''
  });

  // Get current user ID from localStorage
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;

  useEffect(() => {
    if (currentUserId) {
      fetchTasks();
    }
  }, [currentUserId]);

  const fetchTasks = async () => {
    try {
      const [tasksRes, teamsRes] = await Promise.all([
        enhancedTaskAPI.getTasksByUser(currentUserId, {
          status: filters.status || undefined,
          priority: filters.priority || undefined
        }),
        teamAPI.getAll()
      ]);
      
      if (tasksRes.data.success) {
        setTasks(tasksRes.data.data);
      }
      if (teamsRes.data.success) {
        // Filter teams where current user is a member
        setTeams(teamsRes.data.data.filter((team: any) => 
          team.members.includes(currentUserId)
        ));
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: string) => {
    const loadingToast = showToast.loading('Updating task status...');

    try {
      await enhancedTaskAPI.updateTaskStatus(taskId, newStatus);
      showToast.dismiss(loadingToast);
      showToast.success('Task status updated successfully!');
      fetchTasks();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to update task status');
    }
  };

  const handleProgressUpdate = async (taskId: string, progress: number) => {
    const loadingToast = showToast.loading('Updating task progress...');

    try {
      await enhancedTaskAPI.updateTaskProgress(taskId, progress);
      showToast.dismiss(loadingToast);
      showToast.success('Task progress updated successfully!');
      fetchTasks();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to update task progress');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      showToast.error('Please enter a comment');
      return;
    }

    const loadingToast = showToast.loading('Adding comment...');

    try {
      await enhancedTaskAPI.addTaskComment(selectedTask._id, newComment);
      showToast.dismiss(loadingToast);
      showToast.success('Comment added successfully!');
      setNewComment('');
      setShowCommentModal(false);
      fetchTasks();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createTaskData.teamId || !createTaskData.assignedTo || !createTaskData.title || !createTaskData.deadline) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading('Creating task...');

    try {
      await enhancedTaskAPI.createTask(createTaskData);
      showToast.dismiss(loadingToast);
      showToast.success('Task created successfully!');
      setShowCreateModal(false);
      setCreateTaskData({
        teamId: '',
        assignedTo: '',
        title: '',
        description: '',
        deadline: '',
        priority: 'medium',
        projectId: ''
      });
      fetchTasks();
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-purple-100 text-purple-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date() && selectedTask?.status !== 'done';
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
                         task.description?.toLowerCase().includes(filters.search.toLowerCase());
    return matchesSearch;
  });

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    overdue: tasks.filter(t => isOverdue(t.deadline)).length
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 overflow-auto">
          <Header title="My Tasks" />
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
      
      <div className="flex-1 overflow-auto">
        <Header title="My Tasks" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
              <p className="mt-1 text-sm text-gray-600">Manage and track your assigned tasks</p>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <FiPlus className="mr-2" />
              Create Task
            </Button>
          </div>

          {/* Task Statistics */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3">
                  <FiTarget className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{taskStats.total}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3">
                  <FiCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{taskStats.completed}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-yellow-100 p-3">
                  <FiClock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{taskStats.inProgress}</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex items-center">
                <div className="rounded-full bg-red-100 p-3">
                  <FiAlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">{taskStats.overdue}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-lg bg-white p-4 shadow">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <FiSearch className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              
              <FormSelect
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'todo', label: 'To Do' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'review', label: 'Review' },
                  { value: 'done', label: 'Done' },
                  { value: 'blocked', label: 'Blocked' }
                ]}
              />

              <FormSelect
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                options={[
                  { value: '', label: 'All Priorities' },
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' }
                ]}
              />

              <Button
                variant="outline"
                onClick={fetchTasks}
                className="flex items-center gap-2"
              >
                <FiFilter className="h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div key={task._id} className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {isOverdue(task.deadline) && (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="mb-3 text-gray-600">{task.description}</p>
                    )}

                    <div className="flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <FiCalendar className="h-4 w-4" />
                        <span>Due: {new Date(task.deadline).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FiUser className="h-4 w-4" />
                        <span>Team: {task.teamId?.name || 'N/A'}</span>
                      </div>
                      {task.projectId && (
                        <div className="flex items-center gap-1">
                          <FiTarget className="h-4 w-4" />
                          <span>Project: {task.projectId.title}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">Progress</span>
                        <span className="text-sm text-gray-500">{task.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Comments */}
                    {task.comments && task.comments.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FiMessageSquare className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-700">Comments ({task.comments.length})</span>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {task.comments.slice(-3).map((comment: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-900">{comment.userId?.name || 'Unknown'}</span>
                                <span className="text-xs text-gray-500">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600">{comment.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ml-6 flex flex-col gap-2">
                    {/* Status Update */}
                    <FormSelect
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task._id, e.target.value)}
                      options={[
                        { value: 'todo', label: 'To Do' },
                        { value: 'in_progress', label: 'In Progress' },
                        { value: 'review', label: 'Review' },
                        { value: 'done', label: 'Done' },
                        { value: 'blocked', label: 'Blocked' }
                      ]}
                      className="w-40"
                    />

                    {/* Progress Update */}
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={task.progress}
                        onChange={(e) => handleProgressUpdate(task._id, parseInt(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-sm text-gray-600 w-12">{task.progress}%</span>
                    </div>

                    {/* Add Comment Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTask(task);
                        setShowCommentModal(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <FiMessageSquare className="h-4 w-4" />
                      Comment
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="rounded-lg bg-white p-12 text-center shadow">
                <FiTarget className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium text-gray-900">No tasks found</p>
                <p className="mt-1 text-sm text-gray-500">
                  {filters.search || filters.status || filters.priority 
                    ? 'Try adjusting your filters to see more tasks'
                    : 'You don\'t have any assigned tasks yet'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      <Modal
        isOpen={showCommentModal}
        onClose={() => {
          setShowCommentModal(false);
          setNewComment('');
        }}
        title={`Add Comment - ${selectedTask?.title || ''}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Comment
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Add your comment here..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowCommentModal(false);
                setNewComment('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddComment}>
              Add Comment
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setCreateTaskData({
            teamId: '',
            assignedTo: '',
            title: '',
            description: '',
            deadline: '',
            priority: 'medium',
            projectId: ''
          });
        }}
        title="Create New Task"
        size="lg"
      >
        <form onSubmit={handleCreateTask}>
          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              label="Team"
              required
              value={createTaskData.teamId}
              onChange={(e) => setCreateTaskData({ ...createTaskData, teamId: e.target.value })}
              options={teams.map((team: any) => ({
                value: team._id,
                label: team.name,
              }))}
            />

            <FormSelect
              label="Assign To"
              required
              value={createTaskData.assignedTo}
              onChange={(e) => setCreateTaskData({ ...createTaskData, assignedTo: e.target.value })}
              options={(() => {
                const selectedTeam = teams.find((team: any) => team._id === createTaskData.teamId);
                if (!selectedTeam) return [];
                return selectedTeam.members.map((member: any) => ({
                  value: member._id || member,
                  label: member.name || member
                }));
              })()}
            />

            <FormInput
              label="Task Title"
              required
              value={createTaskData.title}
              onChange={(e) => setCreateTaskData({ ...createTaskData, title: e.target.value })}
              placeholder="Enter task title"
            />

            <FormInput
              label="Deadline"
              type="datetime-local"
              required
              value={createTaskData.deadline}
              onChange={(e) => setCreateTaskData({ ...createTaskData, deadline: e.target.value })}
            />

            <FormSelect
              label="Priority"
              value={createTaskData.priority}
              onChange={(e) => setCreateTaskData({ ...createTaskData, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={createTaskData.description}
              onChange={(e) => setCreateTaskData({ ...createTaskData, description: e.target.value })}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="Enter task description"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateModal(false);
                setCreateTaskData({
                  teamId: '',
                  assignedTo: '',
                  title: '',
                  description: '',
                  deadline: '',
                  priority: 'medium',
                  projectId: ''
                });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
