const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointmentService');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         appointmentId:
 *           type: string
 *         patient:
 *           type: string
 *         provider:
 *           type: string
 *         scheduledDateTime:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: number
 *         type:
 *           type: string
 *           enum: [video_consultation, phone_consultation, in_person, follow_up, emergency]
 *         status:
 *           type: string
 *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *         reason:
 *           type: string
 *         symptoms:
 *           type: array
 *           items:
 *             type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 */

/**
 * @swagger
 * /api/appointments:
 *   post:
 *     summary: Create a new appointment
 *     description: Schedule a new appointment with a healthcare provider
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
 *               - providerId
 *               - scheduledDateTime
 *               - type
 *               - reason
 *             properties:
 *               patientId:
 *                 type: string
 *               providerId:
 *                 type: string
 *               scheduledDateTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [video_consultation, phone_consultation, in_person, follow_up, emergency]
 *               reason:
 *                 type: string
 *               symptoms:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *     responses:
 *       201:
 *         description: Appointment created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const appointment = await appointmentService.createAppointment(req.body);
    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Appointment created successfully'
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
 * /api/appointments/patient/{patientId}:
 *   get:
 *     summary: Get appointments for a patient
 *     description: Retrieve all appointments for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Patient appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Patient not found
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 10, page = 1 } = req.query;
    
    const result = await appointmentService.getPatientAppointments(
      patientId, 
      status, 
      parseInt(limit), 
      parseInt(page)
    );
    
    res.json({
      success: true,
      data: result.appointments,
      pagination: result.pagination
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
 * /api/appointments/provider/{providerId}:
 *   get:
 *     summary: Get appointments for a provider
 *     description: Retrieve all appointments for a specific healthcare provider
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *     responses:
 *       200:
 *         description: Provider appointments retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Provider not found
 */
router.get('/provider/:providerId', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date, status } = req.query;
    
    const appointments = await appointmentService.getProviderAppointments(providerId, date, status);
    
    res.json({
      success: true,
      data: appointments
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
 * /api/appointments/{appointmentId}/status:
 *   put:
 *     summary: Update appointment status
 *     description: Update the status of an existing appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
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
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [scheduled, confirmed, in_progress, completed, cancelled, no_show]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment status updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 */
router.put('/:appointmentId/status', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;
    
    const appointment = await appointmentService.updateAppointmentStatus(appointmentId, status, notes);
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment status updated successfully'
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
 * /api/appointments/{appointmentId}/cancel:
 *   put:
 *     summary: Cancel an appointment
 *     description: Cancel an existing appointment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appointmentId
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
 *               - cancelledBy
 *               - reason
 *             properties:
 *               cancelledBy:
 *                 type: string
 *                 enum: [patient, provider, admin]
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment cancelled successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Appointment not found
 */
router.put('/:appointmentId/cancel', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { cancelledBy, reason } = req.body;
    
    const appointment = await appointmentService.cancelAppointment(appointmentId, cancelledBy, reason);
    
    res.json({
      success: true,
      data: appointment,
      message: 'Appointment cancelled successfully'
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
 * /api/appointments/availability/{providerId}:
 *   get:
 *     summary: Get available time slots for a provider
 *     description: Retrieve available appointment slots for a specific provider on a given date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: duration
 *         schema:
 *           type: integer
 *           default: 30
 *     responses:
 *       200:
 *         description: Available time slots retrieved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Provider not found
 */
router.get('/availability/:providerId', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date, duration = 30 } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required'
      });
    }
    
    const availableSlots = await appointmentService.getAvailableTimeSlots(
      providerId, 
      date, 
      parseInt(duration)
    );
    
    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
