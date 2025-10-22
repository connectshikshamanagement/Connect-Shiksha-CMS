const express = require('express');
const Task = require('../models/Task');
const Team = require('../models/Team');
const Project = require('../models/Project');
const { protect, authorize } = require('../middleware/auth');
const { restrictToRole, restrictToRoles } = require('../middleware/roleAccess');

const router = express.Router();

// Get all tasks with role-based filtering
router.get('/', protect, async (req, res) => {
  try {
    const userRole = req.user.roleIds[0]?.key;
    let query = {};

    // Role-based filtering
    if (userRole === 'TEAM_MEMBER') {
      // Team members can only see tasks assigned to them
      query.assignedTo = req.user.id;
    } else if (userRole === 'TEAM_MANAGER') {
      // Team managers can see tasks for their teams
      const userTeams = await Team.find({ members: req.user.id }).select('_id');
      const teamIds = userTeams.map(team => team._id);
      query.teamId = { $in: teamIds };
    }
    // Founders can see all tasks (no additional filtering)

    const tasks = await Task.find(query)
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.userId', 'name email')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create task with validation
router.post('/', protect, authorize('tasks.create'), async (req, res) => {
  try {
    // Validate required fields
    const { title, teamId, assignedTo, deadline } = req.body;
    
    if (!title || !teamId || !assignedTo || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, teamId, assignedTo, deadline'
      });
    }

    // Ensure assignedTo is an array
    const assignedToArray = Array.isArray(assignedTo) ? assignedTo : [assignedTo];
    
    if (assignedToArray.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one team member must be assigned'
      });
    }

    // Validate team exists and user has access
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    // Check if user has permission to assign tasks to this team
    const userRole = req.user.roleIds[0]?.key;
    if (userRole === 'TEAM_MANAGER' && !team.members.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign tasks to your own team'
      });
    }

    const task = await Task.create({
      ...req.body,
      assignedTo: assignedToArray,
      assignedBy: req.user.id,
      createdBy: req.user.id
    });

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('task:created', populatedTask);
    }

    res.status(201).json({
      success: true,
      data: populatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get single task
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('projectId')
      .populate('assigneeIds')
      .populate('createdBy')
      .populate('comments.userId');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update task
router.put('/:id', protect, authorize('tasks.update'), async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const io = req.app.get('io');
    io.emit('task:updated', task);

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update task progress and notes
router.patch('/:id/progress', protect, async (req, res) => {
  try {
    const { progress, note, status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if user can update this task
    const userRole = req.user.roleIds[0]?.key;
    const isAssignedToUser = task.assignedTo.includes(req.user.id);
    
    if (userRole === 'TEAM_MEMBER' && !isAssignedToUser) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you'
      });
    }

    // Update progress
    if (progress !== undefined) {
      task.progress = Math.max(0, Math.min(100, progress));
    }

    // Update status if provided
    if (status) {
      task.status = status;
    }

    // Add note if provided
    if (note) {
      task.notes.push({
        userId: req.user.id,
        text: note,
        createdAt: new Date()
      });
    }

    await task.save();

    // Populate the updated task
    const updatedTask = await Task.findById(task._id)
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('notes.userId', 'name email');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('task:updated', updatedTask);
    }

    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update task status (for Kanban-like functionality)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const userRole = req.user.roleIds[0]?.key;
    const isAssignedToUser = task.assignedTo.includes(req.user.id);
    
    if (userRole === 'TEAM_MEMBER' && !isAssignedToUser) {
      return res.status(403).json({
        success: false,
        message: 'You can only update tasks assigned to you'
      });
    }

    task.status = status;
    await task.save();

    // Populate the updated task
    const updatedTask = await Task.findById(task._id)
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('createdBy', 'name email');

    const io = req.app.get('io');
    if (io) {
      io.emit('task:statusChanged', { taskId: task._id, status });
    }

    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Add comment to task
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.comments.push({
      userId: req.user.id,
      text: req.body.text
    });

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete task
router.delete('/:id', protect, authorize('tasks.delete'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const io = req.app.get('io');
    io.emit('task:deleted', task._id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

