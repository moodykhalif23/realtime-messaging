const express = require('express');
const router = express.Router();
const emergencyResponseService = require('../services/emergencyResponseService');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     EmergencyAlert:
 *       type: object
 *       properties:
 *         alertId:
 *           type: string
 *         patient:
 *           type: string
 *         alertType:
 *           type: string
 *           enum: [manual, vital_signs, fall_detection, medication_missed, panic_button, device_malfunction, no_response, geofence_breach]
 *         severity:
 *           type: string
 *           enum: [low, medium, high, critical]
 *         priority:
 *           type: string
 *           enum: [routine, urgent, emergent, immediate]
 *         status:
 *           type: string
 *           enum: [active, acknowledged, responding, resolved, false_alarm]
 *         description:
 *           type: string
 *         location:
 *           type: object
 *           properties:
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             address:
 *               type: string
 */

/**
 * @swagger
 * /api/emergency/alerts:
 *   post:
 *     summary: Create emergency alert
 *     description: Create a new emergency alert for a patient
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
 *               - alertType
 *               - severity
 *               - priority
 *               - description
 *             properties:
 *               patientId:
 *                 type: string
 *               alertType:
 *                 type: string
 *                 enum: [manual, vital_signs, fall_detection, medication_missed, panic_button, device_malfunction, no_response, geofence_breach]
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *               priority:
 *                 type: string
 *                 enum: [routine, urgent, emergent, immediate]
 *               description:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     symptom:
 *                       type: string
 *                     severity:
 *                       type: string
 *                       enum: [mild, moderate, severe]
 *                     duration:
 *                       type: string
 *               patientCondition:
 *                 type: object
 *                 properties:
 *                   consciousness:
 *                     type: string
 *                     enum: [alert, drowsy, confused, unconscious, unknown]
 *                   breathing:
 *                     type: string
 *                     enum: [normal, labored, shallow, absent, unknown]
 *                   mobility:
 *                     type: string
 *                     enum: [mobile, limited, immobile, unknown]
 *     responses:
 *       201:
 *         description: Emergency alert created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/alerts', authenticateToken, async (req, res) => {
  try {
    const alertData = {
      ...req.body,
      triggeredBy: req.user.id
    };
    
    const result = await emergencyResponseService.createEmergencyAlert(alertData);
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
 * /api/emergency/alerts/active:
 *   get:
 *     summary: Get active emergency alerts
 *     description: Retrieve all active emergency alerts with optional filtering
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [low, medium, high, critical]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [routine, urgent, emergent, immediate]
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Active alerts retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/alerts/active', authenticateToken, async (req, res) => {
  try {
    const filters = {
      severity: req.query.severity,
      priority: req.query.priority,
      assignedTo: req.query.assignedTo
    };

    const result = await emergencyResponseService.getActiveAlerts(filters);
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
 * /api/emergency/alerts/{alertId}/acknowledge:
 *   put:
 *     summary: Acknowledge emergency alert
 *     description: Acknowledge an emergency alert and provide response details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
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
 *               response:
 *                 type: string
 *               estimatedArrival:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Alert acknowledged successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.put('/alerts/:alertId/acknowledge', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { response } = req.body;
    
    const result = await emergencyResponseService.acknowledgeAlert(alertId, req.user.id, response);
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
 * /api/emergency/alerts/{alertId}/resolve:
 *   put:
 *     summary: Resolve emergency alert
 *     description: Mark an emergency alert as resolved with outcome details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outcome
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [patient_stable, transported_hospital, treated_on_scene, false_alarm, patient_refused_care, resolved_remotely]
 *               hospitalTransport:
 *                 type: object
 *                 properties:
 *                   required:
 *                     type: boolean
 *                   hospital:
 *                     type: string
 *                   ambulanceId:
 *                     type: string
 *                   departureTime:
 *                     type: string
 *                     format: date-time
 *                   arrivalTime:
 *                     type: string
 *                     format: date-time
 *               followUpRequired:
 *                 type: boolean
 *               followUpInstructions:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Alert resolved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.put('/alerts/:alertId/resolve', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const resolution = req.body;
    
    const result = await emergencyResponseService.resolveAlert(alertId, req.user.id, resolution);
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
 * /api/emergency/alerts/{alertId}:
 *   get:
 *     summary: Get emergency alert details
 *     description: Get detailed information about a specific emergency alert
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Alert details retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Alert not found
 */
router.get('/alerts/:alertId', authenticateToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    const EmergencyAlert = require('../models/EmergencyAlert');
    
    const alert = await EmergencyAlert.findOne({ alertId })
      .populate('patient', 'userId medicalRecordNumber')
      .populate({
        path: 'patient',
        populate: {
          path: 'userId',
          select: 'firstName lastName phone'
        }
      })
      .populate('triggeredBy', 'firstName lastName role')
      .populate('response.assignedTo', 'firstName lastName role')
      .populate('response.acknowledgedBy.user', 'firstName lastName role')
      .populate('response.responseTeam.member', 'firstName lastName role')
      .populate('resolution.resolvedBy', 'firstName lastName role');

    if (!alert) {
      return res.status(404).json({
        success: false,
        error: 'Emergency alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
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
 * /api/emergency/panic-button:
 *   post:
 *     summary: Trigger panic button
 *     description: Immediately trigger a critical emergency alert (panic button)
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
 *             properties:
 *               patientId:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               description:
 *                 type: string
 *                 default: "Emergency panic button activated"
 *     responses:
 *       201:
 *         description: Panic button alert created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/panic-button', authenticateToken, async (req, res) => {
  try {
    const alertData = {
      patientId: req.body.patientId,
      triggeredBy: req.user.id,
      alertType: 'panic_button',
      severity: 'critical',
      priority: 'immediate',
      description: req.body.description || 'Emergency panic button activated',
      location: req.body.location
    };
    
    const result = await emergencyResponseService.createEmergencyAlert(alertData);
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
 * /api/emergency/fall-detection:
 *   post:
 *     summary: Report fall detection
 *     description: Report a fall detected by monitoring devices
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
 *             properties:
 *               patientId:
 *                 type: string
 *               deviceId:
 *                 type: string
 *               location:
 *                 type: object
 *                 properties:
 *                   latitude:
 *                     type: number
 *                   longitude:
 *                     type: number
 *                   address:
 *                     type: string
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Confidence level of fall detection (0-1)
 *               impactForce:
 *                 type: number
 *                 description: Measured impact force in G's
 *     responses:
 *       201:
 *         description: Fall detection alert created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/fall-detection', authenticateToken, async (req, res) => {
  try {
    const { patientId, deviceId, location, confidence, impactForce } = req.body;
    
    const severity = confidence > 0.8 ? 'critical' : 'high';
    const priority = confidence > 0.8 ? 'immediate' : 'urgent';
    
    const alertData = {
      patientId,
      triggeredBy: req.user.id,
      alertType: 'fall_detection',
      severity,
      priority,
      description: `Fall detected by device ${deviceId}. Confidence: ${(confidence * 100).toFixed(1)}%${impactForce ? `, Impact: ${impactForce}G` : ''}`,
      location
    };
    
    const result = await emergencyResponseService.createEmergencyAlert(alertData);
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
 * /api/emergency/alerts/patient/{patientId}:
 *   get:
 *     summary: Get patient emergency history
 *     description: Get emergency alert history for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Patient emergency history retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/alerts/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { limit = 20, page = 1 } = req.query;
    
    const EmergencyAlert = require('../models/EmergencyAlert');
    
    const skip = (page - 1) * limit;
    
    const alerts = await EmergencyAlert.find({ patient: patientId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('triggeredBy', 'firstName lastName role')
      .populate('response.assignedTo', 'firstName lastName role');

    const total = await EmergencyAlert.countDocuments({ patient: patientId });

    res.json({
      success: true,
      data: alerts,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
