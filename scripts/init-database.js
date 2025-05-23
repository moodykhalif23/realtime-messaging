#!/usr/bin/env node

/**
 * Healthcare Telemedicine System - Database Initialization Script
 *
 * This script initializes the MongoDB database with:
 * - Required indexes for performance
 * - Sample admin user
 * - Database structure validation
 * - Initial configuration
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models
const User = require('../src/models/User');
const Patient = require('../src/models/Patient');
const Provider = require('../src/models/Provider');
const Appointment = require('../src/models/Appointment');
const MedicalRecord = require('../src/models/MedicalRecord');
const Consultation = require('../src/models/Consultation');

class DatabaseInitializer {
  constructor() {
    this.mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/healthcare_telemedicine';
  }

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 Database URL: ${this.mongoUrl.replace(/\/\/.*@/, '//***:***@')}`);

      await mongoose.connect(this.mongoUrl);
      console.log('✅ Connected to MongoDB successfully');

      // Log database info
      const dbName = mongoose.connection.name;
      const host = mongoose.connection.host;
      const port = mongoose.connection.port;
      console.log(`📊 Database: ${dbName} on ${host}:${port}`);

      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      return false;
    }
  }

  async createIndexes() {
    console.log('\n📈 Creating database indexes...');

    try {
      // User indexes
      await User.createIndexes();
      console.log('✅ User indexes created');

      // Patient indexes
      await Patient.createIndexes();
      console.log('✅ Patient indexes created');

      // Provider indexes
      await Provider.createIndexes();
      console.log('✅ Provider indexes created');

      // Appointment indexes
      await Appointment.createIndexes();
      console.log('✅ Appointment indexes created');

      // Medical Record indexes
      await MedicalRecord.createIndexes();
      console.log('✅ Medical Record indexes created');

      // Consultation indexes
      await Consultation.createIndexes();
      console.log('✅ Consultation indexes created');

      // Additional performance indexes
      await this.createCustomIndexes();

      console.log('🎯 All database indexes created successfully');
    } catch (error) {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }

  async createCustomIndexes() {
    console.log('🔧 Creating custom performance indexes...');

    // Compound indexes for common queries
    await User.collection.createIndex({ email: 1, isActive: 1 });
    await User.collection.createIndex({ role: 1, isActive: 1 });

    await Appointment.collection.createIndex({
      provider: 1,
      scheduledDateTime: 1,
      status: 1
    });

    await Appointment.collection.createIndex({
      patient: 1,
      scheduledDateTime: -1
    });

    await MedicalRecord.collection.createIndex({
      patient: 1,
      createdAt: -1
    });

    await MedicalRecord.collection.createIndex({
      provider: 1,
      recordType: 1
    });

    await Consultation.collection.createIndex({
      appointment: 1,
      status: 1
    });

    console.log('✅ Custom indexes created');
  }

  async createAdminUser() {
    console.log('\n👤 Setting up admin user...');

    try {
      // Check if admin user already exists
      const existingAdmin = await User.findOne({
        $or: [
          { email: 'admin@healthcare.com' },
          { username: 'admin' },
          { role: 'admin' }
        ]
      });

      if (existingAdmin) {
        console.log('ℹ️  Admin user already exists');
        console.log(`   Email: ${existingAdmin.email}`);
        console.log(`   Username: ${existingAdmin.username}`);
        return existingAdmin;
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const adminUser = new User({
        username: 'admin',
        email: 'admin@healthcare.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+15550000000',
        isActive: true,
        address: {
          street: 'Healthcare System HQ',
          city: 'Medical City',
          state: 'HC',
          zipCode: '12345',
          country: 'USA'
        }
      });

      await adminUser.save();

      console.log('✅ Admin user created successfully');
      console.log('📧 Email: admin@healthcare.com');
      console.log('🔑 Password: admin123');
      console.log('⚠️  Please change the default password after first login');

      return adminUser;
    } catch (error) {
      console.error('❌ Error creating admin user:', error.message);
      throw error;
    }
  }

  async createSampleData() {
    console.log('\n📝 Creating sample data...');

    try {
      // Check if sample data already exists
      const userCount = await User.countDocuments();
      if (userCount > 1) { // More than just admin
        console.log('ℹ️  Sample data already exists');
        return;
      }

      // Create sample doctor
      const doctorPassword = await bcrypt.hash('doctor123', 10);
      const sampleDoctor = new User({
        username: 'dr_smith',
        email: 'dr.smith@healthcare.com',
        password: doctorPassword,
        role: 'doctor',
        firstName: 'Sarah',
        lastName: 'Smith',
        phone: '+15550001111',
        isActive: true
      });
      await sampleDoctor.save();

      // Create provider profile for doctor
      const doctorProvider = new Provider({
        userId: sampleDoctor._id,
        licenseNumber: 'MD-2023-001',
        specializations: ['General Medicine', 'Internal Medicine'],
        credentials: ['MD', 'FACP'],
        experience: 10,
        isVerified: true,
        isAcceptingNewPatients: true,
        consultationFee: 150,
        bio: 'Experienced general practitioner with 10+ years in internal medicine.',
        availability: {
          monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
          tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
          wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
          thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
          friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' }
        }
      });
      await doctorProvider.save();

      // Create sample patient
      const patientPassword = await bcrypt.hash('patient123', 10);
      const samplePatient = new User({
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: patientPassword,
        role: 'patient',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+15550002222',
        dateOfBirth: new Date('1985-06-15'),
        gender: 'male',
        isActive: true
      });
      await samplePatient.save();

      // Create patient profile
      const patientProfile = new Patient({
        userId: samplePatient._id,
        medicalRecordNumber: 'MRN-2023-001',
        bloodType: 'O+',
        primaryCareProvider: doctorProvider._id,
        allergies: [
          { allergen: 'Penicillin', severity: 'moderate', reaction: 'Rash' }
        ],
        medicalHistory: [
          {
            condition: 'Hypertension',
            diagnosedDate: new Date('2020-03-15'),
            status: 'active',
            notes: 'Well controlled with medication'
          }
        ]
      });
      await patientProfile.save();

      console.log('✅ Sample data created:');
      console.log('   👨‍⚕️ Doctor: dr.smith@healthcare.com / doctor123');
      console.log('   👤 Patient: john.doe@example.com / patient123');

    } catch (error) {
      console.error('❌ Error creating sample data:', error.message);
      throw error;
    }
  }

  async validateDatabase() {
    console.log('\n🔍 Validating database structure...');

    try {
      // Check collections exist
      const collections = await mongoose.connection.db.listCollections().toArray();
      const collectionNames = collections.map(c => c.name);

      const expectedCollections = [
        'users', 'patients', 'providers', 'appointments',
        'medicalrecords', 'consultations'
      ];

      console.log('📋 Collections found:', collectionNames.join(', '));

      // Validate each collection has data
      const stats = {};
      for (const collection of expectedCollections) {
        if (collectionNames.includes(collection)) {
          const count = await mongoose.connection.db.collection(collection).countDocuments();
          stats[collection] = count;
        }
      }

      console.log('📊 Document counts:');
      Object.entries(stats).forEach(([collection, count]) => {
        console.log(`   ${collection}: ${count} documents`);
      });

      // Test basic queries
      const userCount = await User.countDocuments();
      const adminCount = await User.countDocuments({ role: 'admin' });

      console.log(`✅ Database validation successful`);
      console.log(`   Total users: ${userCount}`);
      console.log(`   Admin users: ${adminCount}`);

    } catch (error) {
      console.error('❌ Database validation failed:', error.message);
      throw error;
    }
  }

  async generateReport() {
    console.log('\n📋 Database Initialization Report');
    console.log('=====================================');

    try {
      const dbStats = await mongoose.connection.db.stats();

      console.log(`Database Name: ${mongoose.connection.name}`);
      console.log(`Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`Collections: ${dbStats.collections}`);
      console.log(`Data Size: ${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`);
      console.log(`Index Size: ${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`);

      // User statistics
      const userStats = await User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]);

      console.log('\nUser Statistics:');
      userStats.forEach(stat => {
        console.log(`  ${stat._id}: ${stat.count} users`);
      });

      console.log('\n🎉 Database is ready for the Healthcare Telemedicine System!');
      console.log('\nNext steps:');
      console.log('1. Start the application: npm run dev');
      console.log('2. Access the system: http://localhost:3000');
      console.log('3. Login with admin credentials to configure the system');

    } catch (error) {
      console.error('❌ Error generating report:', error.message);
    }
  }

  async initialize() {
    console.log('🏥 Healthcare Telemedicine System - Database Initialization');
    console.log('===========================================================\n');

    try {
      // Connect to database
      const connected = await this.connect();
      if (!connected) {
        process.exit(1);
      }

      // Create indexes
      await this.createIndexes();

      // Create admin user
      await this.createAdminUser();

      // Create sample data
      await this.createSampleData();

      // Validate database
      await this.validateDatabase();

      // Generate report
      await this.generateReport();

      console.log('\n✅ Database initialization completed successfully!');

    } catch (error) {
      console.error('\n❌ Database initialization failed:', error.message);
      console.error('\nTroubleshooting tips:');
      console.error('1. Ensure MongoDB is running');
      console.error('2. Check your MONGO_URL in .env file');
      console.error('3. Verify database permissions');
      console.error('4. Check network connectivity');

      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run initialization if called directly
if (require.main === module) {
  const initializer = new DatabaseInitializer();
  initializer.initialize();
}

module.exports = DatabaseInitializer;
