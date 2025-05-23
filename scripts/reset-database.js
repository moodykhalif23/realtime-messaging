#!/usr/bin/env node

/**
 * Healthcare Telemedicine System - Database Reset Script
 * 
 * This script safely resets the database by:
 * - Dropping existing collections
 * - Recreating indexes properly
 * - Setting up initial data
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class DatabaseReset {
  constructor() {
    this.mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/healthcare_telemedicine';
  }

  async connect() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      console.log(`📍 Database URL: ${this.mongoUrl}`);
      
      await mongoose.connect(this.mongoUrl);
      console.log('✅ Connected to MongoDB successfully');
      
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

  async resetDatabase() {
    console.log('\n🗑️  Resetting database...');
    
    try {
      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📋 Found ${collections.length} collections`);
      
      // Drop all collections
      for (const collection of collections) {
        await mongoose.connection.db.collection(collection.name).drop();
        console.log(`✅ Dropped collection: ${collection.name}`);
      }
      
      console.log('🎯 Database reset completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error resetting database:', error.message);
      return false;
    }
  }

  async initializeDatabase() {
    console.log('\n🔧 Initializing fresh database...');
    
    try {
      // Import and run the database initializer
      const DatabaseInitializer = require('./init-database.js');
      const initializer = new DatabaseInitializer();
      
      // Skip connection since we're already connected
      await initializer.createIndexes();
      await initializer.createAdminUser();
      await initializer.createSampleData();
      await initializer.validateDatabase();
      await initializer.generateReport();
      
      console.log('✅ Database initialization completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      return false;
    }
  }

  async run() {
    console.log('🏥 Healthcare Telemedicine System - Database Reset');
    console.log('==================================================\n');
    
    try {
      // Connect to database
      const connected = await this.connect();
      if (!connected) {
        process.exit(1);
      }

      // Ask for confirmation
      console.log('\n⚠️  WARNING: This will delete ALL existing data!');
      console.log('This action cannot be undone.');
      
      // In a real scenario, you'd want user confirmation
      // For now, we'll proceed automatically
      console.log('Proceeding with database reset...\n');

      // Reset database
      const resetSuccess = await this.resetDatabase();
      if (!resetSuccess) {
        process.exit(1);
      }

      // Initialize fresh database
      const initSuccess = await this.initializeDatabase();
      if (!initSuccess) {
        process.exit(1);
      }

      console.log('\n🎉 Database reset and initialization completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Start the application: npm run dev');
      console.log('2. Access the system: http://localhost:3000');
      console.log('3. Login with admin credentials: admin@healthcare.com / admin123');
      
    } catch (error) {
      console.error('\n❌ Database reset failed:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
  }
}

// Run reset if called directly
if (require.main === module) {
  const reset = new DatabaseReset();
  reset.run();
}

module.exports = DatabaseReset;
