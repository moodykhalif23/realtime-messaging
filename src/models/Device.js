const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    unique: true,
    required: true
  },
  serialNumber: {
    type: String,
    unique: true,
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  deviceType: {
    type: String,
    enum: [
      'smartwatch', 'fitness_tracker', 'blood_pressure_monitor',
      'glucose_meter', 'pulse_oximeter', 'thermometer', 'scale',
      'ecg_monitor', 'fall_detector', 'panic_button', 'smartphone_app',
      'continuous_glucose_monitor', 'pacemaker', 'insulin_pump'
    ],
    required: true
  },
  manufacturer: {
    name: String,
    model: String,
    version: String
  },
  capabilities: [{
    type: String,
    enum: [
      'heart_rate', 'blood_pressure', 'temperature', 'oxygen_saturation',
      'blood_glucose', 'weight', 'ecg', 'fall_detection', 'gps_tracking',
      'medication_reminders', 'emergency_button', 'activity_tracking',
      'sleep_monitoring', 'stress_monitoring'
    ]
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance', 'error', 'lost'],
    default: 'active'
  },
  connectivity: {
    type: {
      type: String,
      enum: ['bluetooth', 'wifi', 'cellular', 'zigbee', 'lora'],
      required: true
    },
    lastConnected: Date,
    signalStrength: Number,
    batteryLevel: Number,
    isOnline: {
      type: Boolean,
      default: false
    }
  },
  configuration: {
    measurementInterval: Number, // minutes
    alertThresholds: {
      heartRate: {
        min: Number,
        max: Number
      },
      bloodPressure: {
        systolicMin: Number,
        systolicMax: Number,
        diastolicMin: Number,
        diastolicMax: Number
      },
      temperature: {
        min: Number,
        max: Number
      },
      oxygenSaturation: {
        min: Number
      },
      bloodGlucose: {
        min: Number,
        max: Number
      }
    },
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String,
      priority: Number
    }],
    medicationReminders: [{
      medicationName: String,
      dosage: String,
      times: [String], // Array of time strings like "08:00", "14:00"
      enabled: Boolean
    }]
  },
  calibration: {
    lastCalibrated: Date,
    calibratedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    nextCalibrationDue: Date,
    calibrationHistory: [{
      calibratedAt: Date,
      calibratedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      notes: String
    }]
  },
  maintenance: {
    lastMaintenance: Date,
    nextMaintenanceDue: Date,
    maintenanceHistory: [{
      performedAt: Date,
      performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      type: {
        type: String,
        enum: ['routine', 'repair', 'replacement', 'upgrade']
      },
      description: String,
      cost: Number
    }]
  },
  firmware: {
    currentVersion: String,
    lastUpdated: Date,
    updateHistory: [{
      version: String,
      updatedAt: Date,
      updateType: {
        type: String,
        enum: ['security', 'feature', 'bugfix', 'performance']
      },
      notes: String
    }]
  },
  dataQuality: {
    accuracy: Number, // percentage
    reliability: Number, // percentage
    lastQualityCheck: Date,
    qualityIssues: [{
      issue: String,
      detectedAt: Date,
      resolved: Boolean,
      resolvedAt: Date
    }]
  },
  alerts: [{
    type: {
      type: String,
      enum: ['low_battery', 'connection_lost', 'calibration_due', 'maintenance_due', 'error', 'tamper']
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical']
    },
    message: String,
    triggeredAt: Date,
    acknowledged: Boolean,
    acknowledgedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    acknowledgedAt: Date,
    resolved: Boolean,
    resolvedAt: Date
  }],
  location: {
    assignedLocation: String,
    currentLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      lastUpdated: Date
    },
    geofence: {
      enabled: Boolean,
      center: {
        latitude: Number,
        longitude: Number
      },
      radius: Number, // meters
      alertOnExit: Boolean
    }
  },
  usage: {
    totalReadings: Number,
    lastReading: Date,
    averageReadingsPerDay: Number,
    complianceRate: Number, // percentage
    usagePattern: {
      mostActiveHours: [Number],
      leastActiveHours: [Number],
      weeklyPattern: [{
        day: String,
        averageReadings: Number
      }]
    }
  },
  warranty: {
    startDate: Date,
    endDate: Date,
    provider: String,
    terms: String
  },
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance (deviceId and serialNumber indexes created automatically by unique: true)
deviceSchema.index({ patient: 1 });
deviceSchema.index({ deviceType: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ 'connectivity.isOnline': 1 });
deviceSchema.index({ 'connectivity.lastConnected': -1 });

// Compound indexes for common queries
deviceSchema.index({ patient: 1, status: 1 });
deviceSchema.index({ deviceType: 1, status: 1 });
deviceSchema.index({ patient: 1, deviceType: 1 });

module.exports = mongoose.model('Device', deviceSchema);
