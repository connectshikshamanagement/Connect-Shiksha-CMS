const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const checklistItemSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  }
});

const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Please assign a team']
  },
  title: {
    type: String,
    required: [true, 'Please provide a task title'],
    trim: true
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['todo', 'in_progress', 'review', 'done', 'blocked'],
    default: 'todo'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Please assign task to a member']
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assigneeIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  deadline: {
    type: Date,
    required: [true, 'Please provide a deadline']
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  comments: [commentSchema],
  checklist: [checklistItemSchema],
  tags: [{
    type: String,
    trim: true
  }],
  attachments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attachment'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Task', taskSchema);

