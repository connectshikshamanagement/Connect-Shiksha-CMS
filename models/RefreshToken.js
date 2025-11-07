const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, index: true },
  family: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  revokedAt: { type: Date },
  replacedByTokenHash: { type: String },
  userAgent: { type: String },
  ip: { type: String }
}, {
  timestamps: true
});

refreshTokenSchema.index({ userId: 1, family: 1, revokedAt: 1 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);


