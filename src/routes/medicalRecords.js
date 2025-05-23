const express = require('express');
const router = express.Router();
const medicalRecordService = require('../services/medicalRecordService');
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/medical-records/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     MedicalRecord:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *         patient:
 *           type: string
 *         provider:
 *           type: string
 *         appointment:
 *           type: string
 *         recordType:
 *           type: string
 *           enum: [consultation, diagnosis, treatment, lab_result, imaging, prescription, vaccination]
 *         chiefComplaint:
 *           type: string
 *         diagnosis:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               primary:
 *                 type: boolean
 *               icdCode:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe]
 *               status:
 *                 type: string
 *                 enum: [active, resolved, chronic, suspected]
 */

/**
 * @swagger
 * /api/medical-records:
 *   post:
 *     summary: Create a new medical record
 *     description: Create a new medical record for a patient
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
 *               - recordType
 *             properties:
 *               patientId:
 *                 type: string
 *               providerId:
 *                 type: string
 *               appointmentId:
 *                 type: string
 *               recordType:
 *                 type: string
 *                 enum: [consultation, diagnosis, treatment, lab_result, imaging, prescription, vaccination]
 *               chiefComplaint:
 *                 type: string
 *               historyOfPresentIllness:
 *                 type: string
 *               physicalExamination:
 *                 type: object
 *               diagnosis:
 *                 type: array
 *                 items:
 *                   type: object
 *               treatmentPlan:
 *                 type: object
 *               notes:
 *                 type: string
 *               isConfidential:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Medical record created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const medicalRecord = await medicalRecordService.createMedicalRecord(req.body);
    
    res.status(201).json({
      success: true,
      data: medicalRecord,
      message: 'Medical record created successfully'
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
 * /api/medical-records/patient/{patientId}:
 *   get:
 *     summary: Get medical records for a patient
 *     description: Retrieve all medical records for a specific patient
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: recordType
 *         schema:
 *           type: string
 *           enum: [consultation, diagnosis, treatment, lab_result, imaging, prescription, vaccination]
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
 *         description: Medical records retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { recordType, limit = 10, page = 1 } = req.query;
    const accessedBy = req.user.id;
    
    const result = await medicalRecordService.getPatientMedicalRecords(
      patientId,
      accessedBy,
      parseInt(limit),
      parseInt(page),
      recordType
    );
    
    res.json({
      success: true,
      data: result.records,
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
 * /api/medical-records/{recordId}:
 *   get:
 *     summary: Get a specific medical record
 *     description: Retrieve a specific medical record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Medical record retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Medical record not found
 */
router.get('/:recordId', authenticateToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const accessedBy = req.user.id;
    
    const record = await medicalRecordService.getMedicalRecord(recordId, accessedBy);
    
    res.json({
      success: true,
      data: record
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
 * /api/medical-records/{recordId}:
 *   put:
 *     summary: Update a medical record
 *     description: Update an existing medical record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               chiefComplaint:
 *                 type: string
 *               historyOfPresentIllness:
 *                 type: string
 *               physicalExamination:
 *                 type: object
 *               treatmentPlan:
 *                 type: object
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Medical record updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Medical record not found
 */
router.put('/:recordId', authenticateToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const updatedBy = req.user.id;
    
    const record = await medicalRecordService.updateMedicalRecord(recordId, req.body, updatedBy);
    
    res.json({
      success: true,
      data: record,
      message: 'Medical record updated successfully'
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
 * /api/medical-records/{recordId}/diagnosis:
 *   post:
 *     summary: Add diagnosis to medical record
 *     description: Add a new diagnosis to an existing medical record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               - description
 *             properties:
 *               primary:
 *                 type: boolean
 *               icdCode:
 *                 type: string
 *               description:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [mild, moderate, severe]
 *               status:
 *                 type: string
 *                 enum: [active, resolved, chronic, suspected]
 *     responses:
 *       200:
 *         description: Diagnosis added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Medical record not found
 */
router.post('/:recordId/diagnosis', authenticateToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const addedBy = req.user.id;
    
    const record = await medicalRecordService.addDiagnosis(recordId, req.body, addedBy);
    
    res.json({
      success: true,
      data: record,
      message: 'Diagnosis added successfully'
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
 * /api/medical-records/{recordId}/lab-results:
 *   post:
 *     summary: Add lab results to medical record
 *     description: Add lab results to an existing medical record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
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
 *               - testName
 *               - result
 *             properties:
 *               testName:
 *                 type: string
 *               result:
 *                 type: string
 *               normalRange:
 *                 type: string
 *               unit:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [normal, abnormal, critical]
 *               orderedDate:
 *                 type: string
 *                 format: date
 *               resultDate:
 *                 type: string
 *                 format: date
 *               labName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Lab results added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Medical record not found
 */
router.post('/:recordId/lab-results', authenticateToken, async (req, res) => {
  try {
    const { recordId } = req.params;
    const addedBy = req.user.id;
    
    const record = await medicalRecordService.addLabResults(recordId, req.body, addedBy);
    
    res.json({
      success: true,
      data: record,
      message: 'Lab results added successfully'
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
 * /api/medical-records/{recordId}/attachments:
 *   post:
 *     summary: Add attachment to medical record
 *     description: Upload and attach a file to a medical record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attachment added successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Medical record not found
 */
router.post('/:recordId/attachments', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { recordId } = req.params;
    const { description } = req.body;
    const addedBy = req.user.id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const attachmentData = {
      fileName: req.file.originalname,
      fileUrl: req.file.path,
      fileType: req.file.mimetype,
      description
    };
    
    const record = await medicalRecordService.addAttachment(recordId, attachmentData, addedBy);
    
    res.json({
      success: true,
      data: record,
      message: 'Attachment added successfully'
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
 * /api/medical-records/summary/{patientId}:
 *   get:
 *     summary: Get patient medical summary
 *     description: Get a comprehensive medical summary for a patient
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
 *         description: Medical summary retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Patient not found
 */
router.get('/summary/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const accessedBy = req.user.id;
    
    const summary = await medicalRecordService.getPatientMedicalSummary(patientId, accessedBy);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
