const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  recordId: {
    type: String,
    unique: true,
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
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  },
  recordType: {
    type: String,
    enum: ['consultation', 'diagnosis', 'treatment', 'lab_result', 'imaging', 'prescription', 'vaccination'],
    required: true
  },
  chiefComplaint: {
    type: String,
    maxlength: 1000
  },
  historyOfPresentIllness: {
    type: String,
    maxlength: 2000
  },
  physicalExamination: {
    vitalSigns: {
      temperature: Number, // in Celsius
      bloodPressure: {
        systolic: Number,
        diastolic: Number
      },
      heartRate: Number, // beats per minute
      respiratoryRate: Number, // breaths per minute
      oxygenSaturation: Number, // percentage
      weight: Number, // in kg
      height: Number // in cm
    },
    generalAppearance: String,
    systemsReview: {
      cardiovascular: String,
      respiratory: String,
      gastrointestinal: String,
      neurological: String,
      musculoskeletal: String,
      dermatological: String,
      other: String
    }
  },
  diagnosis: [{
    primary: {
      type: Boolean,
      default: false
    },
    icdCode: String,
    description: String,
    severity: {
      type: String,
      enum: ['mild', 'moderate', 'severe']
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic', 'suspected']
    }
  }],
  treatmentPlan: {
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    procedures: [{
      name: String,
      scheduledDate: Date,
      notes: String
    }],
    lifestyle: [{
      recommendation: String,
      category: {
        type: String,
        enum: ['diet', 'exercise', 'sleep', 'stress_management', 'other']
      }
    }],
    followUp: {
      required: Boolean,
      timeframe: String,
      instructions: String
    }
  },
  labResults: [{
    testName: String,
    result: String,
    normalRange: String,
    unit: String,
    status: {
      type: String,
      enum: ['normal', 'abnormal', 'critical']
    },
    orderedDate: Date,
    resultDate: Date,
    labName: String
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    uploadedAt: Date,
    description: String
  }],
  notes: {
    type: String,
    maxlength: 5000
  },
  isConfidential: {
    type: Boolean,
    default: false
  },
  accessLog: [{
    accessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    accessedAt: Date,
    action: {
      type: String,
      enum: ['view', 'edit', 'download', 'share']
    },
    ipAddress: String
  }]
}, {
  timestamps: true
});

// Indexes for faster queries (recordId index created automatically by unique: true)
medicalRecordSchema.index({ patient: 1, createdAt: -1 });
medicalRecordSchema.index({ provider: 1 });
medicalRecordSchema.index({ recordType: 1 });
medicalRecordSchema.index({ appointment: 1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
