'use client';

import { useEffect, useState } from 'react';
import { taskAPI, projectAPI, userAPI } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import FormInput from '@/components/FormInput';
import FormSelect from '@/components/FormSelect';
import { showToast } from '@/lib/toast';
import { FiPlus, FiEdit, FiTrash2, FiClock, FiUser, FiMessageSquare } from 'react-icons/fi';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableTask({ task, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      low: 'border-gray-300 bg-gray-50',
      medium: 'border-yellow-300 bg-yellow-50',
      high: 'border-orange-300 bg-orange-50',
      urgent: 'border-red-300 bg-red-50',
    };
    return colors[priority] || 'border-gray-300 bg-gray-50';
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-move rounded-lg border-l-4 bg-white p-4 shadow-sm transition hover:shadow-md ${getPriorityColor(task.priority)}`}
    >
      <div className="flex items-start justify-between">
        <h4 className="flex-1 font-medium text-gray-900">{task.title}</h4>
        <div className="flex gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="rounded p-1 hover:bg-gray-100"
          >
            <FiEdit className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task._id); }}
            className="rounded p-1 hover:bg-red-100"
          >
            <FiTrash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>

      {task.description && (
        <p className="mt-2 text-sm text-gray-600 line-clamp-2">{task.description}</p>
      )}
      
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="capitalize flex items-center">
          <span className={`mr-1 h-2 w-2 rounded-full ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-gray-500'
          }`}></span>
          {task.priority}
        </span>
        {task.assigneeIds?.length > 0 && (
          <span className="flex items-center">
            <FiUser className="mr-1" />
            {task.assigneeIds.length} assigned
          </span>
        )}
        {task.dueDate && (
          <span className="flex items-center">
            <FiClock className="mr-1" />
            {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}
        {task.comments?.length > 0 && (
          <span className="flex items-center">
            <FiMessageSquare className="mr-1" />
            {task.comments.length}
          </span>
        )}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any>({
    todo: [],
    in_progress: [],
    review: [],
    done: []
  });
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [formData, setFormData] = useState({
    projectId: '',
    title: '',
    description: '',
    status: 'todo',
    assigneeIds: [] as string[],
    priority: 'medium',
    dueDate: '',
    estimatedHours: 0,
    tags: '',
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        taskAPI.getAll(),
        projectAPI.getAll(),
        userAPI.getAll()
      ]);
      
      if (tasksRes.data.success) {
        const allTasks = tasksRes.data.data;
        const grouped = {
          todo: allTasks.filter((t: any) => t.status === 'todo'),
          in_progress: allTasks.filter((t: any) => t.status === 'in_progress'),
          review: allTasks.filter((t: any) => t.status === 'review'),
          done: allTasks.filter((t: any) => t.status === 'done'),
        };
        setTasks(grouped);
      }
      if (projectsRes.data.success) setProjects(projectsRes.data.data);
      if (usersRes.data.success) setUsers(usersRes.data.data);
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    // Find the task being dragged
    let task: any = null;
    let oldStatus = '';

    for (const [status, taskList] of Object.entries(tasks)) {
      const found = (taskList as any[]).find((t: any) => t._id === taskId);
      if (found) {
        task = found;
        oldStatus = status;
        break;
      }
    }

    if (!task || oldStatus === newStatus) return;

    // Optimistically update UI
    const updatedTasks = { ...tasks };
    updatedTasks[oldStatus as keyof typeof tasks] = updatedTasks[oldStatus as keyof typeof tasks].filter((t: any) => t._id !== taskId);
    updatedTasks[newStatus as keyof typeof tasks] = [...updatedTasks[newStatus as keyof typeof tasks], { ...task, status: newStatus }];
    setTasks(updatedTasks);

    // Update on backend
    const loadingToast = showToast.loading('Updating task status...');

    try {
      await taskAPI.updateStatus(taskId, newStatus);
      showToast.dismiss(loadingToast);
      showToast.success(`Task moved to ${newStatus.replace('_', ' ')}!`);
    } catch (error: any) {
      showToast.dismiss(loadingToast);
      showToast.error(error.response?.data?.message || 'Failed to update task');
      // Revert on error
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.title) {
      showToast.error('Please fill in all required fields');
      return;
    }

    const loadingToast = showToast.loading(editingTask ? 'Updating task...' : 'Creating task...');

    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()) : [],
      };

      if (editingTask) {
        await taskAPI.update(editingTask._id, submitData);
        showToast.success('Task updated successfully!');
      } else {
        await taskAPI.create(submitData);
        showToast.success('Task created successfully!');
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

  const handleEdit = (task: any) => {
    setEditingTask(task);
    setFormData({
      projectId: task.projectId?._id || task.projectId,
      title: task.title,
      description: task.description || '',
      status: task.status,
      assigneeIds: task.assigneeIds?.map((a: any) => a._id || a) || [],
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours || 0,
      tags: task.tags?.join(', ') || '',
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

  const resetForm = () => {
    setFormData({
      projectId: '',
      title: '',
      description: '',
      status: 'todo',
      assigneeIds: [],
      priority: 'medium',
      dueDate: '',
      estimatedHours: 0,
      tags: '',
    });
    setEditingTask(null);
  };

  const Column = ({ title, status, tasks: columnTasks, icon }: any) => (
    <div className="flex-1 rounded-lg bg-gray-100 p-4 min-w-[280px]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold text-gray-700">
          <span>{icon}</span>
          {title}
        </h3>
        <span className="rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium">
          {columnTasks.length}
        </span>
      </div>

      <SortableContext items={columnTasks.map((t: any) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[200px]">
          {columnTasks.map((task: any) => (
            <SortableTask
              key={task._id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {columnTasks.length === 0 && (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );

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
      
      <div className="flex-1 overflow-auto">
        <Header title="Tasks" />

        <div className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Task Management (Kanban)</h2>
              <p className="mt-1 text-sm text-gray-600">Drag tasks between columns to update their status</p>
            </div>
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <FiPlus className="mr-2" />
              Add Task
            </Button>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4">
              <div id="todo" className="flex-1 min-w-[280px]">
                <Column
                  title="To Do"
                  status="todo"
                  tasks={tasks.todo}
                  icon="📋"
                />
              </div>

              <div id="in_progress" className="flex-1 min-w-[280px]">
                <Column
                  title="In Progress"
                  status="in_progress"
                  tasks={tasks.in_progress}
                  icon="🔄"
                />
              </div>

              <div id="review" className="flex-1 min-w-[280px]">
                <Column
                  title="Review"
                  status="review"
                  tasks={tasks.review}
                  icon="👀"
                />
              </div>

              <div id="done" className="flex-1 min-w-[280px]">
                <Column
                  title="Done"
                  status="done"
                  tasks={tasks.done}
                  icon="✅"
                />
              </div>
            </div>
          </DndContext>
        </div>
      </div>

      {/* Create/Edit Task Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <FormInput
                label="Task Title"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Design workshop materials"
              />
            </div>

            <FormSelect
              label="Project"
              required
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              options={projects.map((project: any) => ({
                value: project._id,
                label: project.title,
              }))}
            />

            <FormSelect
              label="Status"
              required
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              options={[
                { value: 'todo', label: 'To Do' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'review', label: 'Review' },
                { value: 'done', label: 'Done' },
                { value: 'blocked', label: 'Blocked' },
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

            <FormInput
              label="Due Date"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />

            <FormInput
              label="Estimated Hours"
              type="number"
              min="0"
              value={formData.estimatedHours}
              onChange={(e) => setFormData({ ...formData, estimatedHours: Number(e.target.value) })}
              placeholder="0"
            />

            <FormInput
              label="Tags (comma-separated)"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="design, urgent, review"
            />

            <div className="col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Assignees
              </label>
              <select
                multiple
                value={formData.assigneeIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFormData({ ...formData, assigneeIds: selected });
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                size={4}
              >
                {users.map((user: any) => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.email}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Hold Ctrl/Cmd to select multiple assignees</p>
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
                placeholder="Detailed description of the task..."
              />
            </div>

            <div className="col-span-2 rounded bg-blue-50 p-3 text-sm text-blue-800">
              <strong>💡 Tip:</strong> You can drag tasks between columns on the Kanban board to change their status!
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
              {editingTask ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
