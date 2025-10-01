const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true
  },
  s3Key: {
    type: String
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['receipt', 'invoice', 'proposal', 'contract', 'report', 'image', 'document', 'other'],
    default: 'other'
  },
  description: {
    type: String
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Project', 'Task', 'Client', 'Income', 'Expense', 'Invoice', null]
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Attachment', attachmentSchema);

