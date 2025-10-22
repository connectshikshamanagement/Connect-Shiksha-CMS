'use client';

import { useState } from 'react';
import { FiEdit, FiTrash2, FiClock, FiUser, FiMessageSquare, FiCheck, FiPlay, FiEye, FiMoreVertical } from 'react-icons/fi';
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
  notes: Array<{ userId: { name: string }; text: string; createdAt: string }>;
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
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [progressData, setProgressData] = useState({ progress: 0, note: '', status: '' });

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'border-gray-300 bg-gray-50',
      medium: 'border-yellow-300 bg-yellow-50',
      high: 'border-orange-300 bg-orange-50',
      urgent: 'border-red-300 bg-red-50',
    };
    return colors[priority as keyof typeof colors] || 'border-gray-300 bg-gray-50';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      review: 'bg-yellow-100 text-yellow-800',
      done: 'bg-green-100 text-green-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} days`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      return `Due in ${diffDays} days`;
    }
  };

  const getDeadlineColor = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'bg-red-100 text-red-800';
    } else if (diffDays <= 1) {
      return 'bg-orange-100 text-orange-800';
    } else if (diffDays <= 3) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
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

    try {
      await onUpdateProgress(
        selectedTask._id,
        progressData.progress,
        progressData.note,
        progressData.status
      );
      setShowProgressModal(false);
      setSelectedTask(null);
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

  const TaskCard = ({ task }: { task: Task }) => (
    <div className={`p-4 mb-3 rounded-2xl shadow bg-white w-full hover:shadow-lg transition-all duration-200 border-l-4 ${getPriorityColor(task.priority)}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg truncate flex-1 mr-2">{task.title}</h3>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDeadlineColor(task.deadline)}`}>
            {formatDeadline(task.deadline)}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-bold text-blue-600">{task.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300" 
            style={{ width: `${task.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Task Details */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-3">
        <span className="flex items-center">
          <span className={`mr-1 h-2 w-2 rounded-full ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}></span>
          {task.priority}
        </span>
        
        <span className="flex items-center">
          <FiUser className="mr-1" />
          {task.assignedTo.length} assigned
        </span>
        
        <span className="flex items-center">
          <FiClock className="mr-1" />
          {new Date(task.deadline).toLocaleDateString()}
        </span>
        
        {task.notes.length > 0 && (
          <span className="flex items-center">
            <FiMessageSquare className="mr-1" />
            {task.notes.length} notes
          </span>
        )}
      </div>

      {/* Team and Project Info */}
      <div className="mb-3 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <span className="font-medium">Team:</span>
          <span>{task.teamId.name} ({task.teamId.category})</span>
        </div>
        {task.projectId && (
          <div className="flex items-center gap-2 mt-1">
            <span className="font-medium">Project:</span>
            <span>{task.projectId.title}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => openProgressModal(task)}
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            <FiPlay className="mr-1" />
            Update
          </Button>
          
          {task.status !== 'done' && (
            <Button
              size="sm"
              variant="success"
              onClick={() => markTaskDone(task)}
              className="text-green-600 border-green-200 hover:bg-green-50"
            >
              <FiCheck className="mr-1" />
              Mark Done
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

      {/* Progress Update Modal */}
      <Modal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title="Update Task Progress"
        size="md"
      >
        {selectedTask && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">{selectedTask.title}</h3>
              <p className="text-sm text-gray-600">{selectedTask.description}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Progress: {progressData.progress}%
              </label>
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
                Status
              </label>
              <select
                value={progressData.status}
                onChange={(e) => setProgressData({ ...progressData, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
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
                onClick={() => setShowProgressModal(false)}
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
