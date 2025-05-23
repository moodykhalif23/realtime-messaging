const VitalSigns = require('../models/VitalSigns');
const EmergencyAlert = require('../models/EmergencyAlert');
const Device = require('../models/Device');
const Patient = require('../models/Patient');
const { v4: uuidv4 } = require('uuid');

class PatientMonitoringService {
  constructor() {
    this.alertThresholds = {
      heartRate: { min: 60, max: 100, critical: { min: 40, max: 150 } },
      bloodPressure: {
        systolic: { min: 90, max: 140, critical: { min: 70, max: 180 } },
        diastolic: { min: 60, max: 90, critical: { min: 40, max: 120 } }
      },
      temperature: { min: 36.1, max: 37.2, critical: { min: 35.0, max: 39.0 } },
      oxygenSaturation: { min: 95, critical: { min: 90 } },
      respiratoryRate: { min: 12, max: 20, critical: { min: 8, max: 30 } }
    };
  }

  // Record vital signs from device
  async recordVitalSigns(vitalSignsData) {
    try {
      const {
        patientId,
        deviceId,
        deviceType = 'manual',
        measurements,
        location,
        metadata
      } = vitalSignsData;

      // Validate patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Create vital signs record
      const vitalSigns = new VitalSigns({
        recordId: uuidv4(),
        patient: patientId,
        deviceId,
        deviceType,
        measurements: this.processMeasurements(measurements),
        location,
        metadata,
        trends: await this.calculateTrends(patientId, measurements)
      });

      // Check for alerts
      const alerts = this.checkVitalSignsAlerts(measurements);
      vitalSigns.alerts = alerts;

      // Determine if this is an emergency
      const isEmergency = alerts.some(alert => alert.severity === 'critical');
      vitalSigns.isEmergency = isEmergency;

      await vitalSigns.save();

      // Update device last reading
      await this.updateDeviceStatus(deviceId, measurements);

      // Trigger emergency response if needed
      if (isEmergency) {
        await this.triggerEmergencyAlert(vitalSigns, alerts);
      }

      // Send real-time updates
      this.broadcastVitalSigns(vitalSigns);

      return {
        success: true,
        data: vitalSigns,
        alerts: alerts.length > 0 ? alerts : null,
        emergency: isEmergency
      };
    } catch (error) {
      throw new Error(`Failed to record vital signs: ${error.message}`);
    }
  }

  // Process and validate measurements
  processMeasurements(measurements) {
    const processed = {};
    const timestamp = new Date();

    Object.keys(measurements).forEach(key => {
      if (measurements[key] !== undefined && measurements[key] !== null) {
        processed[key] = {
          ...measurements[key],
          timestamp: measurements[key].timestamp || timestamp
        };
      }
    });

    return processed;
  }

  // Check vital signs against alert thresholds
  checkVitalSignsAlerts(measurements) {
    const alerts = [];

    // Heart rate alerts
    if (measurements.heartRate?.value) {
      const hr = measurements.heartRate.value;
      if (hr < this.alertThresholds.heartRate.critical.min || hr > this.alertThresholds.heartRate.critical.max) {
        alerts.push({
          type: 'critical',
          parameter: 'heartRate',
          value: hr,
          threshold: hr < this.alertThresholds.heartRate.critical.min ?
            this.alertThresholds.heartRate.critical.min : this.alertThresholds.heartRate.critical.max,
          message: `Critical heart rate: ${hr} bpm`,
          severity: 'critical'
        });
      } else if (hr < this.alertThresholds.heartRate.min || hr > this.alertThresholds.heartRate.max) {
        alerts.push({
          type: 'warning',
          parameter: 'heartRate',
          value: hr,
          threshold: hr < this.alertThresholds.heartRate.min ?
            this.alertThresholds.heartRate.min : this.alertThresholds.heartRate.max,
          message: `Abnormal heart rate: ${hr} bpm`,
          severity: 'medium'
        });
      }
    }

    // Blood pressure alerts
    if (measurements.bloodPressure?.systolic && measurements.bloodPressure?.diastolic) {
      const sys = measurements.bloodPressure.systolic;
      const dia = measurements.bloodPressure.diastolic;

      if (sys < this.alertThresholds.bloodPressure.systolic.critical.min ||
          sys > this.alertThresholds.bloodPressure.systolic.critical.max ||
          dia < this.alertThresholds.bloodPressure.diastolic.critical.min ||
          dia > this.alertThresholds.bloodPressure.diastolic.critical.max) {
        alerts.push({
          type: 'critical',
          parameter: 'bloodPressure',
          value: `${sys}/${dia}`,
          message: `Critical blood pressure: ${sys}/${dia} mmHg`,
          severity: 'critical'
        });
      }
    }

    // Temperature alerts
    if (measurements.temperature?.value) {
      const temp = measurements.temperature.value;
      if (temp < this.alertThresholds.temperature.critical.min || temp > this.alertThresholds.temperature.critical.max) {
        alerts.push({
          type: 'critical',
          parameter: 'temperature',
          value: temp,
          threshold: temp < this.alertThresholds.temperature.critical.min ?
            this.alertThresholds.temperature.critical.min : this.alertThresholds.temperature.critical.max,
          message: `Critical temperature: ${temp}°C`,
          severity: 'critical'
        });
      } else if (temp < this.alertThresholds.temperature.min || temp > this.alertThresholds.temperature.max) {
        alerts.push({
          type: 'warning',
          parameter: 'temperature',
          value: temp,
          message: `Abnormal temperature: ${temp}°C`,
          severity: 'medium'
        });
      }
    }

    // Oxygen saturation alerts
    if (measurements.oxygenSaturation?.value) {
      const spo2 = measurements.oxygenSaturation.value;
      if (spo2 < this.alertThresholds.oxygenSaturation.critical.min) {
        alerts.push({
          type: 'critical',
          parameter: 'oxygenSaturation',
          value: spo2,
          threshold: this.alertThresholds.oxygenSaturation.critical.min,
          message: `Critical oxygen saturation: ${spo2}%`,
          severity: 'critical'
        });
      } else if (spo2 < this.alertThresholds.oxygenSaturation.min) {
        alerts.push({
          type: 'warning',
          parameter: 'oxygenSaturation',
          value: spo2,
          message: `Low oxygen saturation: ${spo2}%`,
          severity: 'medium'
        });
      }
    }

    return alerts;
  }

  // Calculate trends based on historical data
  async calculateTrends(patientId, currentMeasurements) {
    try {
      // Get recent vital signs (last 24 hours)
      const recentVitals = await VitalSigns.find({
        patient: patientId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(10);

      const trends = {
        overallStatus: 'good'
      };

      if (recentVitals.length > 2) {
        // Calculate heart rate variability
        const heartRates = recentVitals
          .map(v => v.measurements.heartRate?.value)
          .filter(hr => hr !== undefined);

        if (heartRates.length > 1) {
          const hrVariability = this.calculateVariability(heartRates);
          trends.heartRateVariability = hrVariability;
        }

        // Calculate blood pressure trend
        const bpReadings = recentVitals
          .map(v => v.measurements.bloodPressure)
          .filter(bp => bp?.systolic && bp?.diastolic);

        if (bpReadings.length > 1) {
          trends.bloodPressureTrend = this.calculateBPTrend(bpReadings);
        }

        // Calculate temperature trend
        const tempReadings = recentVitals
          .map(v => v.measurements.temperature?.value)
          .filter(temp => temp !== undefined);

        if (tempReadings.length > 1) {
          trends.temperatureTrend = this.calculateTempTrend(tempReadings);
        }

        // Determine overall status
        trends.overallStatus = this.determineOverallStatus(recentVitals, currentMeasurements);
      }

      return trends;
    } catch (error) {
      console.error('Error calculating trends:', error);
      return { overallStatus: 'unknown' };
    }
  }

  // Calculate variability for a series of values
  calculateVariability(values) {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  // Calculate blood pressure trend
  calculateBPTrend(bpReadings) {
    if (bpReadings.length < 2) return 'unknown';

    const recent = bpReadings.slice(0, 3);
    const older = bpReadings.slice(-3);

    const recentAvgSys = recent.reduce((sum, bp) => sum + bp.systolic, 0) / recent.length;
    const olderAvgSys = older.reduce((sum, bp) => sum + bp.systolic, 0) / older.length;

    const difference = recentAvgSys - olderAvgSys;

    if (difference > 10) return 'worsening';
    if (difference < -10) return 'improving';
    return 'stable';
  }

  // Calculate temperature trend
  calculateTempTrend(tempReadings) {
    if (tempReadings.length < 2) return 'unknown';

    const recent = tempReadings.slice(0, 3);
    const older = tempReadings.slice(-3);

    const recentAvg = recent.reduce((sum, temp) => sum + temp, 0) / recent.length;
    const olderAvg = older.reduce((sum, temp) => sum + temp, 0) / older.length;

    const difference = recentAvg - olderAvg;

    if (difference > 0.5) return 'worsening';
    if (difference < -0.5) return 'improving';
    return 'stable';
  }

  // Determine overall patient status
  determineOverallStatus(recentVitals, currentMeasurements) {
    // Check for any critical alerts in recent vitals
    const hasCriticalAlerts = recentVitals.some(vital =>
      vital.alerts.some(alert => alert.severity === 'critical')
    );

    if (hasCriticalAlerts) return 'critical';

    // Check for concerning trends
    const hasWarningAlerts = recentVitals.some(vital =>
      vital.alerts.some(alert => alert.severity === 'medium' || alert.severity === 'high')
    );

    if (hasWarningAlerts) return 'concerning';

    // Check current measurements
    const currentAlerts = this.checkVitalSignsAlerts(currentMeasurements);
    if (currentAlerts.some(alert => alert.severity === 'critical')) return 'critical';
    if (currentAlerts.length > 0) return 'concerning';

    return 'good';
  }

  // Update device status
  async updateDeviceStatus(deviceId, measurements) {
    try {
      await Device.findOneAndUpdate(
        { deviceId },
        {
          'connectivity.lastConnected': new Date(),
          'connectivity.isOnline': true,
          'usage.lastReading': new Date(),
          $inc: { 'usage.totalReadings': 1 }
        }
      );
    } catch (error) {
      console.error('Error updating device status:', error);
    }
  }

  // Trigger emergency alert
  async triggerEmergencyAlert(vitalSigns, alerts) {
    try {
      const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');

      const emergencyAlert = new EmergencyAlert({
        alertId: `EMRG-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        patient: vitalSigns.patient,
        alertType: 'vital_signs',
        severity: 'critical',
        priority: 'immediate',
        vitalSigns: vitalSigns._id,
        description: `Critical vital signs detected: ${criticalAlerts.map(a => a.message).join(', ')}`,
        location: vitalSigns.location,
        timeline: [{
          timestamp: new Date(),
          event: 'Alert triggered by vital signs monitoring',
          details: `Critical values: ${criticalAlerts.map(a => `${a.parameter}: ${a.value}`).join(', ')}`,
          automated: true
        }]
      });

      await emergencyAlert.save();

      // Mark vital signs as emergency contacted
      vitalSigns.emergencyContacted = true;
      await vitalSigns.save();

      // Broadcast emergency alert
      this.broadcastEmergencyAlert(emergencyAlert);

      return emergencyAlert;
    } catch (error) {
      console.error('Error triggering emergency alert:', error);
    }
  }

  // Get patient vital signs history
  async getPatientVitalSigns(patientId, options = {}) {
    try {
      const {
        startDate,
        endDate,
        parameter,
        limit = 50,
        page = 1
      } = options;

      const query = { patient: patientId };

      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
      }

      const skip = (page - 1) * limit;

      const vitalSigns = await VitalSigns.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('patient', 'userId medicalRecordNumber')
        .populate({
          path: 'patient',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        });

      const total = await VitalSigns.countDocuments(query);

      // Extract specific parameter data if requested
      let parameterData = null;
      if (parameter && vitalSigns.length > 0) {
        parameterData = vitalSigns.map(vs => ({
          timestamp: vs.createdAt,
          value: vs.measurements[parameter]?.value,
          unit: vs.measurements[parameter]?.unit
        })).filter(data => data.value !== undefined);
      }

      return {
        success: true,
        data: vitalSigns,
        parameterData,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get vital signs: ${error.message}`);
    }
  }

  // Get real-time patient dashboard
  async getPatientDashboard(patientId) {
    try {
      // Get latest vital signs
      const latestVitals = await VitalSigns.findOne({ patient: patientId })
        .sort({ createdAt: -1 })
        .populate('patient', 'userId medicalRecordNumber');

      // Get active devices
      const devices = await Device.find({
        patient: patientId,
        status: 'active'
      });

      // Get recent alerts
      const recentAlerts = await VitalSigns.find({
        patient: patientId,
        'alerts.0': { $exists: true },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).sort({ createdAt: -1 }).limit(10);

      // Get active emergency alerts
      const activeEmergencies = await EmergencyAlert.find({
        patient: patientId,
        status: { $in: ['active', 'acknowledged', 'responding'] }
      }).sort({ createdAt: -1 });

      // Calculate summary statistics
      const last24Hours = await VitalSigns.find({
        patient: patientId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      const summary = this.calculateSummaryStats(last24Hours);

      return {
        success: true,
        data: {
          patient: latestVitals?.patient,
          latestVitals: latestVitals?.measurements,
          lastUpdated: latestVitals?.createdAt,
          overallStatus: latestVitals?.trends?.overallStatus || 'unknown',
          devices: devices.map(device => ({
            deviceId: device.deviceId,
            type: device.deviceType,
            status: device.status,
            batteryLevel: device.connectivity.batteryLevel,
            isOnline: device.connectivity.isOnline,
            lastConnected: device.connectivity.lastConnected
          })),
          recentAlerts: recentAlerts.flatMap(vs => vs.alerts),
          activeEmergencies,
          summary
        }
      };
    } catch (error) {
      throw new Error(`Failed to get patient dashboard: ${error.message}`);
    }
  }

  // Calculate summary statistics
  calculateSummaryStats(vitalSigns) {
    if (vitalSigns.length === 0) return {};

    const stats = {};

    // Heart rate stats
    const heartRates = vitalSigns
      .map(vs => vs.measurements.heartRate?.value)
      .filter(hr => hr !== undefined);

    if (heartRates.length > 0) {
      stats.heartRate = {
        current: heartRates[0],
        average: Math.round(heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length),
        min: Math.min(...heartRates),
        max: Math.max(...heartRates),
        readings: heartRates.length
      };
    }

    // Blood pressure stats
    const bpReadings = vitalSigns
      .map(vs => vs.measurements.bloodPressure)
      .filter(bp => bp?.systolic && bp?.diastolic);

    if (bpReadings.length > 0) {
      stats.bloodPressure = {
        current: `${bpReadings[0].systolic}/${bpReadings[0].diastolic}`,
        averageSystolic: Math.round(bpReadings.reduce((sum, bp) => sum + bp.systolic, 0) / bpReadings.length),
        averageDiastolic: Math.round(bpReadings.reduce((sum, bp) => sum + bp.diastolic, 0) / bpReadings.length),
        readings: bpReadings.length
      };
    }

    // Temperature stats
    const temperatures = vitalSigns
      .map(vs => vs.measurements.temperature?.value)
      .filter(temp => temp !== undefined);

    if (temperatures.length > 0) {
      stats.temperature = {
        current: temperatures[0],
        average: (temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length).toFixed(1),
        min: Math.min(...temperatures),
        max: Math.max(...temperatures),
        readings: temperatures.length
      };
    }

    return stats;
  }

  // Broadcast vital signs to connected clients
  broadcastVitalSigns(vitalSigns) {
    // This would integrate with Socket.IO to send real-time updates
    const io = require('../index').io;
    if (io) {
      io.to(`patient-${vitalSigns.patient}`).emit('vital-signs-update', {
        patientId: vitalSigns.patient,
        vitalSigns: vitalSigns.measurements,
        alerts: vitalSigns.alerts,
        timestamp: vitalSigns.createdAt,
        overallStatus: vitalSigns.trends?.overallStatus
      });
    }
  }

  // Broadcast emergency alert
  broadcastEmergencyAlert(emergencyAlert) {
    // This would integrate with Socket.IO to send emergency alerts
    const io = require('../index').io;
    if (io) {
      // Broadcast to all healthcare providers
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
}

module.exports = new PatientMonitoringService();
