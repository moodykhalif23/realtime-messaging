# Real-Time Messaging SaaS

Welcome to Real-Time Messaging SaaS! This project is a scalable real-time messaging platform built with Node.js, Express, Socket.IO, and RabbitMQ. It features a secure REST API for publishing messages, JWT authentication, and interactive API documentation using Swagger.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Testing the API](#testing-the-api)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project combines the power of RabbitMQ for message queuing and Socket.IO for real-time client updates. With a secure REST API and interactive Swagger docs, you can easily integrate this service into your applications or use it as a foundation for your SaaS platform.

## Features

- **Real-Time Messaging:** Immediate message updates to connected clients using Socket.IO.
- **Reliable Queuing:** RabbitMQ ensures your messages are queued and delivered reliably.
- **Secure API:** Publish messages securely using JWT-protected endpoints.
- **Interactive API Docs:** Swagger provides a clear, interactive interface for API documentation.
- **Modular & Scalable:** Clean code structure designed to grow with your needs.

## Architecture

- **Server:** Built with Express, it handles API requests and WebSocket connections.
- **Message Broker:** RabbitMQ manages message queuing between services.
- **Client:** A simple HTML interface displays real-time messages.
- **Security:** JWT authentication protects sensitive API endpoints.
- **Documentation:** Swagger UI offers an interactive look at the API.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v12+ recommended)
- [RabbitMQ](https://www.rabbitmq.com/download.html) (running locally or accessible remotely)


### Installation

Install dependencies:

```bash
npm install
```

### Configuration

Create a `.env` file in the root directory with the following settings:

```ini
PORT=3000
RABBITMQ_URL=amqp://localhost
QUEUE=messages
JWT_SECRET=yourSecretKey
```

Make sure to adjust these values as needed. 

### Running the Application

Start RabbitMQ, then run the application using:

```bash
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000) to see the real-time client interface.

## API Documentation

Interactive API documentation is available via Swagger. Once your server is running, open your browser and visit:

```
http://localhost:3000/api-docs
```

Here you can explore all the API endpoints, view details about required parameters, and test them directly from the browser.

## Testing the API

To publish a message using the secure REST API, use a tool like Postman or curl. For example, with curl:

```bash
curl -X POST http://localhost:3000/api/messages \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{"message": "Hello from REST API!"}'
```

Replace `<your_jwt_token>` with a valid JWT token generated using your secret key.


## Contributing

Contributions are welcome! Please fork the repository and submit a pull request. For any major changes, open an issue first to discuss your ideas.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
