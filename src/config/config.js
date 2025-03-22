require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost',
    queue: process.env.QUEUE || 'messages'
  },
  jwtSecret: process.env.JWT_SECRET || 'defaultSecret'
};
