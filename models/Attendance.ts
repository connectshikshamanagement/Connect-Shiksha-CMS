import mongoose, { Document, Model, Schema } from 'mongoose';

export type AttendanceStatus = 'PENDING_MANAGER' | 'APPROVED' | 'REJECTED';

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export interface AttendanceDocument extends Document {
  userId: Schema.Types.ObjectId;
  projectId: Schema.Types.ObjectId;
  date: Date;
  checkInTime: Date;
  checkOutTime?: Date;
  location?: LocationPoint;
  qrCodeRef?: string;
  status: AttendanceStatus;
  verifiedBy?: Schema.Types.ObjectId;
  remarks?: string;
  managerRemarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

const locationSchema = new Schema<LocationPoint>(
  {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    },
    accuracyMeters: {
      type: Number,
      min: 0
    }
  },
  { _id: false }
);

const attendanceSchema = new Schema<AttendanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    checkInTime: {
      type: Date,
      required: true
    },
    checkOutTime: {
      type: Date
    },
    location: {
      type: locationSchema,
      required: false
    },
    qrCodeRef: {
      type: String
    },
    status: {
      type: String,
      enum: ['PENDING_MANAGER', 'APPROVED', 'REJECTED'],
      default: 'PENDING_MANAGER',
      index: true
    },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    remarks: {
      type: String,
      maxlength: 500
    },
    managerRemarks: {
      type: String,
      maxlength: 500
    },
  },
  {
    timestamps: true
  }
);

attendanceSchema.index(
  {
    userId: 1,
    projectId: 1,
    date: 1
  },
  {
    unique: true,
    name: 'unique_attendance_per_day'
  }
);

attendanceSchema.pre('save', function preSave(next) {
  if (this.isModified('date') && this.date) {
    const normalized = new Date(this.date);
    normalized.setHours(0, 0, 0, 0);
    this.date = normalized;
  }

  if (this.isModified('checkInTime') && this.checkInTime) {
    this.checkInTime = new Date(this.checkInTime);
  }

  if (this.isModified('checkOutTime') && this.checkOutTime) {
    this.checkOutTime = new Date(this.checkOutTime);
  }

  next();
});

const Attendance: Model<AttendanceDocument> =
  mongoose.models.Attendance ||
  mongoose.model<AttendanceDocument>('Attendance', attendanceSchema);

export default Attendance;

