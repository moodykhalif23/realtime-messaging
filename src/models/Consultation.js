const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    required: true
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  type: {
    type: String,
    enum: ['video', 'audio', 'chat'],
    required: true
  },
  status: {
    type: String,
    enum: ['waiting', 'active', 'ended', 'cancelled'],
    default: 'waiting'
  },
  startTime: Date,
  endTime: Date,
  duration: Number, // in minutes
  participants: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['patient', 'provider', 'observer']
    },
    joinedAt: Date,
    leftAt: Date,
    connectionQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    }
  }],
  recording: {
    isRecorded: {
      type: Boolean,
      default: false
    },
    recordingUrl: String,
    recordingSize: Number, // in MB
    consentGiven: {
      patient: Boolean,
      provider: Boolean
    },
    recordingStartTime: Date,
    recordingEndTime: Date
  },
  chatMessages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    timestamp: Date,
    messageType: {
      type: String,
      enum: ['text', 'file', 'image', 'system'],
      default: 'text'
    },
    attachments: [{
      fileName: String,
      fileUrl: String,
      fileType: String,
      fileSize: Number
    }]
  }],
  screenSharing: [{
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    startTime: Date,
    endTime: Date,
    purpose: String // e.g., "reviewing X-ray", "showing test results"
  }],
  technicalIssues: [{
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    issueType: {
      type: String,
      enum: ['audio', 'video', 'connection', 'screen_sharing', 'other']
    },
    description: String,
    timestamp: Date,
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  qualityMetrics: {
    audioQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    videoQuality: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor']
    },
    connectionStability: {
      type: String,
      enum: ['stable', 'unstable', 'intermittent']
    },
    overallSatisfaction: {
      patient: {
        type: Number,
        min: 1,
        max: 5
      },
      provider: {
        type: Number,
        min: 1,
        max: 5
      }
    }
  },
  notes: {
    provider: String,
    technical: String
  },
  followUpActions: [{
    action: String,
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dueDate: Date,
    completed: {
      type: Boolean,
      default: false
    }
  }]
}, {
  timestamps: true
});

// Indexes for faster queries (sessionId index created automatically by unique: true)
consultationSchema.index({ appointment: 1 });
consultationSchema.index({ patient: 1, startTime: -1 });
consultationSchema.index({ provider: 1, startTime: -1 });
consultationSchema.index({ status: 1 });
consultationSchema.index({ startTime: 1 });

module.exports = mongoose.model('Consultation', consultationSchema);
