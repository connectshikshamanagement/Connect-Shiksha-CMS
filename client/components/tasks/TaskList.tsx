'use client';

import { useState } from 'react';
import { FiEdit, FiTrash2, FiClock, FiUser, FiMessageSquare, FiCheck, FiPlay, FiEye, FiCalendar, FiTag, FiUsers } from 'react-icons/fi';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import { showToast } from '@/lib/toast';

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
  notes: Array<{ userId: { _id?: string; name: string; email?: string }; text: string; createdAt: string }>;
  createdAt: string;
}

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onUpdateProgress: (taskId: string, progress: number, note?: string, status?: string) => Promise<void>;
  userRole: string;
  isAssignedToUser: (task: Task) => boolean;
}

export default function TaskList({ tasks, onEdit, onDelete, onUpdateProgress, userRole, isAssignedToUser }: TaskListProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState({ progress: 0, note: '', status: '' });
  const canMarkDone = userRole === 'FOUNDER' || userRole === 'TEAM_MANAGER';

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: { border: 'border-l-gray-400', bg: 'bg-gray-50', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
      medium: { border: 'border-l-yellow-400', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
      high: { border: 'border-l-orange-400', bg: 'bg-orange-50', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
      urgent: { border: 'border-l-red-400', bg: 'bg-red-50', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800 border-gray-200',
      in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
      review: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      done: 'bg-green-100 text-green-800 border-green-200',
    };
    return colors[status as keyof typeof colors] || colors.todo;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      review: 'Review',
      done: 'Done',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(date);
    deadlineDate.setHours(0, 0, 0, 0);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} days`, days: diffDays, urgent: true };
    } else if (diffDays === 0) {
      return { text: 'Due today', days: 0, urgent: true };
    } else if (diffDays === 1) {
      return { text: 'Due tomorrow', days: 1, urgent: true };
    } else if (diffDays <= 3) {
      return { text: `Due in ${diffDays} days`, days: diffDays, urgent: false };
    } else {
      return { text: `Due in ${diffDays} days`, days: diffDays, urgent: false };
    }
  };

  const getDeadlineColor = (deadline: string) => {
    const deadlineInfo = formatDeadline(deadline);
    if (deadlineInfo.days < 0) {
      return 'bg-red-50 text-red-700 border-red-200';
    } else if (deadlineInfo.days <= 1) {
      return 'bg-orange-50 text-orange-700 border-orange-200';
    } else if (deadlineInfo.days <= 3) {
      return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    } else {
      return 'bg-green-50 text-green-700 border-green-200';
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return `Yesterday ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const openDetailsModal = (task: Task) => {
    setSelectedTask(task);
    setShowDetailsModal(true);
  };

  const openProgressModal = (task: Task) => {
    setSelectedTask(task);
    setProgressData({
      progress: task.progress,
      note: '',
      status: task.status
    });
    setShowProgressModal(true);
  };

  const handleProgressUpdate = async () => {
    if (!selectedTask) return;

    if (!progressData.status || progressData.status.trim() === '') {
      showToast.error('Status is required');
      return;
    }

    if (progressData.progress === undefined || progressData.progress === null) {
      showToast.error('Progress is required');
      return;
    }

    try {
      await onUpdateProgress(
        selectedTask._id,
        progressData.progress,
        progressData.note,
        progressData.status
      );
      setShowProgressModal(false);
      setSelectedTask(null);
      setProgressData({ progress: 0, note: '', status: '' });
      showToast.success('Task updated successfully!');
    } catch (error) {
      showToast.error('Failed to update task');
    }
  };

  const markTaskDone = async (task: Task) => {
    try {
      await onUpdateProgress(task._id, 100, 'Task marked as completed', 'done');
      showToast.success('Task marked as done!');
    } catch (error) {
      showToast.error('Failed to mark task as done');
    }
  };

  const TaskCard = ({ task }: { task: Task }) => {
    const priorityColors = getPriorityColor(task.priority);
    const deadlineInfo = formatDeadline(task.deadline);
    const deadlineColor = getDeadlineColor(task.deadline);
    const isDone = task.status === 'done';
    const doneLockedForMember = isDone && userRole === 'TEAM_MEMBER';

    return (
      <div className={`p-5 mb-4 rounded-xl shadow-md w-full transition-all duration-300 border-l-4 ${
        isDone ? 'bg-gray-50 border-l-gray-300 opacity-90' : `bg-white ${priorityColors.border}`
      }`}>
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 mb-1 truncate">{task.title}</h3>
            {task.description && (
              <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50 p-2 rounded-md border border-gray-100">
                {task.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${deadlineColor}`}>
              {deadlineInfo.text}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(task.status)}`}>
              {getStatusLabel(task.status)}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-semibold text-gray-700">Progress</span>
            <span className="text-sm font-bold text-blue-600">{task.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                isDone
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                  : task.progress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    task.progress >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    task.progress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
              }`}
              style={{ width: `${task.progress}%` }}
            ></div>
          </div>
        </div>

        {/* Assigned Members */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="text-gray-500 text-sm" />
            <span className="text-xs font-semibold text-gray-600">Assigned to:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.assignedTo.slice(0, 3).map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-full border border-blue-200"
              >
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(user.name)}
                </div>
                <span className="text-xs font-medium text-gray-700">{user.name}</span>
              </div>
            ))}
            {task.assignedTo.length > 3 && (
              <div className="flex items-center px-2.5 py-1 bg-gray-100 rounded-full border border-gray-200">
                <span className="text-xs font-medium text-gray-600">+{task.assignedTo.length - 3} more</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="flex flex-wrap items-center gap-3 text-xs mb-4 pb-4 border-b border-gray-100">
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${priorityColors.badge}`}>
            <span className={`w-2 h-2 rounded-full ${priorityColors.dot}`}></span>
            <span className="font-medium">{task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
          </span>
          
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
            <FiCalendar className="text-gray-500" />
            <span>{new Date(task.deadline).toLocaleDateString()}</span>
          </span>
          
          {task.notes.length > 0 && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
              <FiMessageSquare />
              <span>{task.notes.length} note{task.notes.length !== 1 ? 's' : ''}</span>
            </span>
          )}
        </div>

        {/* Team and Project */}
        <div className="mb-4 text-xs text-gray-600">
          <div className="flex items-center gap-2 mb-1">
            <FiTag className="text-gray-400" />
            <span className="font-semibold">Team:</span>
            <span>{task.teamId.name}</span>
            <span className="text-gray-400">•</span>
            <span className="text-gray-500">{task.teamId.category}</span>
          </div>
          {task.projectId && (
            <div className="flex items-center gap-2">
              <FiTag className="text-gray-400" />
              <span className="font-semibold">Project:</span>
              <span className="text-blue-600 font-medium">{task.projectId.title}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => openDetailsModal(task)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <FiEye className="mr-1.5" />
              See Details
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => openProgressModal(task)}
              disabled={doneLockedForMember}
              className={`border-purple-200 ${doneLockedForMember ? 'text-gray-400 cursor-not-allowed bg-gray-50' : 'text-purple-600 hover:bg-purple-50'}`}
            >
              <FiPlay className="mr-1.5" />
              Update
            </Button>
            {canMarkDone && task.status !== 'done' && (
              <Button
                size="sm"
                variant="success"
                onClick={() => markTaskDone(task)}
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <FiCheck className="mr-1.5" />
                Done
              </Button>
            )}
          </div>

          {/* Admin Actions */}
          {(userRole === 'FOUNDER' || userRole === 'TEAM_MANAGER') && (
            <div className="flex gap-1">
              <button
                onClick={() => onEdit(task)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
                title="Edit Task"
              >
                <FiEdit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(task._id)}
                className="p-2 rounded-lg hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors"
                title="Delete Task"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
            <p className="text-gray-500">Create your first task to get started!</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task._id} task={task} />
          ))
        )}
      </div>

      {/* Task Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTask(null);
        }}
        title="Task Details"
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-2xl font-bold text-gray-900">{selectedTask.title}</h2>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getStatusColor(selectedTask.status)}`}>
                    {getStatusLabel(selectedTask.status)}
                  </span>
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${getDeadlineColor(selectedTask.deadline)}`}>
                    {formatDeadline(selectedTask.deadline).text}
                  </span>
                </div>
              </div>
              
              {selectedTask.description && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                  <p className="text-gray-800 leading-relaxed">{selectedTask.description}</p>
                </div>
              )}
            </div>

            {/* Progress Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Progress</span>
                <span className="text-lg font-bold text-blue-600">{selectedTask.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    selectedTask.progress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                    selectedTask.progress >= 70 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                    selectedTask.progress >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{ width: `${selectedTask.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Assigned Members */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FiUsers className="text-gray-500" />
                Assigned Members ({selectedTask.assignedTo.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {selectedTask.assignedTo.map((user) => (
                  <div
                    key={user._id}
                    className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiTag className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Team</span>
                </div>
                <p className="text-gray-900 font-medium">{selectedTask.teamId.name}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedTask.teamId.category}</p>
              </div>

              {selectedTask.projectId && (
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <FiTag className="text-gray-400" />
                    <span className="text-sm font-semibold text-gray-700">Project</span>
                  </div>
                  <p className="text-gray-900 font-medium">{selectedTask.projectId.title}</p>
                </div>
              )}

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${getPriorityColor(selectedTask.priority).dot}`}></span>
                  <span className="text-sm font-semibold text-gray-700">Priority</span>
                </div>
                <p className="text-gray-900 font-medium capitalize">{selectedTask.priority}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiCalendar className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Deadline</span>
                </div>
                <p className="text-gray-900 font-medium">{new Date(selectedTask.deadline).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</p>
                <p className="text-xs text-gray-500 mt-1">{formatDeadline(selectedTask.deadline).text}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiUser className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Assigned By</span>
                </div>
                <p className="text-gray-900 font-medium">{selectedTask.assignedBy.name}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedTask.assignedBy.email}</p>
              </div>

              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <FiClock className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Created</span>
                </div>
                <p className="text-gray-900 font-medium">{new Date(selectedTask.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Notes/Chat Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FiMessageSquare className="text-gray-500" />
                Notes & Updates ({selectedTask.notes.length})
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto space-y-4">
                {selectedTask.notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FiMessageSquare className="mx-auto mb-2 h-8 w-8" />
                    <p className="text-sm">No notes yet</p>
                  </div>
                ) : (
                  selectedTask.notes.map((note, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                          {getInitials(note.userId.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 text-sm">{note.userId.name}</p>
                            <span className="text-xs text-gray-500">{formatDate(note.createdAt)}</span>
                          </div>
                          <p className="text-gray-700 text-sm whitespace-pre-wrap">{note.text}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDetailsModal(false);
                  setSelectedTask(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setShowDetailsModal(false);
                  openProgressModal(selectedTask);
                }}
              >
                <FiPlay className="mr-2" />
                Update Progress
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Progress Update Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => {
          setShowProgressModal(false);
          setSelectedTask(null);
          setProgressData({ progress: 0, note: '', status: '' });
        }}
        title="Update Task Progress"
        size="md"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{selectedTask.title}</h3>
              {selectedTask.description && (
                <p className="text-sm text-gray-600">{selectedTask.description}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress <span className="text-red-500">*</span>
              </label>
              <div className="mb-2">
                <span className="text-lg font-bold text-blue-600">{progressData.progress}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={progressData.progress}
                onChange={(e) => setProgressData({ ...progressData, progress: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={progressData.status}
                onChange={(e) => setProgressData({ ...progressData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Select Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                {canMarkDone && <option value="done">Done</option>}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Note (Optional)
              </label>
              <textarea
                value={progressData.note}
                onChange={(e) => setProgressData({ ...progressData, note: e.target.value })}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="Add a note about your progress..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowProgressModal(false);
                  setSelectedTask(null);
                  setProgressData({ progress: 0, note: '', status: '' });
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleProgressUpdate}>
                Update Progress
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
