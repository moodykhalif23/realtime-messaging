const mongoose = require('mongoose');

const emergencyAlertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  triggeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  alertType: {
    type: String,
    enum: [
      'manual', 'vital_signs', 'fall_detection', 'medication_missed',
      'panic_button', 'device_malfunction', 'no_response', 'geofence_breach'
    ],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  priority: {
    type: String,
    enum: ['routine', 'urgent', 'emergent', 'immediate'],
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'responding', 'resolved', 'false_alarm'],
    default: 'active'
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    accuracy: Number,
    source: {
      type: String,
      enum: ['gps', 'network', 'manual', 'device'],
      default: 'gps'
    },
    indoorLocation: {
      building: String,
      floor: String,
      room: String,
      zone: String
    }
  },
  vitalSigns: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VitalSigns'
  },
  symptoms: [{
    symptom: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    duration: String,
    onset: Date
  }],
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  patientCondition: {
    consciousness: {
      type: String,
      enum: ['alert', 'drowsy', 'confused', 'unconscious', 'unknown']
    },
    breathing: {
      type: String,
      enum: ['normal', 'labored', 'shallow', 'absent', 'unknown']
    },
    mobility: {
      type: String,
      enum: ['mobile', 'limited', 'immobile', 'unknown']
    },
    pain: {
      level: {
        type: Number,
        min: 0,
        max: 10
      },
      location: String
    }
  },
  response: {
    acknowledgedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      acknowledgedAt: Date,
      role: String,
      response: String
    }],
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedAt: Date,
    estimatedArrival: Date,
    actualArrival: Date,
    responseTeam: [{
      member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      role: String,
      status: {
        type: String,
        enum: ['notified', 'en_route', 'on_scene', 'completed']
      }
    }]
  },
  escalation: {
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 5
    },
    escalatedAt: [Date],
    escalatedTo: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      level: Number,
      escalatedAt: Date
    }],
    autoEscalationEnabled: {
      type: Boolean,
      default: true
    },
    escalationRules: [{
      timeThreshold: Number, // minutes
      targetLevel: Number,
      targetUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }]
  },
  communications: [{
    type: {
      type: String,
      enum: ['sms', 'email', 'push', 'call', 'radio', 'in_person']
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    status: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'read', 'failed']
    }
  }],
  externalServices: {
    emergencyServices: {
      contacted: Boolean,
      contactedAt: Date,
      incidentNumber: String,
      dispatchedUnits: [String],
      estimatedArrival: Date
    },
    familyContacted: {
      contacted: Boolean,
      contactedAt: Date,
      contactedPersons: [{
        name: String,
        relationship: String,
        phone: String,
        notifiedAt: Date
      }]
    }
  },
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    outcome: {
      type: String,
      enum: [
        'patient_stable', 'transported_hospital', 'treated_on_scene',
        'false_alarm', 'patient_refused_care', 'resolved_remotely'
      ]
    },
    hospitalTransport: {
      required: Boolean,
      hospital: String,
      ambulanceId: String,
      departureTime: Date,
      arrivalTime: Date
    },
    followUpRequired: Boolean,
    followUpInstructions: String,
    notes: String
  },
  timeline: [{
    timestamp: Date,
    event: String,
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    details: String,
    automated: {
      type: Boolean,
      default: false
    }
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: Date,
    description: String
  }],
  metrics: {
    responseTime: Number, // seconds from alert to first response
    resolutionTime: Number, // seconds from alert to resolution
    escalationCount: Number,
    communicationsSent: Number,
    falseAlarm: Boolean
  }
}, {
  timestamps: true
});

// Indexes for performance (alertId index created automatically by unique: true)
emergencyAlertSchema.index({ patient: 1, createdAt: -1 });
emergencyAlertSchema.index({ status: 1, severity: 1 });
emergencyAlertSchema.index({ alertType: 1 });
emergencyAlertSchema.index({ priority: 1, createdAt: -1 });
emergencyAlertSchema.index({ 'response.assignedTo': 1 });
emergencyAlertSchema.index({ createdAt: -1 });

// Compound indexes for common queries
emergencyAlertSchema.index({ status: 1, priority: 1, createdAt: -1 });
emergencyAlertSchema.index({ patient: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('EmergencyAlert', emergencyAlertSchema);
