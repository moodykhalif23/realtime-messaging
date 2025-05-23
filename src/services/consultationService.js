const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const { v4: uuidv4 } = require('uuid');
const { webrtc } = require('../config/config');

class ConsultationService {
  constructor() {
    this.activeSessions = new Map(); // Store active consultation sessions
  }

  // Create a new consultation session
  async createConsultationSession(appointmentId, type = 'video') {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient provider');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status !== 'confirmed' && appointment.status !== 'scheduled') {
        throw new Error('Appointment is not in a valid state for consultation');
      }

      // Check if consultation already exists
      const existingConsultation = await Consultation.findOne({ appointment: appointmentId });
      if (existingConsultation) {
        return existingConsultation;
      }

      const sessionId = uuidv4();
      
      const consultation = new Consultation({
        sessionId,
        appointment: appointmentId,
        patient: appointment.patient._id,
        provider: appointment.provider._id,
        type,
        status: 'waiting',
        participants: []
      });

      await consultation.save();

      // Update appointment status
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: 'confirmed',
        'consultation.sessionId': sessionId
      });

      // Store session in memory for quick access
      this.activeSessions.set(sessionId, {
        consultationId: consultation._id,
        participants: new Set(),
        startTime: null
      });

      return consultation;
    } catch (error) {
      throw new Error(`Failed to create consultation session: ${error.message}`);
    }
  }

  // Join a consultation session
  async joinConsultationSession(sessionId, userId, role) {
    try {
      const consultation = await Consultation.findOne({ sessionId })
        .populate('appointment patient provider');

      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      // Verify user has permission to join
      const isAuthorized = this.verifyUserAuthorization(consultation, userId, role);
      if (!isAuthorized) {
        throw new Error('User not authorized to join this consultation');
      }

      const joinTime = new Date();

      // Add participant to consultation
      const existingParticipant = consultation.participants.find(p => 
        p.userId.toString() === userId.toString()
      );

      if (existingParticipant) {
        // Update existing participant
        existingParticipant.joinedAt = joinTime;
        existingParticipant.leftAt = null;
      } else {
        // Add new participant
        consultation.participants.push({
          userId,
          role,
          joinedAt: joinTime,
          connectionQuality: 'good'
        });
      }

      // Start session if this is the first participant
      if (consultation.status === 'waiting' && consultation.participants.length === 1) {
        consultation.status = 'active';
        consultation.startTime = joinTime;

        // Update appointment status
        await Appointment.findByIdAndUpdate(consultation.appointment._id, {
          status: 'in_progress',
          'consultation.startTime': joinTime
        });
      }

      await consultation.save();

      // Update active session
      const activeSession = this.activeSessions.get(sessionId);
      if (activeSession) {
        activeSession.participants.add(userId);
        if (!activeSession.startTime && consultation.status === 'active') {
          activeSession.startTime = joinTime;
        }
      }

      return {
        consultation,
        webrtcConfig: this.getWebRTCConfig(),
        sessionInfo: {
          canRecord: role === 'provider',
          canScreenShare: true,
          maxParticipants: 10
        }
      };
    } catch (error) {
      throw new Error(`Failed to join consultation session: ${error.message}`);
    }
  }

  // Leave a consultation session
  async leaveConsultationSession(sessionId, userId) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      const participant = consultation.participants.find(p => 
        p.userId.toString() === userId.toString()
      );

      if (participant) {
        participant.leftAt = new Date();
      }

      // Check if all participants have left
      const activeParticipants = consultation.participants.filter(p => !p.leftAt);
      
      if (activeParticipants.length === 0) {
        consultation.status = 'ended';
        consultation.endTime = new Date();
        
        // Calculate duration
        if (consultation.startTime) {
          consultation.duration = Math.round(
            (consultation.endTime - consultation.startTime) / (1000 * 60)
          );
        }

        // Update appointment status
        await Appointment.findByIdAndUpdate(consultation.appointment._id, {
          status: 'completed',
          'consultation.endTime': consultation.endTime
        });

        // Remove from active sessions
        this.activeSessions.delete(sessionId);
      }

      await consultation.save();

      // Update active session
      const activeSession = this.activeSessions.get(sessionId);
      if (activeSession) {
        activeSession.participants.delete(userId);
      }

      return consultation;
    } catch (error) {
      throw new Error(`Failed to leave consultation session: ${error.message}`);
    }
  }

  // Send chat message
  async sendChatMessage(sessionId, senderId, message, messageType = 'text', attachments = []) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      if (consultation.status !== 'active') {
        throw new Error('Consultation session is not active');
      }

      const chatMessage = {
        senderId,
        message,
        timestamp: new Date(),
        messageType,
        attachments
      };

      consultation.chatMessages.push(chatMessage);
      await consultation.save();

      return chatMessage;
    } catch (error) {
      throw new Error(`Failed to send chat message: ${error.message}`);
    }
  }

  // Start screen sharing
  async startScreenSharing(sessionId, userId, purpose) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      const screenShare = {
        sharedBy: userId,
        startTime: new Date(),
        purpose
      };

      consultation.screenSharing.push(screenShare);
      await consultation.save();

      return screenShare;
    } catch (error) {
      throw new Error(`Failed to start screen sharing: ${error.message}`);
    }
  }

  // Stop screen sharing
  async stopScreenSharing(sessionId, userId) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      const activeScreenShare = consultation.screenSharing.find(ss => 
        ss.sharedBy.toString() === userId.toString() && !ss.endTime
      );

      if (activeScreenShare) {
        activeScreenShare.endTime = new Date();
        await consultation.save();
      }

      return activeScreenShare;
    } catch (error) {
      throw new Error(`Failed to stop screen sharing: ${error.message}`);
    }
  }

  // Start recording
  async startRecording(sessionId, userId) {
    try {
      const consultation = await Consultation.findOne({ sessionId })
        .populate('patient provider');

      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      // Verify user has permission to record (typically only providers)
      const participant = consultation.participants.find(p => 
        p.userId.toString() === userId.toString()
      );

      if (!participant || participant.role !== 'provider') {
        throw new Error('User not authorized to start recording');
      }

      // Check consent (in a real implementation, this would be more sophisticated)
      consultation.recording.isRecorded = true;
      consultation.recording.recordingStartTime = new Date();
      consultation.recording.consentGiven = {
        patient: true, // In practice, this should be explicitly obtained
        provider: true
      };

      await consultation.save();

      return {
        recordingStarted: true,
        recordingId: `rec_${consultation.sessionId}_${Date.now()}`
      };
    } catch (error) {
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  // Stop recording
  async stopRecording(sessionId, userId) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      if (!consultation.recording.isRecorded) {
        throw new Error('No active recording found');
      }

      consultation.recording.recordingEndTime = new Date();
      // In a real implementation, you would save the recording file and get the URL
      consultation.recording.recordingUrl = `recordings/${consultation.sessionId}.mp4`;

      await consultation.save();

      return {
        recordingStopped: true,
        recordingUrl: consultation.recording.recordingUrl
      };
    } catch (error) {
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  // Report technical issue
  async reportTechnicalIssue(sessionId, userId, issueType, description) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      const issue = {
        reportedBy: userId,
        issueType,
        description,
        timestamp: new Date(),
        resolved: false
      };

      consultation.technicalIssues.push(issue);
      await consultation.save();

      return issue;
    } catch (error) {
      throw new Error(`Failed to report technical issue: ${error.message}`);
    }
  }

  // Update connection quality
  async updateConnectionQuality(sessionId, userId, quality) {
    try {
      const consultation = await Consultation.findOne({ sessionId });
      if (!consultation) {
        throw new Error('Consultation session not found');
      }

      const participant = consultation.participants.find(p => 
        p.userId.toString() === userId.toString()
      );

      if (participant) {
        participant.connectionQuality = quality;
        await consultation.save();
      }

      return participant;
    } catch (error) {
      throw new Error(`Failed to update connection quality: ${error.message}`);
    }
  }

  // Get consultation history
  async getConsultationHistory(userId, role, limit = 10, page = 1) {
    try {
      const skip = (page - 1) * limit;
      let query = {};

      if (role === 'patient') {
        query.patient = userId;
      } else if (role === 'provider') {
        query.provider = userId;
      }

      const consultations = await Consultation.find(query)
        .populate('appointment patient provider')
        .populate({
          path: 'patient',
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .populate({
          path: 'provider',
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .sort({ startTime: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Consultation.countDocuments(query);

      return {
        consultations,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get consultation history: ${error.message}`);
    }
  }

  // Verify user authorization
  verifyUserAuthorization(consultation, userId, role) {
    const patientId = consultation.patient._id.toString();
    const providerId = consultation.provider._id.toString();

    if (role === 'patient' && userId.toString() === patientId) {
      return true;
    }
    if (role === 'provider' && userId.toString() === providerId) {
      return true;
    }
    if (role === 'observer') {
      // Additional logic for observers (e.g., medical students, supervisors)
      return false; // For now, observers are not allowed
    }

    return false;
  }

  // Get WebRTC configuration
  getWebRTCConfig() {
    return {
      iceServers: webrtc.iceServers,
      iceCandidatePoolSize: 10
    };
  }

  // Get active session info
  getActiveSessionInfo(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  // Get all active sessions (for monitoring)
  getAllActiveSessions() {
    return Array.from(this.activeSessions.entries()).map(([sessionId, info]) => ({
      sessionId,
      ...info,
      participantCount: info.participants.size
    }));
  }
}

module.exports = new ConsultationService();
