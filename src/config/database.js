const mongoose = require('mongoose');
const { mongoUrl } = require('./config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUrl);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn('⚠️  MongoDB connection failed:', error.message);
    console.warn('⚠️  Running in demo mode without database persistence');
    console.warn('⚠️  To enable full functionality, please start MongoDB and restart the server');
    return false;
  }
};

module.exports = connectDB;
