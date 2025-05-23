#!/usr/bin/env node

/**
 * Healthcare Telemedicine System - Health Check Script
 * 
 * This script performs comprehensive health checks on:
 * - MongoDB connection and performance
 * - Application server status
 * - Database integrity
 * - System resources
 * - API endpoints
 */

const mongoose = require('mongoose');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Import models for testing
const User = require('../src/models/User');
const Patient = require('../src/models/Patient');
const Provider = require('../src/models/Provider');

class HealthChecker {
  constructor() {
    this.mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/healthcare_telemedicine';
    this.serverUrl = `http://localhost:${process.env.PORT || 3000}`;
    this.results = {
      overall: 'unknown',
      checks: {},
      timestamp: new Date().toISOString(),
      duration: 0
    };
  }

  // Utility method to run a check and record results
  async runCheck(name, checkFunction) {
    const startTime = Date.now();
    console.log(`🔍 Checking ${name}...`);
    
    try {
      const result = await checkFunction();
      const duration = Date.now() - startTime;
      
      this.results.checks[name] = {
        status: 'pass',
        message: result.message || 'OK',
        duration: `${duration}ms`,
        details: result.details || {}
      };
      
      console.log(`✅ ${name}: PASS (${duration}ms)`);
      return true;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.checks[name] = {
        status: 'fail',
        message: error.message,
        duration: `${duration}ms`,
        error: error.stack
      };
      
      console.log(`❌ ${name}: FAIL (${duration}ms) - ${error.message}`);
      return false;
    }
  }

  // Check MongoDB connection
  async checkMongoDB() {
    return new Promise(async (resolve, reject) => {
      try {
        // Test connection
        await mongoose.connect(this.mongoUrl, { 
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000
        });
        
        // Test basic operations
        const startTime = Date.now();
        await mongoose.connection.db.admin().ping();
        const pingTime = Date.now() - startTime;
        
        // Get database stats
        const dbStats = await mongoose.connection.db.stats();
        const serverStatus = await mongoose.connection.db.admin().serverStatus();
        
        resolve({
          message: `Connected to MongoDB successfully`,
          details: {
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            database: mongoose.connection.name,
            pingTime: `${pingTime}ms`,
            collections: dbStats.collections,
            dataSize: `${(dbStats.dataSize / 1024 / 1024).toFixed(2)} MB`,
            indexSize: `${(dbStats.indexSize / 1024 / 1024).toFixed(2)} MB`,
            version: serverStatus.version,
            uptime: `${Math.floor(serverStatus.uptime / 3600)} hours`
          }
        });
      } catch (error) {
        reject(new Error(`MongoDB connection failed: ${error.message}`));
      } finally {
        if (mongoose.connection.readyState === 1) {
          await mongoose.disconnect();
        }
      }
    });
  }

  // Check database collections and data integrity
  async checkDatabaseIntegrity() {
    return new Promise(async (resolve, reject) => {
      try {
        await mongoose.connect(this.mongoUrl, { 
          serverSelectionTimeoutMS: 5000 
        });
        
        // Check required collections exist
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        const requiredCollections = [
          'users', 'patients', 'providers', 'appointments', 
          'medicalrecords', 'consultations'
        ];
        
        const missingCollections = requiredCollections.filter(
          name => !collectionNames.includes(name)
        );
        
        // Count documents in each collection
        const counts = {};
        for (const collection of requiredCollections) {
          if (collectionNames.includes(collection)) {
            counts[collection] = await mongoose.connection.db
              .collection(collection).countDocuments();
          }
        }
        
        // Check for admin user
        const adminExists = await User.findOne({ role: 'admin' });
        
        // Validate indexes
        const userIndexes = await User.collection.getIndexes();
        const indexCount = Object.keys(userIndexes).length;
        
        if (missingCollections.length > 0) {
          reject(new Error(`Missing collections: ${missingCollections.join(', ')}`));
          return;
        }
        
        resolve({
          message: 'Database integrity check passed',
          details: {
            collections: collectionNames.length,
            documentCounts: counts,
            adminUserExists: !!adminExists,
            indexesCreated: indexCount,
            totalDocuments: Object.values(counts).reduce((a, b) => a + b, 0)
          }
        });
      } catch (error) {
        reject(new Error(`Database integrity check failed: ${error.message}`));
      } finally {
        if (mongoose.connection.readyState === 1) {
          await mongoose.disconnect();
        }
      }
    });
  }

  // Check application server
  async checkApplicationServer() {
    return new Promise(async (resolve, reject) => {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.serverUrl}/health`, {
          timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        if (response.status === 200) {
          resolve({
            message: 'Application server is running',
            details: {
              status: response.status,
              responseTime: `${responseTime}ms`,
              serverData: response.data
            }
          });
        } else {
          reject(new Error(`Server returned status ${response.status}`));
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          reject(new Error('Application server is not running'));
        } else {
          reject(new Error(`Server check failed: ${error.message}`));
        }
      }
    });
  }

  // Check API endpoints
  async checkAPIEndpoints() {
    return new Promise(async (resolve, reject) => {
      try {
        const endpoints = [
          { path: '/api-docs', name: 'API Documentation' },
          { path: '/api/users/register', name: 'User Registration', method: 'POST' },
          { path: '/api/users/login', name: 'User Login', method: 'POST' }
        ];
        
        const results = {};
        
        for (const endpoint of endpoints) {
          try {
            const startTime = Date.now();
            let response;
            
            if (endpoint.method === 'POST') {
              // Test with invalid data to check if endpoint exists
              response = await axios.post(`${this.serverUrl}${endpoint.path}`, {}, {
                timeout: 3000,
                validateStatus: () => true // Accept any status code
              });
            } else {
              response = await axios.get(`${this.serverUrl}${endpoint.path}`, {
                timeout: 3000,
                validateStatus: () => true
              });
            }
            
            const responseTime = Date.now() - startTime;
            
            results[endpoint.name] = {
              status: response.status,
              responseTime: `${responseTime}ms`,
              available: response.status < 500
            };
          } catch (error) {
            results[endpoint.name] = {
              status: 'error',
              error: error.message,
              available: false
            };
          }
        }
        
        const availableEndpoints = Object.values(results).filter(r => r.available).length;
        const totalEndpoints = endpoints.length;
        
        if (availableEndpoints === totalEndpoints) {
          resolve({
            message: 'All API endpoints are accessible',
            details: {
              available: `${availableEndpoints}/${totalEndpoints}`,
              endpoints: results
            }
          });
        } else {
          reject(new Error(`Only ${availableEndpoints}/${totalEndpoints} endpoints are accessible`));
        }
      } catch (error) {
        reject(new Error(`API endpoint check failed: ${error.message}`));
      }
    });
  }

  // Check system resources
  async checkSystemResources() {
    return new Promise((resolve, reject) => {
      try {
        const os = require('os');
        
        // Memory usage
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        const memoryUsagePercent = (usedMemory / totalMemory * 100).toFixed(2);
        
        // CPU information
        const cpus = os.cpus();
        const loadAverage = os.loadavg();
        
        // Disk space (simplified check)
        const diskUsage = process.cwd();
        
        // Process memory
        const processMemory = process.memoryUsage();
        
        const details = {
          memory: {
            total: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            used: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            free: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
            usagePercent: `${memoryUsagePercent}%`
          },
          cpu: {
            cores: cpus.length,
            model: cpus[0].model,
            loadAverage: loadAverage.map(load => load.toFixed(2))
          },
          process: {
            heapUsed: `${(processMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(processMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            external: `${(processMemory.external / 1024 / 1024).toFixed(2)} MB`,
            rss: `${(processMemory.rss / 1024 / 1024).toFixed(2)} MB`
          },
          uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
          platform: `${os.type()} ${os.release()}`,
          nodeVersion: process.version
        };
        
        // Check for potential issues
        if (parseFloat(memoryUsagePercent) > 90) {
          reject(new Error(`High memory usage: ${memoryUsagePercent}%`));
          return;
        }
        
        resolve({
          message: 'System resources are healthy',
          details
        });
      } catch (error) {
        reject(new Error(`System resource check failed: ${error.message}`));
      }
    });
  }

  // Check configuration files
  async checkConfiguration() {
    return new Promise((resolve, reject) => {
      try {
        const configPath = path.join(__dirname, '../.env');
        const packagePath = path.join(__dirname, '../package.json');
        
        // Check .env file
        const envExists = fs.existsSync(configPath);
        let envVars = {};
        
        if (envExists) {
          const envContent = fs.readFileSync(configPath, 'utf8');
          const lines = envContent.split('\n').filter(line => 
            line.trim() && !line.startsWith('#')
          );
          
          lines.forEach(line => {
            const [key] = line.split('=');
            if (key) {
              envVars[key.trim()] = process.env[key.trim()] ? 'set' : 'not set';
            }
          });
        }
        
        // Check package.json
        const packageExists = fs.existsSync(packagePath);
        let packageInfo = {};
        
        if (packageExists) {
          const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
          packageInfo = {
            name: packageContent.name,
            version: packageContent.version,
            dependencies: Object.keys(packageContent.dependencies || {}).length,
            devDependencies: Object.keys(packageContent.devDependencies || {}).length
          };
        }
        
        // Check required environment variables
        const requiredVars = ['MONGO_URL', 'JWT_SECRET', 'PORT'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
          reject(new Error(`Missing required environment variables: ${missingVars.join(', ')}`));
          return;
        }
        
        resolve({
          message: 'Configuration is valid',
          details: {
            envFileExists: envExists,
            packageFileExists: packageExists,
            environmentVariables: envVars,
            packageInfo,
            requiredVarsSet: requiredVars.length - missingVars.length
          }
        });
      } catch (error) {
        reject(new Error(`Configuration check failed: ${error.message}`));
      }
    });
  }

  // Generate health report
  generateReport() {
    const passedChecks = Object.values(this.results.checks).filter(
      check => check.status === 'pass'
    ).length;
    
    const totalChecks = Object.keys(this.results.checks).length;
    const healthScore = Math.round((passedChecks / totalChecks) * 100);
    
    // Determine overall health
    if (healthScore === 100) {
      this.results.overall = 'healthy';
    } else if (healthScore >= 80) {
      this.results.overall = 'warning';
    } else {
      this.results.overall = 'critical';
    }
    
    console.log('\n📋 Health Check Report');
    console.log('======================');
    console.log(`Overall Status: ${this.results.overall.toUpperCase()}`);
    console.log(`Health Score: ${healthScore}% (${passedChecks}/${totalChecks} checks passed)`);
    console.log(`Timestamp: ${this.results.timestamp}`);
    console.log(`Total Duration: ${this.results.duration}ms`);
    
    console.log('\nDetailed Results:');
    Object.entries(this.results.checks).forEach(([name, result]) => {
      const status = result.status === 'pass' ? '✅' : '❌';
      console.log(`${status} ${name}: ${result.message} (${result.duration})`);
    });
    
    // Save report to file
    const reportPath = path.join(__dirname, '../health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Report saved to: ${reportPath}`);
    
    return this.results;
  }

  // Run all health checks
  async runAllChecks() {
    const startTime = Date.now();
    
    console.log('🏥 Healthcare Telemedicine System - Health Check');
    console.log('================================================\n');
    
    const checks = [
      ['Configuration', () => this.checkConfiguration()],
      ['System Resources', () => this.checkSystemResources()],
      ['MongoDB Connection', () => this.checkMongoDB()],
      ['Database Integrity', () => this.checkDatabaseIntegrity()],
      ['Application Server', () => this.checkApplicationServer()],
      ['API Endpoints', () => this.checkAPIEndpoints()]
    ];
    
    let allPassed = true;
    
    for (const [name, checkFunction] of checks) {
      const passed = await this.runCheck(name, checkFunction);
      if (!passed) allPassed = false;
    }
    
    this.results.duration = Date.now() - startTime;
    
    // Generate and display report
    this.generateReport();
    
    return allPassed;
  }
}

// Run health check if called directly
if (require.main === module) {
  const checker = new HealthChecker();
  checker.runAllChecks().then(allPassed => {
    process.exit(allPassed ? 0 : 1);
  }).catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

module.exports = HealthChecker;
