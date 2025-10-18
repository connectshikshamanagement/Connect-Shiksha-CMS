const express = require('express');
const Task = require('../models/Task');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');
const { isFounder } = require('../utils/roleAccess');

const router = express.Router();

router.use(protect);

// Get tasks by team
router.get('/team/:teamId', async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status, priority, assignedTo } = req.query;

    // Check if user can access team tasks
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const founder = isFounder(req.user);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);
    const isTeamMember = team.members.includes(req.user.id);

    if (!founder && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not a member of this team.'
      });
    }

    let query = { teamId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
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

// Get tasks by user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { status, priority } = req.query;

    // Check if user can access these tasks
    const founder = isFounder(req.user);
    const isOwnTasks = String(req.user.id) === String(userId);
    
    // Check if user is a team lead for this user
    const userTeams = await Team.find({ members: userId });
    const isTeamLeadForUser = userTeams.some(team => 
      String(team.leadUserId) === String(req.user.id)
    );

    if (!founder && !isOwnTasks && !isTeamLeadForUser) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    let query = { assignedTo: userId };
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
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

// Create task (assign to team member)
router.post('/', async (req, res) => {
  try {
    const { teamId, assignedTo, title, description, deadline, priority, projectId } = req.body;

    // Validate required fields
    if (!teamId) {
      return res.status(400).json({
        success: false,
        message: 'Please assign a team'
      });
    }

    if (!assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'Please assign task to a member'
      });
    }

    if (!title || title.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a task title'
      });
    }

    if (!deadline) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a deadline'
      });
    }

    // Check if user can create tasks for this team
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team not found'
      });
    }

    const founder = isFounder(req.user);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);
    const isTeamMember = team.members.includes(req.user.id);

    if (!founder && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to create tasks for this team.'
      });
    }

    // Check if assigned user is a team member
    if (!team.members.includes(assignedTo)) {
      return res.status(400).json({
        success: false,
        message: 'Assigned user is not a member of this team'
      });
    }

    const task = await Task.create({
      teamId,
      assignedTo,
      assignedBy: req.user.id,
      title,
      description: description || '',
      deadline,
      priority: priority || 'medium',
      projectId: projectId || undefined,
      createdBy: req.user.id
    });

    // Update user's task history (optional - don't fail if this doesn't work)
    try {
      await User.findByIdAndUpdate(assignedTo, {
        $push: {
          taskHistory: {
            taskId: task._id,
            title: task.title,
            status: task.status,
            assignedOn: task.createdAt,
            teamId: task.teamId
          }
        }
      });
    } catch (historyError) {
      console.log('Warning: Could not update user task history:', historyError.message);
      // Don't fail the task creation if history update fails
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title');

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

// Update task status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const founder = isFounder(req.user);
    const isAssignedTo = String(task.assignedTo) === String(req.user.id);
    const isAssignedBy = String(task.assignedBy) === String(req.user.id);
    
    const team = await Team.findById(task.teamId);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);

    if (!founder && !isAssignedTo && !isAssignedBy && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update tasks assigned to you or tasks you assigned.'
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { 
        status,
        ...(status === 'done' && { completedOn: new Date() })
      },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email')
     .populate('assignedBy', 'name email')
     .populate('teamId', 'name category')
     .populate('projectId', 'title');

    // Update user's task history if status changed to done
    if (status === 'done') {
      await User.findByIdAndUpdate(task.assignedTo, {
        $set: {
          'taskHistory.$[elem].status': 'done',
          'taskHistory.$[elem].completedOn': new Date()
        }
      }, {
        arrayFilters: [{ 'elem.taskId': task._id }]
      });
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

// Update task progress
router.patch('/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const founder = isFounder(req.user);
    const isAssignedTo = String(task.assignedTo) === String(req.user.id);
    const isAssignedBy = String(task.assignedBy) === String(req.user.id);
    
    const team = await Team.findById(task.teamId);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);

    if (!founder && !isAssignedTo && !isAssignedBy && !isTeamLead) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { progress },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email')
     .populate('assignedBy', 'name email')
     .populate('teamId', 'name category')
     .populate('projectId', 'title');

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
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const founder = isFounder(req.user);
    const isAssignedTo = String(task.assignedTo) === String(req.user.id);
    const isAssignedBy = String(task.assignedBy) === String(req.user.id);
    
    const team = await Team.findById(task.teamId);
    const isTeamLead = String(team.leadUserId) === String(req.user.id);
    const isTeamMember = team.members.includes(req.user.id);

    if (!founder && !isAssignedTo && !isAssignedBy && !isTeamLead && !isTeamMember) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    task.comments.push({
      userId: req.user.id,
      text
    });

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .populate('teamId', 'name category')
      .populate('projectId', 'title')
      .populate('comments.userId', 'name email');

    res.status(200).json({
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

// Get task analytics
router.get('/analytics/:teamId', authorize('finance.read'), async (req, res) => {
  try {
    const { teamId } = req.params;
    const { month, year } = req.query;

    const currentDate = new Date();
    const targetMonth = month || (currentDate.getMonth() + 1);
    const targetYear = year || currentDate.getFullYear();

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    const analytics = await Task.aggregate([
      {
        $match: {
          teamId: mongoose.Types.ObjectId(teamId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          overdueTasks: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$deadline', new Date()] },
                    { $ne: ['$status', 'done'] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgProgress: { $avg: '$progress' }
        }
      }
    ]);

    const memberAnalytics = await Task.aggregate([
      {
        $match: {
          teamId: mongoose.Types.ObjectId(teamId),
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        $project: {
          memberName: '$user.name',
          memberEmail: '$user.email',
          totalTasks: 1,
          completedTasks: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedTasks', '$totalTasks'] },
              100
            ]
          },
          avgProgress: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period: `${targetMonth}/${targetYear}`,
        teamAnalytics: analytics[0] || {
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          overdueTasks: 0,
          avgProgress: 0
        },
        memberAnalytics
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
