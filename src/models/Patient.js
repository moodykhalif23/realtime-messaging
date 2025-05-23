const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  medicalRecordNumber: {
    type: String,
    unique: true,
    required: true
  },
  bloodType: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  },
  allergies: [{
    allergen: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    reaction: String
  }],
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Provider'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic']
    },
    notes: String
  }],
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expirationDate: Date
  },
  primaryCareProvider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  },
  vitalSigns: {
    height: Number, // in cm
    weight: Number, // in kg
    lastUpdated: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    communicationMethod: {
      type: String,
      enum: ['email', 'sms', 'phone', 'app'],
      default: 'email'
    },
    reminderSettings: {
      appointments: {
        type: Boolean,
        default: true
      },
      medications: {
        type: Boolean,
        default: true
      },
      checkups: {
        type: Boolean,
        default: true
      }
    }
  }
}, {
  timestamps: true
});

// Indexes for faster queries (userId and medicalRecordNumber indexes created automatically by unique: true)
patientSchema.index({ primaryCareProvider: 1 });
patientSchema.index({ bloodType: 1 });
patientSchema.index({ 'insurance.provider': 1 });

module.exports = mongoose.model('Patient', patientSchema);
