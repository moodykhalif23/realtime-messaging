const express = require('express');
const router = express.Router();
const patientMonitoringService = require('../services/patientMonitoringService');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     VitalSigns:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *         patient:
 *           type: string
 *         deviceId:
 *           type: string
 *         measurements:
 *           type: object
 *           properties:
 *             heartRate:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *                   default: bpm
 *             bloodPressure:
 *               type: object
 *               properties:
 *                 systolic:
 *                   type: number
 *                 diastolic:
 *                   type: number
 *                 unit:
 *                   type: string
 *                   default: mmHg
 *             temperature:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *                   default: celsius
 *             oxygenSaturation:
 *               type: object
 *               properties:
 *                 value:
 *                   type: number
 *                 unit:
 *                   type: string
 *                   default: '%'
 */

/**
 * @swagger
 * /api/monitoring/vital-signs:
 *   post:
 *     summary: Record patient vital signs
 *     description: Record vital signs from medical devices or manual input
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - deviceId
 *               - measurements
 *             properties:
 *               patientId:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [wearable, monitor, sensor, manual, smartphone]
 *               measurements:
 *                 type: object
 *                 properties:
 *                   heartRate:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: number
 *                   bloodPressure:
 *                     type: object
 *                     properties:
 *                       systolic:
 *                         type: number
 *                       diastolic:
 *                         type: number
 *                   temperature:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: number
 *                   oxygenSaturation:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: number
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *     responses:
 *       201:
 *         description: Vital signs recorded successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/vital-signs', authenticateToken, async (req, res) => {
  try {
    const result = await patientMonitoringService.recordVitalSigns(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/monitoring/patients/{patientId}/vital-signs:
 *   get:
 *     summary: Get patient vital signs history
 *     description: Retrieve vital signs history for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: parameter
 *         schema:
 *           type: string
 *           enum: [heartRate, bloodPressure, temperature, oxygenSaturation]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Vital signs history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/patients/:patientId/vital-signs', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const options = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      parameter: req.query.parameter,
      limit: parseInt(req.query.limit) || 50,
      page: parseInt(req.query.page) || 1
    };

    const result = await patientMonitoringService.getPatientVitalSigns(patientId, options);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/monitoring/patients/{patientId}/dashboard:
 *   get:
 *     summary: Get patient monitoring dashboard
 *     description: Get real-time patient monitoring dashboard with latest vitals, devices, and alerts
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient dashboard retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/patients/:patientId/dashboard', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await patientMonitoringService.getPatientDashboard(patientId);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/monitoring/devices:
 *   post:
 *     summary: Register a new monitoring device
 *     description: Register a new medical monitoring device for a patient
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - serialNumber
 *               - patientId
 *               - deviceType
 *             properties:
 *               deviceId:
 *                 type: string
 *               serialNumber:
 *                 type: string
 *               patientId:
 *                 type: string
 *               deviceType:
 *                 type: string
 *                 enum: [smartwatch, fitness_tracker, blood_pressure_monitor, glucose_meter, pulse_oximeter, thermometer, scale]
 *               manufacturer:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   model:
 *                     type: string
 *                   version:
 *                     type: string
 *               capabilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [heart_rate, blood_pressure, temperature, oxygen_saturation, blood_glucose, weight]
 *     responses:
 *       201:
 *         description: Device registered successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/devices', authenticateToken, async (req, res) => {
  try {
    const Device = require('../models/Device');
    const device = new Device(req.body);
    await device.save();
    
    res.status(201).json({
      success: true,
      data: device,
      message: 'Device registered successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/monitoring/devices/{deviceId}/status:
 *   put:
 *     summary: Update device status
 *     description: Update the status and connectivity information of a monitoring device
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive, maintenance, error, lost]
 *               batteryLevel:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               signalStrength:
 *                 type: number
 *               isOnline:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Device status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Device not found
 */
router.put('/devices/:deviceId/status', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const Device = require('../models/Device');
    
    const updateData = {};
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.batteryLevel !== undefined) updateData['connectivity.batteryLevel'] = req.body.batteryLevel;
    if (req.body.signalStrength !== undefined) updateData['connectivity.signalStrength'] = req.body.signalStrength;
    if (req.body.isOnline !== undefined) updateData['connectivity.isOnline'] = req.body.isOnline;
    
    updateData['connectivity.lastConnected'] = new Date();

    const device = await Device.findOneAndUpdate(
      { deviceId },
      updateData,
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found'
      });
    }

    res.json({
      success: true,
      data: device,
      message: 'Device status updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /api/monitoring/patients/{patientId}/devices:
 *   get:
 *     summary: Get patient devices
 *     description: Get all monitoring devices assigned to a patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Patient devices retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/patients/:patientId/devices', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const Device = require('../models/Device');
    
    const devices = await Device.find({ patient: patientId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: devices
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
