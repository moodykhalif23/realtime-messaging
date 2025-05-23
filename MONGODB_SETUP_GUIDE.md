# MongoDB Setup Guide for Healthcare Telemedicine System

## 📋 Overview

This guide will help you set up MongoDB for the Healthcare Telemedicine System, enabling full data persistence, user management, and all advanced features. The system currently runs in demo mode with in-memory storage, but connecting to MongoDB unlocks the complete functionality.

## 🎯 Why MongoDB?

- **Document-based**: Perfect for complex healthcare data structures
- **Scalability**: Handles large volumes of medical records and patient data
- **Flexibility**: Easy to modify schemas as healthcare requirements evolve
- **Performance**: Fast queries for real-time patient monitoring
- **HIPAA Compliance**: Supports encryption and audit logging requirements

## 🛠 Installation Options

### Option 1: Local MongoDB Installation

#### **Windows Installation**

1. **Download MongoDB Community Server**:
   - Visit https://www.mongodb.com/try/download/community
   - Select "Windows" and "msi" package
   - Download the latest version

2. **Install MongoDB**:
   ```bash
   # Run the downloaded .msi file
   # Choose "Complete" installation
   # Install as a Windows Service (recommended)
   # Install MongoDB Compass (GUI tool)
   ```

3. **Start MongoDB Service**:
   ```bash
   # MongoDB should start automatically as a Windows service
   # To manually start/stop:
   net start MongoDB
   net stop MongoDB
   ```

4. **Verify Installation**:
   ```bash
   # Open Command Prompt and test connection
   mongosh
   # You should see MongoDB shell prompt
   ```


   ```

3. **Verify Installation**:
   ```bash
   mongosh
   ```


## ⚙️ Configure the Healthcare System

### 1. **Update Environment Variables**

Edit your `.env` file:

```ini
# For Local MongoDB
MONGO_URL=mongodb://localhost:27017/healthcare_telemedicine


# Other configurations
PORT=3000
JWT_SECRET=your_super_secure_jwt_secret_key_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### 2. **Database Initialization Script**

Create a database initialization script:

```javascript
// scripts/init-database.js
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/User');
const Patient = require('../src/models/Patient');
const Provider = require('../src/models/Provider');

async function initializeDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log('✅ Connected to MongoDB');

    // Create indexes for better performance
    await User.createIndexes();
    await Patient.createIndexes();
    await Provider.createIndexes();
    console.log('✅ Database indexes created');

    // Create sample admin user
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('admin123', 10);

      const admin = new User({
        username: 'admin',
        email: 'admin@healthcare.com',
        password: hashedPassword,
        role: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true
      });

      await admin.save();
      console.log('✅ Admin user created (admin@healthcare.com / admin123)');
    }

    console.log('🎉 Database initialization completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();
```

### 3. **Run Database Initialization**

```bash
# Make the script executable
node scripts/init-database.js
```

## 🚀 Start the System with MongoDB

### 1. **Restart the Application**

```bash
# Stop the current server (Ctrl+C)
# Start with MongoDB connection
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost:27017
🏥 Healthcare Telemedicine System running on port 3000
```

### 2. **Verify Database Connection**

Run the test script:
```bash
node test-api.js
```

You should see successful user registration and login without "demo mode" messages.

## 📊 Database Structure

### **Collections Created**

1. **users**: User accounts and authentication
2. **patients**: Patient medical profiles
3. **providers**: Healthcare provider profiles
4. **appointments**: Appointment scheduling
5. **medicalrecords**: Patient medical records
6. **consultations**: Video consultation sessions

### **Sample Data Queries**

```javascript
// Connect to MongoDB shell
mongosh

// Switch to healthcare database
use healthcare_telemedicine

// View all collections
show collections

// Count users by role
db.users.aggregate([
  { $group: { _id: "$role", count: { $sum: 1 } } }
])

// Find all active appointments
db.appointments.find({ status: "scheduled" })

// View patient medical records
db.medicalrecords.find().limit(5)
```

## 🔧 Troubleshooting

### **Common Connection Issues**

1. **Connection Refused**:
   ```bash
   # Check if MongoDB is running
   # Windows:
   net start MongoDB

   # macOS:
   brew services start mongodb-community

   # Linux:
   sudo systemctl start mongod
   ```

2. **Authentication Failed**:
   - Verify username/password in connection string
   - Check database user permissions in Atlas
   - Ensure IP address is whitelisted

3. **Network Timeout**:
   - Check firewall settings
   - Verify network connectivity
   - For Atlas: Check network access settings

4. **Database Not Found**:
   - MongoDB creates databases automatically
   - Ensure correct database name in connection string

### **Performance Optimization**

1. **Create Additional Indexes**:
   ```javascript
   // In MongoDB shell
   db.appointments.createIndex({ "scheduledDateTime": 1, "provider": 1 })
   db.medicalrecords.createIndex({ "patient": 1, "createdAt": -1 })
   db.users.createIndex({ "email": 1 }, { unique: true })
   ```

2. **Monitor Performance**:
   ```bash
   # Use MongoDB Compass for visual monitoring
   # Or use command line
   mongosh --eval "db.stats()"
   ```

## 🔒 Security Best Practices

### **Production Security**

1. **Enable Authentication**:
   ```yaml
   # /etc/mongod.conf
   security:
     authorization: enabled
   ```

2. **Use SSL/TLS**:
   ```yaml
   net:
     ssl:
       mode: requireSSL
       PEMKeyFile: /path/to/certificate.pem
   ```

3. **Limit Network Access**:
   ```yaml
   net:
     bindIp: 127.0.0.1,10.0.0.5  # Specific IPs only
   ```

4. **Regular Backups**:
   ```bash
   # Create backup
   mongodump --db healthcare_telemedicine --out /backup/$(date +%Y%m%d)

   # Restore backup
   mongorestore --db healthcare_telemedicine /backup/20231201/healthcare_telemedicine
   ```

## 📈 Monitoring and Maintenance

### **Health Checks**

```javascript
// Add to your application
const mongoose = require('mongoose');

// Check database health
app.get('/health/database', async (req, res) => {
  try {
    const state = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    res.json({
      status: states[state],
      database: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### **Backup Strategy**

```bash
#!/bin/bash
# backup-script.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/healthcare"
DB_NAME="healthcare_telemedicine"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/healthcare_backup_$DATE.tar.gz -C $BACKUP_DIR $DATE

# Remove uncompressed backup
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: healthcare_backup_$DATE.tar.gz"
```

## ✅ Verification Checklist

After setup, verify these features work:

- [ ] User registration and login
- [ ] Patient profile creation
- [ ] Provider profile creation
- [ ] Appointment scheduling
- [ ] Medical record creation
- [ ] Video consultation sessions
- [ ] Real-time notifications
- [ ] Data persistence across server restarts

## 🎉 Success!

Once MongoDB is connected, your Healthcare Telemedicine System will have:

- ✅ **Full Data Persistence**: All data saved permanently
- ✅ **Complete User Management**: Patients, providers, admins
- ✅ **Advanced Features**: Appointments, medical records, consultations
- ✅ **Production Ready**: Scalable database backend
- ✅ **HIPAA Compliance**: Audit trails and secure data storage

## 🚀 Quick Start Commands

### **For Local MongoDB**
```bash
# 1. Start MongoDB (choose your OS)
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod

# 2. Initialize the database
node scripts/init-database.js

# 3. Start the application
npm run dev

# 4. Verify everything is working
node scripts/health-check.js
```

### **For MongoDB Atlas**
```bash
# 1. Update .env with Atlas connection string
# MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/healthcare_telemedicine

# 2. Initialize the database
node scripts/init-database.js

# 3. Start the application
npm run dev

# 4. Verify everything is working
node scripts/health-check.js
```

## 📚 Additional Resources

### **MongoDB Learning Resources**
- [MongoDB University](https://university.mongodb.com/) - Free courses
- [MongoDB Documentation](https://docs.mongodb.com/) - Official docs
- [MongoDB Compass](https://www.mongodb.com/products/compass) - GUI tool

### **Healthcare Data Security**
- [HIPAA Compliance Guide](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)
- [MongoDB Security Checklist](https://docs.mongodb.com/manual/administration/security-checklist/)
- [Healthcare Data Encryption](https://docs.mongodb.com/manual/core/security-encryption-at-rest/)

### **Performance Optimization**
- [MongoDB Performance Best Practices](https://docs.mongodb.com/manual/administration/analyzing-mongodb-performance/)
- [Index Optimization](https://docs.mongodb.com/manual/applications/indexes/)
- [Query Optimization](https://docs.mongodb.com/manual/core/query-optimization/)

## 🎯 Next Steps After Setup

1. **Configure Email Notifications**:
   - Set up SMTP credentials in `.env`
   - Test appointment reminders
   - Configure emergency alerts

2. **Set Up Automated Backups**:
   ```bash
   # Windows
   scripts/backup-database.bat

   # Linux/macOS
   scripts/backup-database.sh
   ```

3. **Configure Production Security**:
   - Enable MongoDB authentication
   - Set up SSL/TLS certificates
   - Configure firewall rules
   - Set up monitoring and alerting

4. **Deploy to Production**:
   - Choose cloud provider (AWS, Azure, GCP)
   - Set up load balancing
   - Configure auto-scaling
   - Set up monitoring and logging

Your system is now ready for production deployment! 🏥✨
