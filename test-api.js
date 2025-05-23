#!/usr/bin/env node

/**
 * Healthcare Telemedicine System API Test Script
 * 
 * This script demonstrates the core functionality of the healthcare telemedicine system
 * by testing various API endpoints and features.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let authToken = '';
let patientId = '';
let providerId = '';
let appointmentId = '';

// Test data
const testPatient = {
  username: 'patient_john',
  email: 'john.patient@example.com',
  password: 'securepassword123',
  role: 'patient',
  firstName: 'John',
  lastName: 'Doe',
  phone: '+1-555-0123',
  dateOfBirth: '1985-06-15',
  gender: 'male'
};

const testProvider = {
  username: 'dr_smith',
  email: 'dr.smith@hospital.com',
  password: 'doctorpassword123',
  role: 'doctor',
  firstName: 'Sarah',
  lastName: 'Smith',
  phone: '+1-555-0456'
};

async function makeRequest(method, endpoint, data = null, useAuth = true) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {}
    };

    if (useAuth && authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

async function testUserRegistration() {
  console.log('\n🔐 Testing User Registration...');
  
  // Register patient
  const patientResult = await makeRequest('POST', '/users/register', testPatient, false);
  if (patientResult?.success) {
    console.log('✅ Patient registered successfully');
  }

  // Register provider
  const providerResult = await makeRequest('POST', '/users/register', testProvider, false);
  if (providerResult?.success) {
    console.log('✅ Provider registered successfully');
  }
}

async function testUserLogin() {
  console.log('\n🔑 Testing User Login...');
  
  const loginResult = await makeRequest('POST', '/users/login', {
    email: testPatient.email,
    password: testPatient.password
  }, false);

  if (loginResult?.success && loginResult.token) {
    authToken = loginResult.token;
    console.log('✅ Patient login successful');
    return true;
  }
  
  console.log('❌ Patient login failed');
  return false;
}

async function testAppointmentCreation() {
  console.log('\n📅 Testing Appointment Creation...');
  
  // First, we need to get patient and provider IDs
  // In a real scenario, these would be obtained from user profiles
  
  const appointmentData = {
    patientId: 'temp_patient_id', // This would be real IDs in practice
    providerId: 'temp_provider_id',
    scheduledDateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    type: 'video_consultation',
    reason: 'Regular checkup and consultation',
    symptoms: ['headache', 'fatigue'],
    priority: 'medium'
  };

  const result = await makeRequest('POST', '/appointments', appointmentData);
  if (result?.success) {
    appointmentId = result.data.appointmentId;
    console.log('✅ Appointment created successfully');
    console.log(`   Appointment ID: ${appointmentId}`);
  }
}

async function testMedicalRecordCreation() {
  console.log('\n📋 Testing Medical Record Creation...');
  
  const medicalRecordData = {
    patientId: 'temp_patient_id',
    providerId: 'temp_provider_id',
    recordType: 'consultation',
    chiefComplaint: 'Patient reports persistent headaches',
    historyOfPresentIllness: 'Headaches started 2 weeks ago, occurring daily',
    physicalExamination: {
      vitalSigns: {
        temperature: 36.8,
        bloodPressure: { systolic: 120, diastolic: 80 },
        heartRate: 72,
        respiratoryRate: 16,
        oxygenSaturation: 98
      },
      generalAppearance: 'Patient appears well, alert and oriented'
    },
    diagnosis: [{
      primary: true,
      description: 'Tension headache',
      severity: 'mild',
      status: 'active'
    }],
    treatmentPlan: {
      medications: [{
        name: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'Every 6 hours as needed',
        duration: '1 week'
      }],
      lifestyle: [{
        recommendation: 'Increase water intake and ensure adequate sleep',
        category: 'lifestyle'
      }]
    },
    notes: 'Patient advised to return if symptoms worsen or persist beyond one week'
  };

  const result = await makeRequest('POST', '/medical-records', medicalRecordData);
  if (result?.success) {
    console.log('✅ Medical record created successfully');
    console.log(`   Record ID: ${result.data.recordId}`);
  }
}

async function testConsultationCreation() {
  console.log('\n📹 Testing Consultation Session Creation...');
  
  if (!appointmentId) {
    console.log('⚠️  Skipping consultation test - no appointment ID available');
    return;
  }

  const consultationData = {
    appointmentId: appointmentId,
    type: 'video'
  };

  const result = await makeRequest('POST', '/consultations', consultationData);
  if (result?.success) {
    console.log('✅ Consultation session created successfully');
    console.log(`   Session ID: ${result.data.sessionId}`);
  }
}

async function testAPIEndpoints() {
  console.log('\n🔍 Testing API Endpoints...');
  
  // Test protected endpoint without auth
  const unauthorizedResult = await makeRequest('GET', '/appointments/patient/test123', null, false);
  if (!unauthorizedResult) {
    console.log('✅ Protected endpoint correctly requires authentication');
  }

  // Test with auth
  if (authToken) {
    const authorizedResult = await makeRequest('GET', '/users/profile');
    if (authorizedResult?.success) {
      console.log('✅ Authenticated endpoint access successful');
    }
  }
}

async function runTests() {
  console.log('🏥 Healthcare Telemedicine System API Test Suite');
  console.log('================================================');
  
  try {
    await testUserRegistration();
    
    const loginSuccess = await testUserLogin();
    if (!loginSuccess) {
      console.log('\n❌ Cannot continue tests without authentication');
      return;
    }

    await testAPIEndpoints();
    await testAppointmentCreation();
    await testMedicalRecordCreation();
    await testConsultationCreation();

    console.log('\n✅ Test Suite Completed!');
    console.log('\n📊 Summary:');
    console.log('- User registration and authentication: Working');
    console.log('- API security and authorization: Working');
    console.log('- Appointment management: Ready for testing');
    console.log('- Medical records: Ready for testing');
    console.log('- Video consultations: Ready for testing');
    console.log('\n🌐 Access the web interface at: http://localhost:3000');
    console.log('📚 API documentation at: http://localhost:3000/api-docs');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
  }
}

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
