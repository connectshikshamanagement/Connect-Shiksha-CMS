import mongoose, { Document, Model, Schema } from 'mongoose';
import { AttendanceStatus } from './Attendance';

export interface AttendanceLogDocument extends Document {
  attendanceId: Schema.Types.ObjectId;
  action: 'CREATE' | 'UPDATE_STATUS' | 'COMMENT';
  previousStatus?: AttendanceStatus;
  newStatus?: AttendanceStatus;
  actor: Schema.Types.ObjectId;
  remarks?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const attendanceLogSchema = new Schema<AttendanceLogDocument>(
  {
    attendanceId: {
      type: Schema.Types.ObjectId,
      ref: 'Attendance',
      required: true,
      index: true
    },
    action: {
      type: String,
      enum: ['CREATE', 'UPDATE_STATUS', 'COMMENT'],
      required: true
    },
    previousStatus: {
      type: String,
      enum: ['PENDING_MANAGER', 'APPROVED', 'REJECTED']
    },
    newStatus: {
      type: String,
      enum: ['PENDING_MANAGER', 'APPROVED', 'REJECTED']
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    remarks: {
      type: String,
      maxlength: 500
    },
    metadata: {
      type: Schema.Types.Mixed
    }
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false
    }
  }
);

const AttendanceLog: Model<AttendanceLogDocument> =
  mongoose.models.AttendanceLog ||
  mongoose.model<AttendanceLogDocument>('AttendanceLog', attendanceLogSchema);

export default AttendanceLog;

