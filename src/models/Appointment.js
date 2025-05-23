const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
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
  scheduledDateTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // duration in minutes
    default: 30
  },
  type: {
    type: String,
    enum: ['video_consultation', 'phone_consultation', 'in_person', 'follow_up', 'emergency'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled'
  },
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  symptoms: [{
    type: String
  }],
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: {
    patient: String,
    provider: String,
    admin: String
  },
  consultation: {
    sessionId: String,
    recordingUrl: String,
    startTime: Date,
    endTime: Date,
    participantCount: Number
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'push']
    },
    sentAt: Date,
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed']
    }
  }],
  cancellation: {
    cancelledBy: {
      type: String,
      enum: ['patient', 'provider', 'admin']
    },
    cancelledAt: Date,
    reason: String,
    refundAmount: Number
  },
  payment: {
    amount: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending'
    },
    transactionId: String,
    paidAt: Date
  }
}, {
  timestamps: true
});

// Indexes for faster queries (appointmentId index created automatically by unique: true)
appointmentSchema.index({ patient: 1, scheduledDateTime: 1 });
appointmentSchema.index({ provider: 1, scheduledDateTime: 1 });
appointmentSchema.index({ status: 1 });
appointmentSchema.index({ scheduledDateTime: 1 });
appointmentSchema.index({ type: 1 });
appointmentSchema.index({ priority: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
