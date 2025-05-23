# Healthcare Telemedicine System

A comprehensive healthcare telemedicine platform with real-time patient monitoring, video consultations, and emergency response capabilities. Built with Node.js, Express, Socket.IO, MongoDB, and RabbitMQ, it provides secure healthcare communication, HIPAA-compliant data handling, and advanced medical record management.


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

This healthcare telemedicine system provides a complete solution for remote healthcare delivery, combining real-time communication, patient monitoring, and emergency response capabilities. The platform is designed with healthcare compliance in mind, featuring HIPAA-compliant data handling, secure video consultations, and comprehensive medical record management.

## Features

### 🏥 Core Healthcare Features
- **Video Consultations:** WebRTC-powered video calls between patients and healthcare providers
- **Patient Monitoring:** Real-time vital signs monitoring with automated alerts
- **Medical Records:** Comprehensive electronic health record (EHR) management
- **Appointment Scheduling:** Smart scheduling system with availability management
- **Emergency Response:** Instant emergency alerts with location tracking
- **Prescription Management:** Digital prescription handling and tracking

### 🔒 Security & Compliance
- **HIPAA Compliance:** Built-in compliance features for healthcare data protection
- **JWT Authentication:** Secure token-based authentication system
- **Role-Based Access:** Patient, provider, nurse, admin, and emergency roles
- **Audit Logging:** Comprehensive access logging for compliance requirements
- **Data Encryption:** End-to-end encryption for sensitive medical data

### 💬 Communication Features
- **Real-Time Messaging:** Instant messaging between healthcare team members
- **Chat During Consultations:** In-session chat with file sharing capabilities
- **Screen Sharing:** Medical image and document sharing during consultations
- **Multi-Party Calls:** Support for multiple participants in consultations
- **Automated Notifications:** Email and SMS reminders for appointments

### 📊 Monitoring & Analytics
- **Vital Signs Dashboard:** Real-time display of patient vital signs
- **Critical Alerts:** Automated alerts for abnormal vital sign readings
- **Patient History:** Comprehensive medical history tracking
- **Provider Analytics:** Performance metrics and patient outcomes
- **Emergency Tracking:** Real-time emergency response coordination


## Architecture

### System Components
- **Express Server:** RESTful API server handling HTTP requests and WebSocket connections
- **MongoDB Database:** Document-based storage for patient records, appointments, and medical data
- **Socket.IO:** Real-time bidirectional communication for consultations and monitoring
- **RabbitMQ:** Message queuing for reliable communication between services
- **WebRTC:** Peer-to-peer video/audio communication for consultations
- **JWT Authentication:** Secure token-based authentication and authorization
- **File Storage:** Secure file upload and storage for medical documents

### Database Schema
- **Users:** Patient and provider account information
- **Patients:** Medical history, allergies, medications, insurance
- **Providers:** Credentials, specializations, availability schedules
- **Appointments:** Scheduling, status tracking, consultation details
- **Medical Records:** Diagnoses, treatments, lab results, prescriptions
- **Consultations:** Video session data, chat logs, recordings

### Security Architecture
- **Role-Based Access Control (RBAC):** Different permission levels for each user type
- **Data Encryption:** AES encryption for sensitive medical data at rest
- **HTTPS/WSS:** Encrypted communication channels
- **Audit Trails:** Complete logging of all data access and modifications
- **Session Management:** Secure session handling with automatic timeouts

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+ recommended)
- [MongoDB](https://www.mongodb.com/try/download/community) (v5.0+ recommended)
- [RabbitMQ](https://www.rabbitmq.com/download.html) (running locally or accessible remotely)
- Modern web browser with WebRTC support


### Installation

Install dependencies:

```bash
npm install
```

### Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit the `.env` file with your configuration:

```ini
# Server Configuration
PORT=3000

# Database Configuration
MONGO_URL=mongodb://localhost:27017/healthcare_telemedicine

# RabbitMQ Configuration
RABBITMQ_URL=amqp://localhost
QUEUE=messages

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Healthcare Specific Configuration
EMERGENCY_CONTACT_EMAIL=emergency@hospital.com
EMERGENCY_CONTACT_PHONE=+1-555-911-0000
```

### Running the Application

1. **Start MongoDB:**
```bash
# On macOS with Homebrew
brew services start mongodb-community

# On Ubuntu/Debian
sudo systemctl start mongod

# On Windows, start MongoDB service from Services panel
```

2. **Start RabbitMQ:**
```bash
# On macOS with Homebrew
brew services start rabbitmq

# On Ubuntu/Debian
sudo systemctl start rabbitmq-server

# On Windows, start RabbitMQ service from Services panel
```

3. **Start the application:**
```bash
npm run dev
```

4. **Access the application:**
- Main interface: [http://localhost:3000](http://localhost:3000)
- API documentation: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

## API Documentation

Interactive API documentation is available via Swagger. Once the server is running, open your browser and visit:

```
http://localhost:3000/api-docs
```

You can explore all the API endpoints, view details about required parameters, and test them directly from the browser.

## Testing the API

To publish a message using the secure REST API, use Postman or curl.

```bash
curl -X POST http://localhost:3000/api/messages \
-H "Content-Type: application/json" \
-H "Authorization: Bearer <your_jwt_token>" \
-d '{"message": "Hello from REST API!"}'
```

Replace `<your_jwt_token>` with a valid JWT token generated using your secret key.


## Contributing

Contributions are welcome! Please fork the repository and submit a pull request. For any major changes, open an issue and lets discuss your ideas.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
