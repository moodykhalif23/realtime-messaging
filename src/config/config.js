require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/healthcare_telemedicine',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost',
    queue: process.env.QUEUE || 'messages'
  },
  jwtSecret: process.env.JWT_SECRET || 'defaultSecret',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD
  },
  webrtc: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
};
