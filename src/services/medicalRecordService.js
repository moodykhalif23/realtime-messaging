const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Provider = require('../models/Provider');
const { v4: uuidv4 } = require('uuid');

class MedicalRecordService {
  // Create a new medical record
  async createMedicalRecord(recordData) {
    try {
      const {
        patientId,
        providerId,
        appointmentId,
        recordType,
        chiefComplaint,
        historyOfPresentIllness,
        physicalExamination,
        diagnosis,
        treatmentPlan,
        labResults,
        notes,
        isConfidential = false
      } = recordData;

      // Validate patient and provider exist
      const patient = await Patient.findById(patientId);
      const provider = await Provider.findById(providerId);

      if (!patient || !provider) {
        throw new Error('Patient or Provider not found');
      }

      const medicalRecord = new MedicalRecord({
        recordId: uuidv4(),
        patient: patientId,
        provider: providerId,
        appointment: appointmentId,
        recordType,
        chiefComplaint,
        historyOfPresentIllness,
        physicalExamination,
        diagnosis: diagnosis || [],
        treatmentPlan,
        labResults: labResults || [],
        notes,
        isConfidential,
        accessLog: [{
          accessedBy: providerId,
          accessedAt: new Date(),
          action: 'create',
          ipAddress: '127.0.0.1' // In practice, get from request
        }]
      });

      await medicalRecord.save();
      return medicalRecord;
    } catch (error) {
      throw new Error(`Failed to create medical record: ${error.message}`);
    }
  }

  // Get medical records for a patient
  async getPatientMedicalRecords(patientId, accessedBy, limit = 10, page = 1, recordType = null) {
    try {
      // Verify access permissions
      await this.verifyAccessPermission(patientId, accessedBy);

      const query = { patient: patientId };
      if (recordType) {
        query.recordType = recordType;
      }

      const skip = (page - 1) * limit;

      const records = await MedicalRecord.find(query)
        .populate('provider', 'userId specializations')
        .populate({
          path: 'provider',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        })
        .populate('appointment', 'appointmentId scheduledDateTime type')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await MedicalRecord.countDocuments(query);

      // Log access
      await this.logAccess(records.map(r => r._id), accessedBy, 'view');

      return {
        records,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to get patient medical records: ${error.message}`);
    }
  }

  // Get a specific medical record
  async getMedicalRecord(recordId, accessedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId })
        .populate('patient', 'userId medicalRecordNumber')
        .populate({
          path: 'patient',
          populate: {
            path: 'userId',
            select: 'firstName lastName dateOfBirth'
          }
        })
        .populate('provider', 'userId specializations')
        .populate({
          path: 'provider',
          populate: {
            path: 'userId',
            select: 'firstName lastName'
          }
        })
        .populate('appointment');

      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient._id, accessedBy);

      // Log access
      await this.logAccess([record._id], accessedBy, 'view');

      return record;
    } catch (error) {
      throw new Error(`Failed to get medical record: ${error.message}`);
    }
  }

  // Update a medical record
  async updateMedicalRecord(recordId, updateData, updatedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId });
      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient, updatedBy);

      // Update fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          record[key] = updateData[key];
        }
      });

      await record.save();

      // Log access
      await this.logAccess([record._id], updatedBy, 'edit');

      return record;
    } catch (error) {
      throw new Error(`Failed to update medical record: ${error.message}`);
    }
  }

  // Add diagnosis to medical record
  async addDiagnosis(recordId, diagnosisData, addedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId });
      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient, addedBy);

      record.diagnosis.push(diagnosisData);
      await record.save();

      // Log access
      await this.logAccess([record._id], addedBy, 'edit');

      return record;
    } catch (error) {
      throw new Error(`Failed to add diagnosis: ${error.message}`);
    }
  }

  // Add lab results to medical record
  async addLabResults(recordId, labResultsData, addedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId });
      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient, addedBy);

      if (Array.isArray(labResultsData)) {
        record.labResults.push(...labResultsData);
      } else {
        record.labResults.push(labResultsData);
      }

      await record.save();

      // Log access
      await this.logAccess([record._id], addedBy, 'edit');

      return record;
    } catch (error) {
      throw new Error(`Failed to add lab results: ${error.message}`);
    }
  }

  // Add attachment to medical record
  async addAttachment(recordId, attachmentData, addedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId });
      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient, addedBy);

      const attachment = {
        ...attachmentData,
        uploadedAt: new Date()
      };

      record.attachments.push(attachment);
      await record.save();

      // Log access
      await this.logAccess([record._id], addedBy, 'edit');

      return record;
    } catch (error) {
      throw new Error(`Failed to add attachment: ${error.message}`);
    }
  }

  // Get medical summary for a patient
  async getPatientMedicalSummary(patientId, accessedBy) {
    try {
      // Verify access permissions
      await this.verifyAccessPermission(patientId, accessedBy);

      const patient = await Patient.findById(patientId)
        .populate('userId', 'firstName lastName dateOfBirth gender')
        .populate('primaryCareProvider');

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get recent records
      const recentRecords = await MedicalRecord.find({ patient: patientId })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('provider', 'userId specializations');

      // Get active diagnoses
      const activeDiagnoses = await MedicalRecord.aggregate([
        { $match: { patient: patientId } },
        { $unwind: '$diagnosis' },
        { $match: { 'diagnosis.status': { $in: ['active', 'chronic'] } } },
        { $group: { _id: '$diagnosis.description', latest: { $max: '$createdAt' } } },
        { $sort: { latest: -1 } }
      ]);

      // Get current medications
      const currentMedications = patient.medications.filter(med => med.isActive);

      // Get recent lab results
      const recentLabResults = await MedicalRecord.aggregate([
        { $match: { patient: patientId } },
        { $unwind: '$labResults' },
        { $sort: { 'labResults.resultDate': -1 } },
        { $limit: 10 }
      ]);

      // Log access
      await this.logAccess(recentRecords.map(r => r._id), accessedBy, 'view');

      return {
        patient: {
          id: patient._id,
          name: `${patient.userId.firstName} ${patient.userId.lastName}`,
          dateOfBirth: patient.userId.dateOfBirth,
          gender: patient.userId.gender,
          medicalRecordNumber: patient.medicalRecordNumber,
          bloodType: patient.bloodType,
          allergies: patient.allergies,
          primaryCareProvider: patient.primaryCareProvider
        },
        summary: {
          totalRecords: await MedicalRecord.countDocuments({ patient: patientId }),
          activeDiagnoses: activeDiagnoses.length,
          currentMedications: currentMedications.length,
          lastVisit: recentRecords.length > 0 ? recentRecords[0].createdAt : null
        },
        recentRecords,
        activeDiagnoses,
        currentMedications,
        recentLabResults: recentLabResults.map(r => r.labResults)
      };
    } catch (error) {
      throw new Error(`Failed to get patient medical summary: ${error.message}`);
    }
  }

  // Search medical records
  async searchMedicalRecords(searchParams, accessedBy) {
    try {
      const {
        patientId,
        providerId,
        recordType,
        diagnosisKeyword,
        dateFrom,
        dateTo,
        limit = 10,
        page = 1
      } = searchParams;

      let query = {};

      if (patientId) {
        // Verify access permissions for specific patient
        await this.verifyAccessPermission(patientId, accessedBy);
        query.patient = patientId;
      }

      if (providerId) {
        query.provider = providerId;
      }

      if (recordType) {
        query.recordType = recordType;
      }

      if (diagnosisKeyword) {
        query['diagnosis.description'] = { $regex: diagnosisKeyword, $options: 'i' };
      }

      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      const skip = (page - 1) * limit;

      const records = await MedicalRecord.find(query)
        .populate('patient', 'userId medicalRecordNumber')
        .populate('provider', 'userId specializations')
        .populate({
          path: 'patient',
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .populate({
          path: 'provider',
          populate: { path: 'userId', select: 'firstName lastName' }
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      const total = await MedicalRecord.countDocuments(query);

      // Log access
      await this.logAccess(records.map(r => r._id), accessedBy, 'view');

      return {
        records,
        pagination: {
          current: page,
          total: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      throw new Error(`Failed to search medical records: ${error.message}`);
    }
  }

  // Verify access permission
  async verifyAccessPermission(patientId, accessedBy) {
    // In a real implementation, this would check:
    // 1. If accessedBy is the patient themselves
    // 2. If accessedBy is an authorized provider
    // 3. If accessedBy has been granted access by the patient
    // 4. Emergency access scenarios
    
    // For now, we'll implement basic checks
    const patient = await Patient.findById(patientId);
    if (!patient) {
      throw new Error('Patient not found');
    }

    // Allow access if it's the patient themselves
    if (patient.userId.toString() === accessedBy.toString()) {
      return true;
    }

    // Allow access if it's their primary care provider
    if (patient.primaryCareProvider && patient.primaryCareProvider.toString() === accessedBy.toString()) {
      return true;
    }

    // For now, allow all provider access (in practice, this would be more restrictive)
    const provider = await Provider.findOne({ userId: accessedBy });
    if (provider) {
      return true;
    }

    throw new Error('Access denied: Insufficient permissions');
  }

  // Log access to medical records
  async logAccess(recordIds, accessedBy, action, ipAddress = '127.0.0.1') {
    try {
      const accessLog = {
        accessedBy,
        accessedAt: new Date(),
        action,
        ipAddress
      };

      await MedicalRecord.updateMany(
        { _id: { $in: recordIds } },
        { $push: { accessLog: accessLog } }
      );
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  }

  // Get access log for a medical record
  async getAccessLog(recordId, requestedBy) {
    try {
      const record = await MedicalRecord.findOne({ recordId })
        .populate('accessLog.accessedBy', 'firstName lastName role');

      if (!record) {
        throw new Error('Medical record not found');
      }

      // Verify access permissions
      await this.verifyAccessPermission(record.patient, requestedBy);

      return record.accessLog.sort((a, b) => b.accessedAt - a.accessedAt);
    } catch (error) {
      throw new Error(`Failed to get access log: ${error.message}`);
    }
  }
}

module.exports = new MedicalRecordService();
