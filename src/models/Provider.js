const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true
  },
  specializations: [{
    type: String,
    required: true
  }],
  credentials: [{
    type: String // MD, DO, RN, NP, etc.
  }],
  experience: {
    type: Number, // years of experience
    min: 0
  },
  education: [{
    institution: String,
    degree: String,
    graduationYear: Number
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expirationDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  availability: {
    monday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String, // "09:00"
      endTime: String,   // "17:00"
      breakStart: String,
      breakEnd: String
    },
    tuesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    },
    wednesday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    },
    thursday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    },
    friday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    },
    saturday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    },
    sunday: {
      isAvailable: { type: Boolean, default: false },
      startTime: String,
      endTime: String,
      breakStart: String,
      breakEnd: String
    }
  },
  consultationFee: {
    type: Number,
    min: 0
  },
  rating: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAcceptingNewPatients: {
    type: Boolean,
    default: true
  },
  bio: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true
});

// Indexes for faster queries (licenseNumber index created automatically by unique: true)
providerSchema.index({ specializations: 1 });
providerSchema.index({ isVerified: 1 });
providerSchema.index({ isAcceptingNewPatients: 1 });
providerSchema.index({ 'rating.average': -1 });
providerSchema.index({ isVerified: 1, isAcceptingNewPatients: 1 }); // Compound index

module.exports = mongoose.model('Provider', providerSchema);
