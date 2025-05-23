const express = require('express');
const router = express.Router();
const consultationService = require('../services/consultationService');
const authenticateToken = require('../middleware/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     Consultation:
 *       type: object
 *       properties:
 *         sessionId:
 *           type: string
 *         appointment:
 *           type: string
 *         patient:
 *           type: string
 *         provider:
 *           type: string
 *         type:
 *           type: string
 *           enum: [video, audio, chat]
 *         status:
 *           type: string
 *           enum: [waiting, active, ended, cancelled]
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         duration:
 *           type: number
 */

/**
 * @swagger
 * /api/consultations:
 *   post:
 *     summary: Create a new consultation session
 *     description: Create a new video/audio consultation session for an appointment
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [video, audio, chat]
 *                 default: video
 *     responses:
 *       201:
 *         description: Consultation session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Consultation'
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { appointmentId, type = 'video' } = req.body;
    
    const consultation = await consultationService.createConsultationSession(appointmentId, type);
    
    res.status(201).json({
      success: true,
      data: consultation,
      message: 'Consultation session created successfully'
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
 * /api/consultations/{sessionId}/join:
 *   post:
 *     summary: Join a consultation session
 *     description: Join an existing consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
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
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [patient, provider, observer]
 *     responses:
 *       200:
 *         description: Successfully joined consultation session
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to join this session
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/join', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { role } = req.body;
    const userId = req.user.id;
    
    const result = await consultationService.joinConsultationSession(sessionId, userId, role);
    
    res.json({
      success: true,
      data: result,
      message: 'Successfully joined consultation session'
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
 * /api/consultations/{sessionId}/leave:
 *   post:
 *     summary: Leave a consultation session
 *     description: Leave an active consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully left consultation session
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/leave', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const consultation = await consultationService.leaveConsultationSession(sessionId, userId);
    
    res.json({
      success: true,
      data: consultation,
      message: 'Successfully left consultation session'
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
 * /api/consultations/{sessionId}/chat:
 *   post:
 *     summary: Send a chat message
 *     description: Send a chat message during a consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
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
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               messageType:
 *                 type: string
 *                 enum: [text, file, image, system]
 *                 default: text
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     fileName:
 *                       type: string
 *                     fileUrl:
 *                       type: string
 *                     fileType:
 *                       type: string
 *                     fileSize:
 *                       type: number
 *     responses:
 *       200:
 *         description: Chat message sent successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/chat', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, messageType = 'text', attachments = [] } = req.body;
    const senderId = req.user.id;
    
    const chatMessage = await consultationService.sendChatMessage(
      sessionId, 
      senderId, 
      message, 
      messageType, 
      attachments
    );
    
    res.json({
      success: true,
      data: chatMessage,
      message: 'Chat message sent successfully'
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
 * /api/consultations/{sessionId}/screen-share/start:
 *   post:
 *     summary: Start screen sharing
 *     description: Start screen sharing during a consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
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
 *               purpose:
 *                 type: string
 *                 description: Purpose of screen sharing
 *     responses:
 *       200:
 *         description: Screen sharing started successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/screen-share/start', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { purpose } = req.body;
    const userId = req.user.id;
    
    const screenShare = await consultationService.startScreenSharing(sessionId, userId, purpose);
    
    res.json({
      success: true,
      data: screenShare,
      message: 'Screen sharing started successfully'
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
 * /api/consultations/{sessionId}/screen-share/stop:
 *   post:
 *     summary: Stop screen sharing
 *     description: Stop screen sharing during a consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Screen sharing stopped successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/screen-share/stop', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const screenShare = await consultationService.stopScreenSharing(sessionId, userId);
    
    res.json({
      success: true,
      data: screenShare,
      message: 'Screen sharing stopped successfully'
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
 * /api/consultations/{sessionId}/recording/start:
 *   post:
 *     summary: Start recording
 *     description: Start recording a consultation session (provider only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording started successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to start recording
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/recording/start', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const recording = await consultationService.startRecording(sessionId, userId);
    
    res.json({
      success: true,
      data: recording,
      message: 'Recording started successfully'
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
 * /api/consultations/{sessionId}/recording/stop:
 *   post:
 *     summary: Stop recording
 *     description: Stop recording a consultation session
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording stopped successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Consultation session not found
 */
router.post('/:sessionId/recording/stop', authenticateToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;
    
    const recording = await consultationService.stopRecording(sessionId, userId);
    
    res.json({
      success: true,
      data: recording,
      message: 'Recording stopped successfully'
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
 * /api/consultations/history:
 *   get:
 *     summary: Get consultation history
 *     description: Retrieve consultation history for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Consultation history retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    const userId = req.user.id;
    const role = req.user.role;
    
    const result = await consultationService.getConsultationHistory(
      userId, 
      role, 
      parseInt(limit), 
      parseInt(page)
    );
    
    res.json({
      success: true,
      data: result.consultations,
      pagination: result.pagination
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
