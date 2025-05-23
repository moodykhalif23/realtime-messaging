const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const { port } = require('./config/config');
const connectDB = require('./config/database');
const { startRabbitMQConsumer } = require('./services/messageService');
const messagesRouter = require('./routes/messages');
const usersRouter = require('./routes/users');
const historyRouter = require('./routes/history');
const integrationsRouter = require('./routes/integrations');
const appointmentsRouter = require('./routes/appointments');
const consultationsRouter = require('./routes/consultations');
const medicalRecordsRouter = require('./routes/medicalRecords');
const monitoringRouter = require('./routes/monitoring');
const emergencyRouter = require('./routes/emergency');
const authenticateToken = require('./middleware/auth');
const setupSwagger = require('./swagger');

// Connect to database
let isDBConnected = false;
connectDB().then(connected => {
  isDBConnected = connected;
});

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, '../uploads/medical-records');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files for the client
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Swagger documentation endpoint
setupSwagger(app);

// Health check endpoint
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  const healthStatus = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version,
    database: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      name: mongoose.connection.name,
      host: mongoose.connection.host,
      port: mongoose.connection.port
    },
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    }
  };

  res.json(healthStatus);
});

// REST endpoints
app.use('/api/messages', authenticateToken, messagesRouter);
app.use('/api/users', usersRouter); // Registration/login do not require auth, profile does.
app.use('/api/history', authenticateToken, historyRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/appointments', authenticateToken, appointmentsRouter);
app.use('/api/consultations', authenticateToken, consultationsRouter);
app.use('/api/medical-records', authenticateToken, medicalRecordsRouter);
app.use('/api/monitoring', authenticateToken, monitoringRouter);
app.use('/api/emergency', authenticateToken, emergencyRouter);

// Socket.IO connection handling for real-time features
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Join consultation room
  socket.on('join-consultation', (data) => {
    const { sessionId, userId, role } = data;
    socket.join(`consultation-${sessionId}`);
    socket.userId = userId;
    socket.sessionId = sessionId;
    socket.role = role;

    // Notify other participants
    socket.to(`consultation-${sessionId}`).emit('participant-joined', {
      userId,
      role,
      socketId: socket.id
    });

    console.log(`User ${userId} joined consultation ${sessionId} as ${role}`);
  });

  // Leave consultation room
  socket.on('leave-consultation', (data) => {
    const { sessionId, userId } = data;
    socket.leave(`consultation-${sessionId}`);

    // Notify other participants
    socket.to(`consultation-${sessionId}`).emit('participant-left', {
      userId,
      socketId: socket.id
    });

    console.log(`User ${userId} left consultation ${sessionId}`);
  });

  // Handle WebRTC signaling for video calls
  socket.on('webrtc-offer', (data) => {
    const { sessionId, offer, targetUserId } = data;
    socket.to(`consultation-${sessionId}`).emit('webrtc-offer', {
      offer,
      fromUserId: socket.userId,
      targetUserId
    });
  });

  socket.on('webrtc-answer', (data) => {
    const { sessionId, answer, targetUserId } = data;
    socket.to(`consultation-${sessionId}`).emit('webrtc-answer', {
      answer,
      fromUserId: socket.userId,
      targetUserId
    });
  });

  socket.on('webrtc-ice-candidate', (data) => {
    const { sessionId, candidate, targetUserId } = data;
    socket.to(`consultation-${sessionId}`).emit('webrtc-ice-candidate', {
      candidate,
      fromUserId: socket.userId,
      targetUserId
    });
  });

  // Handle chat messages
  socket.on('consultation-chat', (data) => {
    const { sessionId, message, messageType } = data;
    const chatData = {
      senderId: socket.userId,
      message,
      messageType: messageType || 'text',
      timestamp: new Date(),
      senderRole: socket.role
    };

    // Broadcast to all participants in the consultation
    io.to(`consultation-${sessionId}`).emit('consultation-chat', chatData);
  });

  // Handle screen sharing
  socket.on('start-screen-share', (data) => {
    const { sessionId } = data;
    socket.to(`consultation-${sessionId}`).emit('screen-share-started', {
      userId: socket.userId,
      role: socket.role
    });
  });

  socket.on('stop-screen-share', (data) => {
    const { sessionId } = data;
    socket.to(`consultation-${sessionId}`).emit('screen-share-stopped', {
      userId: socket.userId
    });
  });

  // Handle connection quality updates
  socket.on('connection-quality', (data) => {
    const { sessionId, quality } = data;
    socket.to(`consultation-${sessionId}`).emit('participant-quality-update', {
      userId: socket.userId,
      quality
    });
  });

  // Handle emergency alerts
  socket.on('emergency-alert', (data) => {
    const { patientId, location, severity, description } = data;

    // Broadcast to all healthcare providers
    socket.broadcast.emit('emergency-alert', {
      patientId,
      location,
      severity,
      description,
      timestamp: new Date(),
      alertId: `emergency-${Date.now()}`
    });

    console.log(`Emergency alert from patient ${patientId}: ${description}`);
  });

  // Handle appointment reminders
  socket.on('join-patient-room', (data) => {
    const { patientId } = data;
    socket.join(`patient-${patientId}`);
    console.log(`Client joined patient room: ${patientId}`);
  });

  socket.on('join-provider-room', (data) => {
    const { providerId } = data;
    socket.join(`provider-${providerId}`);
    console.log(`Client joined provider room: ${providerId}`);
  });

  // Handle vital signs monitoring
  socket.on('vital-signs-update', async (data) => {
    try {
      const { patientId, deviceId, measurements, location } = data;

      // Process vital signs through monitoring service
      const patientMonitoringService = require('./services/patientMonitoringService');
      const result = await patientMonitoringService.recordVitalSigns({
        patientId,
        deviceId,
        deviceType: 'manual',
        measurements,
        location
      });

      // Broadcast to patient's healthcare team
      socket.to(`patient-${patientId}`).emit('vital-signs-update', {
        patientId,
        vitalSigns: result.data.measurements,
        alerts: result.alerts,
        emergency: result.emergency,
        timestamp: result.data.createdAt,
        overallStatus: result.data.trends?.overallStatus
      });

      // If emergency, broadcast to all providers
      if (result.emergency) {
        socket.broadcast.emit('emergency-vital-alert', {
          patientId,
          alertType: 'critical_vitals',
          alerts: result.alerts,
          severity: 'critical',
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('vital-signs-error', {
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  // Handle device status updates
  socket.on('device-status-update', (data) => {
    const { deviceId, patientId, status, batteryLevel, signalStrength } = data;

    // Broadcast device status to monitoring team
    socket.to(`patient-${patientId}`).emit('device-status-update', {
      deviceId,
      patientId,
      status,
      batteryLevel,
      signalStrength,
      timestamp: new Date()
    });

    // Alert if device has issues
    if (status === 'error' || status === 'lost' || (batteryLevel && batteryLevel < 20)) {
      socket.to(`patient-${patientId}`).emit('device-alert', {
        deviceId,
        patientId,
        alertType: status === 'error' || status === 'lost' ? 'device_malfunction' : 'low_battery',
        severity: status === 'lost' ? 'high' : 'medium',
        message: status === 'lost' ? 'Device connection lost' :
                status === 'error' ? 'Device malfunction detected' :
                `Low battery: ${batteryLevel}%`,
        timestamp: new Date()
      });
    }
  });

  // Handle fall detection
  socket.on('fall-detected', async (data) => {
    try {
      const { patientId, deviceId, location, confidence, impactForce } = data;

      // Create emergency alert through service
      const emergencyResponseService = require('./services/emergencyResponseService');
      const alertData = {
        patientId,
        triggeredBy: socket.userId || null,
        alertType: 'fall_detection',
        severity: confidence > 0.8 ? 'critical' : 'high',
        priority: confidence > 0.8 ? 'immediate' : 'urgent',
        description: `Fall detected by device ${deviceId}. Confidence: ${(confidence * 100).toFixed(1)}%${impactForce ? `, Impact: ${impactForce}G` : ''}`,
        location
      };

      const result = await emergencyResponseService.createEmergencyAlert(alertData);

      // Broadcast fall detection alert
      socket.broadcast.emit('fall-detection-alert', {
        alertId: result.data.alertId,
        patientId,
        deviceId,
        confidence,
        impactForce,
        location,
        severity: alertData.severity,
        timestamp: new Date()
      });

    } catch (error) {
      socket.emit('fall-detection-error', {
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  // Handle medication reminders
  socket.on('medication-reminder', (data) => {
    const { patientId, medicationName, dosage, scheduledTime } = data;

    // Send reminder to patient
    socket.to(`patient-${patientId}`).emit('medication-reminder', {
      medicationName,
      dosage,
      scheduledTime,
      timestamp: new Date()
    });
  });

  // Handle medication taken confirmation
  socket.on('medication-taken', (data) => {
    const { patientId, medicationName, takenAt, notes } = data;

    // Broadcast to healthcare team
    socket.to(`patient-${patientId}`).emit('medication-taken', {
      patientId,
      medicationName,
      takenAt,
      notes,
      timestamp: new Date()
    });
  });

  // Handle geofence alerts
  socket.on('geofence-breach', async (data) => {
    try {
      const { patientId, deviceId, location, geofenceType } = data;

      // Create emergency alert for geofence breach
      const emergencyResponseService = require('./services/emergencyResponseService');
      const alertData = {
        patientId,
        triggeredBy: socket.userId || null,
        alertType: 'geofence_breach',
        severity: 'medium',
        priority: 'urgent',
        description: `Patient left designated safe area (${geofenceType})`,
        location
      };

      const result = await emergencyResponseService.createEmergencyAlert(alertData);

      // Broadcast geofence alert
      socket.broadcast.emit('geofence-alert', {
        alertId: result.data.alertId,
        patientId,
        deviceId,
        location,
        geofenceType,
        timestamp: new Date()
      });

    } catch (error) {
      socket.emit('geofence-error', {
        error: error.message,
        timestamp: new Date()
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);

    // If user was in a consultation, notify other participants
    if (socket.sessionId) {
      socket.to(`consultation-${socket.sessionId}`).emit('participant-disconnected', {
        userId: socket.userId,
        socketId: socket.id
      });
    }
  });
});

// Start RabbitMQ consumer
startRabbitMQConsumer(io);

server.listen(port, () => {
  console.log(`🏥 Healthcare Telemedicine System running on port ${port}`);
  console.log(`📊 API Documentation: http://localhost:${port}/api-docs`);
  console.log(`🌐 Web Interface: http://localhost:${port}`);
  console.log(`🔍 Health Check: http://localhost:${port}/health`);
});

// Export io instance for use in services
module.exports = { io };
