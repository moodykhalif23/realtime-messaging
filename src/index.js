const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');

const { port } = require('./config/config');
const { startRabbitMQConsumer } = require('./services/messageService');
const messagesRouter = require('./routes/messages');
const usersRouter = require('./routes/users');
const historyRouter = require('./routes/history');
const integrationsRouter = require('./routes/integrations');
const authenticateToken = require('./middleware/auth');
const setupSwagger = require('./swagger');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Middleware for JSON parsing
app.use(bodyParser.json());

// Serve static files for the client
app.use(express.static(path.join(__dirname, 'public')));

// Swagger documentation endpoint
setupSwagger(app);

// REST endpoints
app.use('/api/messages', authenticateToken, messagesRouter);
app.use('/api/users', usersRouter); // Registration/login do not require auth, profile does.
app.use('/api/history', authenticateToken, historyRouter);
app.use('/api/integrations', integrationsRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New client connected');
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start RabbitMQ consumer
startRabbitMQConsumer(io);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
