'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/contexts/SocketContext';
import { showToast } from '@/lib/toast';

interface TaskSocketEventsProps {
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (task: any) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskStatusChanged?: (data: { taskId: string; status: string }) => void;
  userId?: string;
}

export const useTaskSocketEvents = ({
  onTaskCreated,
  onTaskUpdated,
  onTaskDeleted,
  onTaskStatusChanged,
  userId,
}: TaskSocketEventsProps) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Task created event
    const handleTaskCreated = (task: any) => {
      console.log('Task created:', task);
      if (onTaskCreated) {
        onTaskCreated(task);
      }
      
      // Show notification if task is assigned to current user
      if (userId && task.assignedTo?.some((user: any) => user._id === userId)) {
        showToast.success(`New task assigned: ${task.title}`);
      }
    };

    // Task updated event
    const handleTaskUpdated = (task: any) => {
      console.log('Task updated:', task);
      if (onTaskUpdated) {
        onTaskUpdated(task);
      }
    };

    // Task deleted event
    const handleTaskDeleted = (taskId: string) => {
      console.log('Task deleted:', taskId);
      if (onTaskDeleted) {
        onTaskDeleted(taskId);
      }
    };

    // Task status changed event
    const handleTaskStatusChanged = (data: { taskId: string; status: string }) => {
      console.log('Task status changed:', data);
      if (onTaskStatusChanged) {
        onTaskStatusChanged(data);
      }
    };

    // Register event listeners
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:statusChanged', handleTaskStatusChanged);

    // Cleanup
    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:statusChanged', handleTaskStatusChanged);
    };
  }, [socket, isConnected, onTaskCreated, onTaskUpdated, onTaskDeleted, onTaskStatusChanged, userId]);

  // Emit task events
  const emitTaskEvent = useCallback((event: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  }, [socket, isConnected]);

  return {
    emitTaskEvent,
    isConnected,
  };
};
