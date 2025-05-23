#!/usr/bin/env node

/**
 * Healthcare Telemedicine System - MongoDB Setup Wizard
 * 
 * This interactive script helps you set up MongoDB for the healthcare system:
 * - Detects existing MongoDB installations
 * - Guides through configuration options
 * - Tests connections
 * - Initializes the database
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class MongoDBSetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    this.config = {
      mongoUrl: '',
      setupType: '',
      credentials: {}
    };
  }

  // Utility method to ask questions
  async ask(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  // Display welcome message
  displayWelcome() {
    console.log('\n🏥 Healthcare Telemedicine System');
    console.log('📊 MongoDB Setup Wizard');
    console.log('========================\n');
    console.log('This wizard will help you set up MongoDB for your healthcare system.\n');
  }

  // Check if MongoDB is already running locally
  async checkLocalMongoDB() {
    return new Promise((resolve) => {
      const mongoose = require('mongoose');
      
      mongoose.connect('mongodb://localhost:27017/test', {
        serverSelectionTimeoutMS: 3000,
        connectTimeoutMS: 3000
      }).then(() => {
        mongoose.disconnect();
        resolve(true);
      }).catch(() => {
        resolve(false);
      });
    });
  }

  // Check if mongosh is available
  async checkMongoShell() {
    return new Promise((resolve) => {
      const child = spawn('mongosh', ['--version'], { stdio: 'ignore' });
      child.on('close', (code) => {
        resolve(code === 0);
      });
      child.on('error', () => {
        resolve(false);
      });
    });
  }

  // Detect MongoDB installation
  async detectMongoDB() {
    console.log('🔍 Detecting MongoDB installation...\n');
    
    const localRunning = await this.checkLocalMongoDB();
    const mongoShellAvailable = await this.checkMongoShell();
    
    console.log(`Local MongoDB running: ${localRunning ? '✅ Yes' : '❌ No'}`);
    console.log(`MongoDB Shell available: ${mongoShellAvailable ? '✅ Yes' : '❌ No'}\n`);
    
    return { localRunning, mongoShellAvailable };
  }

  // Setup type selection
  async selectSetupType(detection) {
    console.log('📋 Setup Options:\n');
    console.log('1. Use Local MongoDB (recommended for development)');
    console.log('2. Use MongoDB Atlas (cloud, recommended for production)');
    console.log('3. Use Docker MongoDB');
    console.log('4. Custom MongoDB URL\n');
    
    if (detection.localRunning) {
      console.log('💡 Local MongoDB detected and running!\n');
    }
    
    const choice = await this.ask('Select setup type (1-4): ');
    
    switch (choice) {
      case '1':
        return await this.setupLocal(detection);
      case '2':
        return await this.setupAtlas();
      case '3':
        return await this.setupDocker();
      case '4':
        return await this.setupCustom();
      default:
        console.log('❌ Invalid choice. Please try again.\n');
        return await this.selectSetupType(detection);
    }
  }

  // Setup local MongoDB
  async setupLocal(detection) {
    console.log('\n🏠 Setting up Local MongoDB\n');
    
    if (!detection.localRunning) {
      console.log('❌ Local MongoDB is not running.');
      console.log('\nTo start MongoDB:');
      console.log('Windows: net start MongoDB');
      console.log('macOS: brew services start mongodb-community');
      console.log('Linux: sudo systemctl start mongod\n');
      
      const proceed = await this.ask('Start MongoDB and press Enter to continue, or type "skip" to choose another option: ');
      if (proceed.toLowerCase() === 'skip') {
        return await this.selectSetupType(detection);
      }
      
      // Check again
      const stillRunning = await this.checkLocalMongoDB();
      if (!stillRunning) {
        console.log('❌ MongoDB is still not accessible. Please start MongoDB first.\n');
        return await this.selectSetupType(detection);
      }
    }
    
    this.config.setupType = 'local';
    this.config.mongoUrl = 'mongodb://localhost:27017/healthcare_telemedicine';
    
    console.log('✅ Local MongoDB configuration ready!');
    return true;
  }

  // Setup MongoDB Atlas
  async setupAtlas() {
    console.log('\n☁️  Setting up MongoDB Atlas\n');
    console.log('Please provide your MongoDB Atlas connection details:\n');
    
    const username = await this.ask('Username: ');
    const password = await this.ask('Password: ');
    const cluster = await this.ask('Cluster URL (e.g., cluster0.xxxxx.mongodb.net): ');
    
    this.config.setupType = 'atlas';
    this.config.mongoUrl = `mongodb+srv://${username}:${password}@${cluster}/healthcare_telemedicine?retryWrites=true&w=majority`;
    this.config.credentials = { username, password, cluster };
    
    console.log('\n✅ MongoDB Atlas configuration ready!');
    return true;
  }

  // Setup Docker MongoDB
  async setupDocker() {
    console.log('\n🐳 Setting up Docker MongoDB\n');
    
    const username = await this.ask('MongoDB username (default: admin): ') || 'admin';
    const password = await this.ask('MongoDB password (default: healthcare123): ') || 'healthcare123';
    const port = await this.ask('Port (default: 27017): ') || '27017';
    
    console.log('\nDocker command to run MongoDB:');
    console.log(`docker run -d \\`);
    console.log(`  --name healthcare-mongodb \\`);
    console.log(`  -p ${port}:27017 \\`);
    console.log(`  -e MONGO_INITDB_ROOT_USERNAME=${username} \\`);
    console.log(`  -e MONGO_INITDB_ROOT_PASSWORD=${password} \\`);
    console.log(`  -v mongodb_data:/data/db \\`);
    console.log(`  mongo:latest\n`);
    
    const runNow = await this.ask('Run this Docker command now? (y/n): ');
    
    if (runNow.toLowerCase() === 'y') {
      console.log('🚀 Starting MongoDB Docker container...');
      // Here you could actually run the Docker command
      console.log('✅ Docker container started (simulated)');
    }
    
    this.config.setupType = 'docker';
    this.config.mongoUrl = `mongodb://${username}:${password}@localhost:${port}/healthcare_telemedicine?authSource=admin`;
    this.config.credentials = { username, password, port };
    
    console.log('✅ Docker MongoDB configuration ready!');
    return true;
  }

  // Setup custom MongoDB URL
  async setupCustom() {
    console.log('\n⚙️  Custom MongoDB Setup\n');
    
    const mongoUrl = await this.ask('Enter your MongoDB connection URL: ');
    
    this.config.setupType = 'custom';
    this.config.mongoUrl = mongoUrl;
    
    console.log('✅ Custom MongoDB configuration ready!');
    return true;
  }

  // Test MongoDB connection
  async testConnection() {
    console.log('\n🔌 Testing MongoDB connection...\n');
    
    try {
      const mongoose = require('mongoose');
      
      console.log('Connecting to:', this.config.mongoUrl.replace(/\/\/.*@/, '//***:***@'));
      
      await mongoose.connect(this.config.mongoUrl, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });
      
      // Test basic operations
      await mongoose.connection.db.admin().ping();
      
      const dbStats = await mongoose.connection.db.stats();
      
      console.log('✅ Connection successful!');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🏠 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      console.log(`📁 Collections: ${dbStats.collections}`);
      
      await mongoose.disconnect();
      return true;
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      
      const retry = await this.ask('\nWould you like to try a different configuration? (y/n): ');
      if (retry.toLowerCase() === 'y') {
        return false;
      } else {
        throw new Error('MongoDB connection failed');
      }
    }
  }

  // Update .env file
  async updateEnvFile() {
    console.log('\n📝 Updating .env file...\n');
    
    const envPath = path.join(__dirname, '../.env');
    let envContent = '';
    
    // Read existing .env file if it exists
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else {
      // Copy from .env.example if it exists
      const examplePath = path.join(__dirname, '../.env.example');
      if (fs.existsSync(examplePath)) {
        envContent = fs.readFileSync(examplePath, 'utf8');
      }
    }
    
    // Update MONGO_URL
    if (envContent.includes('MONGO_URL=')) {
      envContent = envContent.replace(/MONGO_URL=.*/, `MONGO_URL=${this.config.mongoUrl}`);
    } else {
      envContent += `\nMONGO_URL=${this.config.mongoUrl}\n`;
    }
    
    // Ensure other required variables exist
    const requiredVars = {
      'PORT': '3000',
      'JWT_SECRET': 'your_super_secure_jwt_secret_key_here'
    };
    
    Object.entries(requiredVars).forEach(([key, defaultValue]) => {
      if (!envContent.includes(`${key}=`)) {
        envContent += `${key}=${defaultValue}\n`;
      }
    });
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ .env file updated successfully!');
  }

  // Initialize database
  async initializeDatabase() {
    console.log('\n🗄️  Initializing database...\n');
    
    const initScript = path.join(__dirname, 'init-database.js');
    
    if (!fs.existsSync(initScript)) {
      console.log('❌ Database initialization script not found');
      return false;
    }
    
    const runInit = await this.ask('Run database initialization? (y/n): ');
    
    if (runInit.toLowerCase() === 'y') {
      try {
        const DatabaseInitializer = require('./init-database.js');
        const initializer = new DatabaseInitializer();
        await initializer.initialize();
        console.log('✅ Database initialized successfully!');
        return true;
      } catch (error) {
        console.log('❌ Database initialization failed:', error.message);
        return false;
      }
    }
    
    return true;
  }

  // Display final instructions
  displayFinalInstructions() {
    console.log('\n🎉 MongoDB Setup Complete!\n');
    console.log('Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Open your browser: http://localhost:3000');
    console.log('3. Check system health: node scripts/health-check.js');
    console.log('4. View API docs: http://localhost:3000/api-docs\n');
    
    if (this.config.setupType === 'atlas') {
      console.log('📋 MongoDB Atlas Notes:');
      console.log('- Ensure your IP address is whitelisted');
      console.log('- Check network access settings in Atlas dashboard');
      console.log('- Verify database user permissions\n');
    }
    
    if (this.config.setupType === 'local') {
      console.log('📋 Local MongoDB Notes:');
      console.log('- MongoDB must be running for the application to work');
      console.log('- Consider setting up automated backups');
      console.log('- Enable authentication for production use\n');
    }
    
    console.log('📚 Documentation:');
    console.log('- Setup Guide: MONGODB_SETUP_GUIDE.md');
    console.log('- Demo Guide: demo-guide.md');
    console.log('- Implementation Summary: IMPLEMENTATION_SUMMARY.md\n');
  }

  // Main setup process
  async run() {
    try {
      this.displayWelcome();
      
      const detection = await this.detectMongoDB();
      
      let setupSuccess = false;
      while (!setupSuccess) {
        await this.selectSetupType(detection);
        setupSuccess = await this.testConnection();
      }
      
      await this.updateEnvFile();
      await this.initializeDatabase();
      
      this.displayFinalInstructions();
      
    } catch (error) {
      console.log('\n❌ Setup failed:', error.message);
      console.log('\nFor manual setup, please refer to MONGODB_SETUP_GUIDE.md');
    } finally {
      this.rl.close();
    }
  }
}

// Run setup wizard if called directly
if (require.main === module) {
  const wizard = new MongoDBSetupWizard();
  wizard.run();
}

module.exports = MongoDBSetupWizard;
