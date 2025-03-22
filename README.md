# Real-Time Messaging SaaS

A scalable real-time messaging platform built with Node.js, Express, Socket.IO, and RabbitMQ. This project provides secure real-time message broadcasting using WebSockets, combined with a robust REST API for message publishing and JWT-based authentication. It's designed with modularity and scalability in mind, paving the way for future SaaS enhancements.

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
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)

## Overview

This project integrates RabbitMQ and Socket.IO to create a robust real-time messaging service. It supports both a WebSocket-based client for immediate updates and a secure RESTful API for publishing messages, making it an ideal foundation for SaaS applications.

## Features

- **Real-Time Messaging:** Uses Socket.IO for efficient bi-directional communication.
- **Reliable Message Queueing:** RabbitMQ ensures messages are reliably queued and processed.
- **Secure REST API:** JWT authentication protects the publishing endpoint.
- **Environment-Based Configuration:** Uses dotenv to manage configuration and secrets.
- **Modular & Scalable:** Clean project structure for future enhancements, including multi-tenancy and advanced analytics.

## Architecture

- **Server:** Built on Express, handling both API requests and Socket.IO connections.
- **Message Broker:** RabbitMQ manages message queues to decouple message producers from consumers.
- **Client:** A simple HTML client connects to Socket.IO to display real-time messages.
- **Security:** JWT authentication secures REST API endpoints, ensuring only authorized access.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v12+ recommended)
- [RabbitMQ](https://www.rabbitmq.com/download.html) (running locally or accessible remotely)
- npm (Node Package Manager)

### Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/moodykhalid23/realtime-messaging.git
   cd realtime-messaging
