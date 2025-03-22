const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');

const { port } = require('./config/config');
const { startRabbitMQConsumer } = require('./services/messageService');
const messagesRouter = require('./routes/messages');
const authenticateToken = require('./middleware/auth');
const setupSwagger = require('./swagger');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware for parsing JSON bodies
app.use(bodyParser.json());

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Swagger documentation endpoint
setupSwagger(app);

// REST endpoint for publishing messages (protected)
app.use('/api/messages', authenticateToken, messagesRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the RabbitMQ consumer passing the Socket.IO instance
startRabbitMQConsumer(io);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
