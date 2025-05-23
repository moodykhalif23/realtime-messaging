const EmergencyAlert = require('../models/EmergencyAlert');
const Patient = require('../models/Patient');
const User = require('../models/User');
const Provider = require('../models/Provider');
const emailService = require('./emailService');
const { v4: uuidv4 } = require('uuid');

class EmergencyResponseService {
  constructor() {
    this.escalationTimeouts = new Map(); // Store escalation timers
    this.responseTeams = new Map(); // Store active response teams
  }

  // Create emergency alert
  async createEmergencyAlert(alertData) {
    try {
      const {
        patientId,
        triggeredBy,
        alertType,
        severity,
        priority,
        description,
        location,
        symptoms,
        patientCondition
      } = alertData;

      // Validate patient exists
      const patient = await Patient.findById(patientId)
        .populate('userId', 'firstName lastName phone')
        .populate('emergencyContacts');

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Create emergency alert
      const emergencyAlert = new EmergencyAlert({
        alertId: `EMRG-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        patient: patientId,
        triggeredBy,
        alertType,
        severity,
        priority,
        description,
        location,
        symptoms: symptoms || [],
        patientCondition: patientCondition || {},
        timeline: [{
          timestamp: new Date(),
          event: 'Emergency alert created',
          user: triggeredBy,
          details: description,
          automated: false
        }]
      });

      await emergencyAlert.save();

      // Start response workflow
      await this.initiateEmergencyResponse(emergencyAlert);

      return {
        success: true,
        data: emergencyAlert,
        message: 'Emergency alert created and response initiated'
      };
    } catch (error) {
      throw new Error(`Failed to create emergency alert: ${error.message}`);
    }
  }

  // Initiate emergency response workflow
  async initiateEmergencyResponse(emergencyAlert) {
    try {
      // 1. Notify immediate response team
      await this.notifyResponseTeam(emergencyAlert);

      // 2. Contact emergency services if critical
      if (emergencyAlert.severity === 'critical' && emergencyAlert.priority === 'immediate') {
        await this.contactEmergencyServices(emergencyAlert);
      }

      // 3. Notify patient's emergency contacts
      await this.notifyEmergencyContacts(emergencyAlert);

      // 4. Set up escalation timers
      await this.setupEscalationTimers(emergencyAlert);

      // 5. Broadcast alert to all relevant parties
      this.broadcastEmergencyAlert(emergencyAlert);

      // 6. Log response initiation
      await this.addTimelineEvent(emergencyAlert._id, {
        event: 'Emergency response initiated',
        details: 'Response team notified, escalation timers set',
        automated: true
      });

    } catch (error) {
      console.error('Error initiating emergency response:', error);
      throw error;
    }
  }

  // Notify response team
  async notifyResponseTeam(emergencyAlert) {
    try {
      // Find available healthcare providers
      const availableProviders = await this.findAvailableProviders(emergencyAlert);

      // Assign primary responder
      if (availableProviders.length > 0) {
        const primaryResponder = availableProviders[0];
        
        emergencyAlert.response.assignedTo = primaryResponder._id;
        emergencyAlert.response.assignedAt = new Date();
        
        // Add to response team
        emergencyAlert.response.responseTeam.push({
          member: primaryResponder._id,
          role: 'primary_responder',
          status: 'notified'
        });

        await emergencyAlert.save();

        // Send notifications
        await this.sendNotification(primaryResponder.userId, 'emergency_assignment', {
          alertId: emergencyAlert.alertId,
          patientName: `${emergencyAlert.patient.userId.firstName} ${emergencyAlert.patient.userId.lastName}`,
          severity: emergencyAlert.severity,
          description: emergencyAlert.description,
          location: emergencyAlert.location
        });
      }

      // Notify backup responders
      const backupResponders = availableProviders.slice(1, 4);
      for (const responder of backupResponders) {
        emergencyAlert.response.responseTeam.push({
          member: responder._id,
          role: 'backup_responder',
          status: 'notified'
        });

        await this.sendNotification(responder.userId, 'emergency_backup', {
          alertId: emergencyAlert.alertId,
          severity: emergencyAlert.severity,
          description: emergencyAlert.description
        });
      }

      await emergencyAlert.save();

    } catch (error) {
      console.error('Error notifying response team:', error);
    }
  }

  // Find available healthcare providers
  async findAvailableProviders(emergencyAlert) {
    try {
      // Get providers based on patient's location and specialization needs
      const providers = await Provider.find({
        isVerified: true,
        isAcceptingNewPatients: true
      })
      .populate('userId', 'firstName lastName phone email')
      .sort({ experience: -1 });

      // Filter by availability and proximity (simplified)
      const availableProviders = providers.filter(provider => {
        // Check if provider is currently online or available
        // This would integrate with real-time presence system
        return true; // Simplified for demo
      });

      return availableProviders;
    } catch (error) {
      console.error('Error finding available providers:', error);
      return [];
    }
  }

  // Contact emergency services
  async contactEmergencyServices(emergencyAlert) {
    try {
      // In a real implementation, this would integrate with 911/emergency services API
      const incidentNumber = `INC-${Date.now()}`;
      
      emergencyAlert.externalServices.emergencyServices = {
        contacted: true,
        contactedAt: new Date(),
        incidentNumber,
        dispatchedUnits: ['AMB-001', 'FIRE-002'], // Simulated
        estimatedArrival: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      };

      await emergencyAlert.save();

      // Log timeline event
      await this.addTimelineEvent(emergencyAlert._id, {
        event: 'Emergency services contacted',
        details: `Incident number: ${incidentNumber}`,
        automated: true
      });

      console.log(`Emergency services contacted for alert ${emergencyAlert.alertId}`);
    } catch (error) {
      console.error('Error contacting emergency services:', error);
    }
  }

  // Notify emergency contacts
  async notifyEmergencyContacts(emergencyAlert) {
    try {
      const patient = await Patient.findById(emergencyAlert.patient)
        .populate('userId')
        .populate('emergencyContacts');

      if (patient.emergencyContacts && patient.emergencyContacts.length > 0) {
        for (const contact of patient.emergencyContacts) {
          // Send SMS/call notification
          await this.sendEmergencyContactNotification(contact, emergencyAlert);
          
          emergencyAlert.externalServices.familyContacted.contactedPersons.push({
            name: contact.name,
            relationship: contact.relationship,
            phone: contact.phone,
            notifiedAt: new Date()
          });
        }

        emergencyAlert.externalServices.familyContacted.contacted = true;
        emergencyAlert.externalServices.familyContacted.contactedAt = new Date();
        await emergencyAlert.save();
      }
    } catch (error) {
      console.error('Error notifying emergency contacts:', error);
    }
  }

  // Send emergency contact notification
  async sendEmergencyContactNotification(contact, emergencyAlert) {
    try {
      // In a real implementation, this would send SMS or make phone calls
      console.log(`Notifying emergency contact: ${contact.name} (${contact.phone})`);
      
      // Simulate SMS notification
      const message = `EMERGENCY ALERT: ${contact.relationship} has triggered an emergency alert. ` +
                     `Severity: ${emergencyAlert.severity}. Location: ${emergencyAlert.location?.address || 'Unknown'}. ` +
                     `Emergency services have been notified. Alert ID: ${emergencyAlert.alertId}`;
      
      // Log communication
      emergencyAlert.communications.push({
        type: 'sms',
        recipient: contact.name,
        message,
        sentAt: new Date(),
        status: 'sent'
      });

      await emergencyAlert.save();
    } catch (error) {
      console.error('Error sending emergency contact notification:', error);
    }
  }

  // Setup escalation timers
  async setupEscalationTimers(emergencyAlert) {
    try {
      const escalationRules = [
        { timeThreshold: 5, targetLevel: 2 }, // 5 minutes
        { timeThreshold: 15, targetLevel: 3 }, // 15 minutes
        { timeThreshold: 30, targetLevel: 4 }, // 30 minutes
        { timeThreshold: 60, targetLevel: 5 }  // 1 hour
      ];

      for (const rule of escalationRules) {
        const timeoutId = setTimeout(async () => {
          await this.escalateAlert(emergencyAlert._id, rule.targetLevel);
        }, rule.timeThreshold * 60 * 1000);

        // Store timeout for potential cancellation
        this.escalationTimeouts.set(`${emergencyAlert._id}-${rule.targetLevel}`, timeoutId);
      }

      emergencyAlert.escalation.escalationRules = escalationRules;
      await emergencyAlert.save();

    } catch (error) {
      console.error('Error setting up escalation timers:', error);
    }
  }

  // Escalate alert
  async escalateAlert(alertId, targetLevel) {
    try {
      const emergencyAlert = await EmergencyAlert.findById(alertId);
      if (!emergencyAlert || emergencyAlert.status === 'resolved') {
        return; // Alert already resolved
      }

      emergencyAlert.escalation.level = targetLevel;
      emergencyAlert.escalation.escalatedAt.push(new Date());

      // Notify additional personnel based on escalation level
      await this.notifyEscalationTeam(emergencyAlert, targetLevel);

      await emergencyAlert.save();

      // Log escalation
      await this.addTimelineEvent(alertId, {
        event: `Alert escalated to level ${targetLevel}`,
        details: `Automatic escalation due to no response`,
        automated: true
      });

      console.log(`Alert ${emergencyAlert.alertId} escalated to level ${targetLevel}`);
    } catch (error) {
      console.error('Error escalating alert:', error);
    }
  }

  // Notify escalation team
  async notifyEscalationTeam(emergencyAlert, escalationLevel) {
    try {
      // Define escalation contacts based on level
      const escalationContacts = {
        2: ['supervisor', 'senior_nurse'],
        3: ['department_head', 'emergency_coordinator'],
        4: ['medical_director', 'hospital_administrator'],
        5: ['ceo', 'external_emergency_services']
      };

      const roles = escalationContacts[escalationLevel] || [];
      
      for (const role of roles) {
        // Find users with the specified role
        const users = await User.find({ role });
        
        for (const user of users) {
          await this.sendNotification(user._id, 'emergency_escalation', {
            alertId: emergencyAlert.alertId,
            escalationLevel,
            severity: emergencyAlert.severity,
            description: emergencyAlert.description
          });
        }
      }
    } catch (error) {
      console.error('Error notifying escalation team:', error);
    }
  }

  // Acknowledge emergency alert
  async acknowledgeAlert(alertId, userId, response) {
    try {
      const emergencyAlert = await EmergencyAlert.findById(alertId);
      if (!emergencyAlert) {
        throw new Error('Emergency alert not found');
      }

      // Add acknowledgment
      emergencyAlert.response.acknowledgedBy.push({
        user: userId,
        acknowledgedAt: new Date(),
        response
      });

      // Update status if first acknowledgment
      if (emergencyAlert.status === 'active') {
        emergencyAlert.status = 'acknowledged';
      }

      await emergencyAlert.save();

      // Cancel escalation timers if acknowledged by primary responder
      if (emergencyAlert.response.assignedTo?.toString() === userId.toString()) {
        this.cancelEscalationTimers(alertId);
      }

      // Log acknowledgment
      await this.addTimelineEvent(alertId, {
        event: 'Alert acknowledged',
        user: userId,
        details: response || 'Alert acknowledged by responder'
      });

      // Broadcast acknowledgment
      this.broadcastAlertUpdate(emergencyAlert);

      return {
        success: true,
        data: emergencyAlert,
        message: 'Alert acknowledged successfully'
      };
    } catch (error) {
      throw new Error(`Failed to acknowledge alert: ${error.message}`);
    }
  }

  // Resolve emergency alert
  async resolveAlert(alertId, userId, resolution) {
    try {
      const emergencyAlert = await EmergencyAlert.findById(alertId);
      if (!emergencyAlert) {
        throw new Error('Emergency alert not found');
      }

      // Update resolution details
      emergencyAlert.status = 'resolved';
      emergencyAlert.resolution = {
        resolvedAt: new Date(),
        resolvedBy: userId,
        outcome: resolution.outcome,
        hospitalTransport: resolution.hospitalTransport,
        followUpRequired: resolution.followUpRequired,
        followUpInstructions: resolution.followUpInstructions,
        notes: resolution.notes
      };

      // Calculate metrics
      const responseTime = emergencyAlert.response.acknowledgedBy.length > 0 ?
        (emergencyAlert.response.acknowledgedBy[0].acknowledgedAt - emergencyAlert.createdAt) / 1000 : null;
      
      const resolutionTime = (new Date() - emergencyAlert.createdAt) / 1000;

      emergencyAlert.metrics = {
        responseTime,
        resolutionTime,
        escalationCount: emergencyAlert.escalation.escalatedAt.length,
        communicationsSent: emergencyAlert.communications.length,
        falseAlarm: resolution.outcome === 'false_alarm'
      };

      await emergencyAlert.save();

      // Cancel any remaining escalation timers
      this.cancelEscalationTimers(alertId);

      // Log resolution
      await this.addTimelineEvent(alertId, {
        event: 'Alert resolved',
        user: userId,
        details: `Outcome: ${resolution.outcome}. ${resolution.notes || ''}`
      });

      // Broadcast resolution
      this.broadcastAlertUpdate(emergencyAlert);

      return {
        success: true,
        data: emergencyAlert,
        message: 'Alert resolved successfully'
      };
    } catch (error) {
      throw new Error(`Failed to resolve alert: ${error.message}`);
    }
  }

  // Cancel escalation timers
  cancelEscalationTimers(alertId) {
    for (const [key, timeoutId] of this.escalationTimeouts.entries()) {
      if (key.startsWith(alertId.toString())) {
        clearTimeout(timeoutId);
        this.escalationTimeouts.delete(key);
      }
    }
  }

  // Add timeline event
  async addTimelineEvent(alertId, eventData) {
    try {
      await EmergencyAlert.findByIdAndUpdate(alertId, {
        $push: {
          timeline: {
            timestamp: new Date(),
            ...eventData
          }
        }
      });
    } catch (error) {
      console.error('Error adding timeline event:', error);
    }
  }

  // Send notification
  async sendNotification(userId, type, data) {
    try {
      // This would integrate with various notification services
      console.log(`Sending ${type} notification to user ${userId}:`, data);
      
      // In a real implementation, this would:
      // 1. Send push notifications
      // 2. Send SMS
      // 3. Send emails
      // 4. Make phone calls for critical alerts
      
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Broadcast emergency alert
  broadcastEmergencyAlert(emergencyAlert) {
    const io = require('../index').io;
    if (io) {
      io.emit('emergency-alert', {
        alertId: emergencyAlert.alertId,
        patientId: emergencyAlert.patient,
        severity: emergencyAlert.severity,
        priority: emergencyAlert.priority,
        description: emergencyAlert.description,
        location: emergencyAlert.location,
        timestamp: emergencyAlert.createdAt
      });
    }
  }

  // Broadcast alert update
  broadcastAlertUpdate(emergencyAlert) {
    const io = require('../index').io;
    if (io) {
      io.emit('emergency-alert-update', {
        alertId: emergencyAlert.alertId,
        status: emergencyAlert.status,
        response: emergencyAlert.response,
        timeline: emergencyAlert.timeline,
        timestamp: new Date()
      });
    }
  }

  // Get active emergency alerts
  async getActiveAlerts(filters = {}) {
    try {
      const query = {
        status: { $in: ['active', 'acknowledged', 'responding'] }
      };

      if (filters.severity) {
        query.severity = filters.severity;
      }

      if (filters.priority) {
        query.priority = filters.priority;
      }

      if (filters.assignedTo) {
        query['response.assignedTo'] = filters.assignedTo;
      }

      const alerts = await EmergencyAlert.find(query)
        .populate('patient', 'userId medicalRecordNumber')
        .populate({
          path: 'patient',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        })
        .populate('response.assignedTo', 'firstName lastName role')
        .sort({ createdAt: -1 });

      return {
        success: true,
        data: alerts
      };
    } catch (error) {
      throw new Error(`Failed to get active alerts: ${error.message}`);
    }
  }
}

module.exports = new EmergencyResponseService();
