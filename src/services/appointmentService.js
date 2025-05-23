const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Provider = require('../models/Provider');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');
const cron = require('node-cron');
const emailService = require('./emailService');

class AppointmentService {
  // Create a new appointment
  async createAppointment(appointmentData) {
    try {
      const { patientId, providerId, scheduledDateTime, type, reason, symptoms, priority } = appointmentData;

      // Validate patient and provider exist
      const patient = await Patient.findById(patientId);
      const provider = await Provider.findById(providerId);

      if (!patient || !provider) {
        throw new Error('Patient or Provider not found');
      }

      // Check provider availability
      const isAvailable = await this.checkProviderAvailability(providerId, scheduledDateTime);
      if (!isAvailable) {
        throw new Error('Provider is not available at the requested time');
      }

      // Check for conflicts
      const hasConflict = await this.checkAppointmentConflicts(providerId, scheduledDateTime);
      if (hasConflict) {
        throw new Error('Time slot is already booked');
      }

      const appointment = new Appointment({
        appointmentId: uuidv4(),
        patient: patientId,
        provider: providerId,
        scheduledDateTime: new Date(scheduledDateTime),
        type,
        reason,
        symptoms: symptoms || [],
        priority: priority || 'medium',
        status: 'scheduled'
      });

      await appointment.save();

      // Schedule reminder notifications
      await this.scheduleReminders(appointment._id);

      // Send confirmation emails
      await this.sendAppointmentConfirmation(appointment._id);

      return appointment;
    } catch (error) {
      throw new Error(`Failed to create appointment: ${error.message}`);
    }
  }

  // Get appointments for a patient
  async getPatientAppointments(patientId, status = null, limit = 10, page = 1) {
    try {
      const query = { patient: patientId };
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;

      const appointments = await Appointment.find(query)
        .populate('provider', 'userId specializations rating')
        .populate({
          path: 'provider',
          populate: {
            path: 'userId',
            select: 'firstName lastName profilePicture'
          }
        })
        .sort({ scheduledDateTime: 1 })
        .limit(limit)
        .skip(skip);

      const total = await Appointment.countDocuments(query);

      return {
        appointments,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get patient appointments: ${error.message}`);
    }
  }

  // Get appointments for a provider
  async getProviderAppointments(providerId, date = null, status = null) {
    try {
      const query = { provider: providerId };
      
      if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        query.scheduledDateTime = {
          $gte: startOfDay,
          $lte: endOfDay
        };
      }

      if (status) {
        query.status = status;
      }

      const appointments = await Appointment.find(query)
        .populate('patient', 'userId medicalRecordNumber')
        .populate({
          path: 'patient',
          populate: {
            path: 'userId',
            select: 'firstName lastName dateOfBirth phone email'
          }
        })
        .sort({ scheduledDateTime: 1 });

      return appointments;
    } catch (error) {
      throw new Error(`Failed to get provider appointments: ${error.message}`);
    }
  }

  // Update appointment status
  async updateAppointmentStatus(appointmentId, status, notes = null) {
    try {
      const updateData = { status };
      
      if (notes) {
        updateData['notes.admin'] = notes;
      }

      if (status === 'in_progress') {
        updateData['consultation.startTime'] = new Date();
      } else if (status === 'completed') {
        updateData['consultation.endTime'] = new Date();
      }

      const appointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        updateData,
        { new: true }
      ).populate('patient provider');

      if (!appointment) {
        throw new Error('Appointment not found');
      }

      // Send status update notifications
      await this.sendStatusUpdateNotification(appointment);

      return appointment;
    } catch (error) {
      throw new Error(`Failed to update appointment status: ${error.message}`);
    }
  }

  // Cancel appointment
  async cancelAppointment(appointmentId, cancelledBy, reason) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error('Appointment not found');
      }

      if (appointment.status === 'completed' || appointment.status === 'cancelled') {
        throw new Error('Cannot cancel this appointment');
      }

      appointment.status = 'cancelled';
      appointment.cancellation = {
        cancelledBy,
        cancelledAt: new Date(),
        reason
      };

      await appointment.save();

      // Send cancellation notifications
      await this.sendCancellationNotification(appointment);

      return appointment;
    } catch (error) {
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }
  }

  // Check provider availability
  async checkProviderAvailability(providerId, dateTime) {
    try {
      const provider = await Provider.findById(providerId);
      if (!provider) {
        return false;
      }

      const appointmentDate = new Date(dateTime);
      const dayOfWeek = appointmentDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const timeString = appointmentDate.toTimeString().substring(0, 5);

      const dayAvailability = provider.availability[dayOfWeek];
      
      if (!dayAvailability || !dayAvailability.isAvailable) {
        return false;
      }

      // Check if time is within working hours
      if (timeString < dayAvailability.startTime || timeString > dayAvailability.endTime) {
        return false;
      }

      // Check if time is during break
      if (dayAvailability.breakStart && dayAvailability.breakEnd) {
        if (timeString >= dayAvailability.breakStart && timeString <= dayAvailability.breakEnd) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // Check for appointment conflicts
  async checkAppointmentConflicts(providerId, dateTime, excludeAppointmentId = null) {
    try {
      const appointmentDate = new Date(dateTime);
      const startTime = new Date(appointmentDate.getTime() - 15 * 60000); // 15 minutes before
      const endTime = new Date(appointmentDate.getTime() + 45 * 60000); // 45 minutes after

      const query = {
        provider: providerId,
        scheduledDateTime: {
          $gte: startTime,
          $lte: endTime
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
      };

      if (excludeAppointmentId) {
        query._id = { $ne: excludeAppointmentId };
      }

      const conflictingAppointments = await Appointment.find(query);
      return conflictingAppointments.length > 0;
    } catch (error) {
      return true; // Assume conflict if error occurs
    }
  }

  // Schedule reminder notifications
  async scheduleReminders(appointmentId) {
    // This would typically use a job queue like Bull or Agenda
    // For now, we'll use a simple cron job approach
    console.log(`Scheduling reminders for appointment: ${appointmentId}`);
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(appointmentId) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patient')
        .populate('provider')
        .populate({
          path: 'patient',
          populate: { path: 'userId', select: 'firstName lastName email' }
        })
        .populate({
          path: 'provider',
          populate: { path: 'userId', select: 'firstName lastName' }
        });

      if (appointment && appointment.patient.userId.email) {
        await emailService.sendAppointmentConfirmation(appointment);
      }
    } catch (error) {
      console.error('Failed to send appointment confirmation:', error);
    }
  }

  // Send status update notification
  async sendStatusUpdateNotification(appointment) {
    try {
      // Implementation for sending status update notifications
      console.log(`Sending status update notification for appointment: ${appointment._id}`);
    } catch (error) {
      console.error('Failed to send status update notification:', error);
    }
  }

  // Send cancellation notification
  async sendCancellationNotification(appointment) {
    try {
      // Implementation for sending cancellation notifications
      console.log(`Sending cancellation notification for appointment: ${appointment._id}`);
    } catch (error) {
      console.error('Failed to send cancellation notification:', error);
    }
  }

  // Get available time slots for a provider
  async getAvailableTimeSlots(providerId, date, duration = 30) {
    try {
      const provider = await Provider.findById(providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const requestedDate = new Date(date);
      const dayOfWeek = requestedDate.toLocaleDateString('en-US', { weekday: 'lowercase' });
      const dayAvailability = provider.availability[dayOfWeek];

      if (!dayAvailability || !dayAvailability.isAvailable) {
        return [];
      }

      // Get existing appointments for the day
      const startOfDay = new Date(requestedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(requestedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await Appointment.find({
        provider: providerId,
        scheduledDateTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] }
      });

      // Generate available time slots
      const availableSlots = this.generateTimeSlots(
        dayAvailability,
        existingAppointments,
        requestedDate,
        duration
      );

      return availableSlots;
    } catch (error) {
      throw new Error(`Failed to get available time slots: ${error.message}`);
    }
  }

  // Generate time slots helper method
  generateTimeSlots(dayAvailability, existingAppointments, date, duration) {
    const slots = [];
    const startTime = this.parseTime(dayAvailability.startTime);
    const endTime = this.parseTime(dayAvailability.endTime);
    const breakStart = dayAvailability.breakStart ? this.parseTime(dayAvailability.breakStart) : null;
    const breakEnd = dayAvailability.breakEnd ? this.parseTime(dayAvailability.breakEnd) : null;

    let currentTime = startTime;

    while (currentTime + duration <= endTime) {
      // Skip break time
      if (breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd) {
        currentTime = breakEnd;
        continue;
      }

      const slotDateTime = new Date(date);
      slotDateTime.setHours(Math.floor(currentTime / 60), currentTime % 60, 0, 0);

      // Check if slot conflicts with existing appointments
      const hasConflict = existingAppointments.some(appointment => {
        const appointmentTime = appointment.scheduledDateTime.getTime();
        const slotTime = slotDateTime.getTime();
        const slotEndTime = slotTime + (duration * 60000);
        const appointmentEndTime = appointmentTime + (appointment.duration * 60000);

        return (slotTime < appointmentEndTime && slotEndTime > appointmentTime);
      });

      if (!hasConflict && slotDateTime > new Date()) {
        slots.push({
          time: slotDateTime.toISOString(),
          available: true
        });
      }

      currentTime += duration;
    }

    return slots;
  }

  // Parse time string to minutes
  parseTime(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }
}

module.exports = new AppointmentService();
