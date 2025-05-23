// HealthCare Pro - Telemedicine Platform JavaScript

// Global variables
let socket;
let localStream;
let remoteStream;
let peerConnection;
let isMonitoring = false;
let monitoringInterval;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeSocket();
    initializeWebRTC();
    loadUserInfo();
    startDashboardUpdates();
});

// Socket.IO initialization
function initializeSocket() {
    socket = io();
    
    // Connection events
    socket.on('connect', () => {
        console.log('Connected to server');
        updateConnectionStatus(true);
    });
    
    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        updateConnectionStatus(false);
    });
    
    // Real-time events
    socket.on('vital-signs-update', handleVitalSignsUpdate);
    socket.on('emergency-alert', handleEmergencyAlert);
    socket.on('emergency-vital-alert', handleCriticalVitalAlert);
    socket.on('device-status-update', handleDeviceStatusUpdate);
    socket.on('fall-detection-alert', handleFallDetectionAlert);
    socket.on('medication-reminder', handleMedicationReminder);
    
    // Video consultation events
    socket.on('user-joined', handleUserJoined);
    socket.on('user-left', handleUserLeft);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('consultation-message', handleConsultationMessage);
}

// WebRTC initialization
function initializeWebRTC() {
    const configuration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    
    peerConnection = new RTCPeerConnection(configuration);
    
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                sessionId: getCurrentSessionId(),
                candidate: event.candidate
            });
        }
    };
    
    peerConnection.ontrack = (event) => {
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.srcObject = event.streams[0];
        }
    };
}

// Tab navigation
function showTab(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Show selected tab content
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
    
    // Add active class to clicked tab
    const clickedTab = event.target.closest('.nav-tab');
    if (clickedTab) {
        clickedTab.classList.add('active');
    }
    
    // Initialize tab-specific functionality
    switch(tabName) {
        case 'consultation':
            initializeVideoConsultation();
            break;
        case 'monitoring':
            initializePatientMonitoring();
            break;
        case 'emergency':
            initializeEmergencyResponse();
            break;
    }
}

// Patient Monitoring Functions
function startMonitoring() {
    const patientId = document.getElementById('patientId').value;
    const deviceId = document.getElementById('deviceId').value;
    
    if (!patientId || !deviceId) {
        showAlert('Please enter both Patient ID and Device ID', 'warning');
        return;
    }
    
    isMonitoring = true;
    
    // Join patient monitoring room
    socket.emit('join-patient-monitoring', { patientId, deviceId });
    
    // Start simulated monitoring
    monitoringInterval = setInterval(() => {
        if (isMonitoring) {
            generateRandomVitals();
        }
    }, 5000);
    
    showAlert('Patient monitoring started successfully', 'success');
    updateMonitoringStatus(true);
}

function stopMonitoring() {
    isMonitoring = false;
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    
    showAlert('Patient monitoring stopped', 'info');
    updateMonitoringStatus(false);
}

function simulateVitalSigns(type) {
    const vitals = generateVitalSigns();
    
    switch(type) {
        case 'heartRate':
            updateVitalDisplay('monitorHeartRate', vitals.heartRate);
            break;
        case 'bloodPressure':
            updateVitalDisplay('monitorBloodPressure', `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
            break;
        case 'temperature':
            updateVitalDisplay('monitorTemperature', vitals.temperature.toFixed(1));
            break;
        case 'oxygenSaturation':
            updateVitalDisplay('monitorOxygen', vitals.oxygenSaturation);
            break;
    }
    
    // Send to server
    const patientId = document.getElementById('patientId').value || 'demo-patient-001';
    const deviceId = document.getElementById('deviceId').value || 'demo-device-001';
    
    socket.emit('vital-signs-update', {
        patientId,
        deviceId,
        measurements: {
            heartRate: { value: vitals.heartRate },
            bloodPressure: { 
                systolic: vitals.bloodPressure.systolic, 
                diastolic: vitals.bloodPressure.diastolic 
            },
            temperature: { value: vitals.temperature },
            oxygenSaturation: { value: vitals.oxygenSaturation }
        },
        location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: "Demo Location"
        }
    });
}

function simulateNormalVitals() {
    const normalVitals = {
        heartRate: 72 + Math.floor(Math.random() * 16) - 8, // 64-80
        bloodPressure: {
            systolic: 120 + Math.floor(Math.random() * 20) - 10, // 110-130
            diastolic: 80 + Math.floor(Math.random() * 10) - 5   // 75-85
        },
        temperature: 36.5 + (Math.random() * 0.8) - 0.4, // 36.1-36.9
        oxygenSaturation: 98 + Math.floor(Math.random() * 3) - 1 // 97-100
    };
    
    updateAllVitals(normalVitals);
    sendVitalSigns(normalVitals);
    showAlert('Normal vital signs simulated', 'success');
}

function simulateCriticalVitals() {
    const criticalVitals = {
        heartRate: Math.random() > 0.5 ? 45 : 155, // Too low or too high
        bloodPressure: {
            systolic: Math.random() > 0.5 ? 200 : 80, // Too high or too low
            diastolic: Math.random() > 0.5 ? 120 : 50
        },
        temperature: Math.random() > 0.5 ? 39.5 : 35.0, // Fever or hypothermia
        oxygenSaturation: 88 + Math.floor(Math.random() * 4) // 88-91 (low)
    };
    
    updateAllVitals(criticalVitals);
    sendVitalSigns(criticalVitals);
    showAlert('Critical vital signs simulated - Emergency alert triggered!', 'danger');
}

function generateVitalSigns() {
    return {
        heartRate: 60 + Math.floor(Math.random() * 40), // 60-100
        bloodPressure: {
            systolic: 110 + Math.floor(Math.random() * 40), // 110-150
            diastolic: 70 + Math.floor(Math.random() * 20)  // 70-90
        },
        temperature: 36.0 + Math.random() * 2, // 36.0-38.0
        oxygenSaturation: 95 + Math.floor(Math.random() * 6) // 95-100
    };
}

function generateRandomVitals() {
    if (!isMonitoring) return;
    
    const vitals = generateVitalSigns();
    updateAllVitals(vitals);
    sendVitalSigns(vitals);
}

function updateAllVitals(vitals) {
    updateVitalDisplay('monitorHeartRate', vitals.heartRate);
    updateVitalDisplay('monitorBloodPressure', `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
    updateVitalDisplay('monitorTemperature', vitals.temperature.toFixed(1));
    updateVitalDisplay('monitorOxygen', vitals.oxygenSaturation);
    
    // Update dashboard vitals too
    updateVitalDisplay('heartRateValue', vitals.heartRate);
    updateVitalDisplay('bloodPressureValue', `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
    updateVitalDisplay('temperatureValue', vitals.temperature.toFixed(1));
    updateVitalDisplay('oxygenValue', vitals.oxygenSaturation);
}

function updateVitalDisplay(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
        
        // Add animation effect
        element.style.transform = 'scale(1.1)';
        element.style.color = 'var(--primary-color)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.color = '';
        }, 300);
    }
}

function sendVitalSigns(vitals) {
    const patientId = document.getElementById('patientId').value || 'demo-patient-001';
    const deviceId = document.getElementById('deviceId').value || 'demo-device-001';
    
    socket.emit('vital-signs-update', {
        patientId,
        deviceId,
        measurements: {
            heartRate: { value: vitals.heartRate },
            bloodPressure: { 
                systolic: vitals.bloodPressure.systolic, 
                diastolic: vitals.bloodPressure.diastolic 
            },
            temperature: { value: vitals.temperature },
            oxygenSaturation: { value: vitals.oxygenSaturation }
        },
        location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: "Demo Location"
        }
    });
}

// Emergency Response Functions
function triggerEmergencyAlert() {
    const patientId = document.getElementById('emergencyPatientId').value;
    const description = document.getElementById('emergencyDescription').value;
    const severity = document.getElementById('emergencySeverity').value;
    
    if (!patientId || !description) {
        showAlert('Please fill in all required fields', 'warning');
        return;
    }
    
    const emergencyData = {
        patientId: patientId || 'demo-patient-001',
        alertType: 'manual',
        severity: severity || 'high',
        priority: 'urgent',
        description,
        location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: "Emergency Location"
        }
    };
    
    // Send emergency alert
    fetch('/api/emergency/alerts', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        },
        body: JSON.stringify(emergencyData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('Emergency alert sent successfully!', 'success');
            addEmergencyToList(data.data);
        } else {
            showAlert('Failed to send emergency alert', 'danger');
        }
    })
    .catch(error => {
        console.error('Emergency alert error:', error);
        showAlert('Emergency alert sent (demo mode)', 'success');
        
        // Simulate emergency alert in demo mode
        const demoAlert = {
            alertId: 'DEMO-' + Date.now(),
            ...emergencyData,
            status: 'active',
            createdAt: new Date()
        };
        addEmergencyToList(demoAlert);
    });
}

function triggerPanicButton() {
    const emergencyData = {
        patientId: 'demo-patient-001',
        alertType: 'panic_button',
        severity: 'critical',
        priority: 'immediate',
        description: 'PANIC BUTTON ACTIVATED - Immediate assistance required',
        location: {
            latitude: 40.7128,
            longitude: -74.0060,
            address: "Patient Location"
        }
    };
    
    // Send panic button alert
    socket.emit('emergency-alert', emergencyData);
    
    showAlert('🚨 PANIC BUTTON ACTIVATED - Emergency services notified!', 'danger');
    
    // Add to emergency list
    const panicAlert = {
        alertId: 'PANIC-' + Date.now(),
        ...emergencyData,
        status: 'active',
        createdAt: new Date()
    };
    addEmergencyToList(panicAlert);
}

// Video Consultation Functions
function initializeVideoConsultation() {
    // Initialize video elements if not already done
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    
    if (localVideo && !localVideo.srcObject) {
        // Set up local video placeholder
        localVideo.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
    }
}

async function joinConsultation() {
    const sessionId = document.getElementById('sessionId').value;
    const userType = document.getElementById('userType').value;
    
    if (!sessionId) {
        showAlert('Please enter a session ID', 'warning');
        return;
    }
    
    try {
        // Get user media
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        
        const localVideo = document.getElementById('localVideo');
        if (localVideo) {
            localVideo.srcObject = localStream;
        }
        
        // Add tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
        
        // Join consultation room
        socket.emit('join-consultation', { sessionId, userType });
        
        showAlert('Joined consultation successfully', 'success');
        updateConsultationStatus(true);
        
    } catch (error) {
        console.error('Error accessing media devices:', error);
        showAlert('Could not access camera/microphone', 'danger');
    }
}

function leaveConsultation() {
    const sessionId = document.getElementById('sessionId').value;
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    const localVideo = document.getElementById('localVideo');
    const remoteVideo = document.getElementById('remoteVideo');
    
    if (localVideo) localVideo.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    socket.emit('leave-consultation', { sessionId });
    
    showAlert('Left consultation', 'info');
    updateConsultationStatus(false);
}

// Utility Functions
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer') || createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <i class="fas fa-${getAlertIcon(type)}"></i>
        <div>${message}</div>
    `;
    
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 5000);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alertContainer';
    container.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        z-index: 1000;
        max-width: 400px;
    `;
    document.body.appendChild(container);
    return container;
}

function getAlertIcon(type) {
    const icons = {
        success: 'check-circle',
        danger: 'exclamation-triangle',
        warning: 'exclamation-circle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function updateConnectionStatus(isConnected) {
    const statusIndicator = document.querySelector('.status-indicator');
    if (statusIndicator) {
        statusIndicator.className = `status-indicator ${isConnected ? 'status-online' : 'status-offline'}`;
        statusIndicator.innerHTML = `
            <div class="status-dot"></div>
            ${isConnected ? 'System Online' : 'System Offline'}
        `;
    }
}

function loadUserInfo() {
    // Load user info from localStorage or use demo data
    const userName = localStorage.getItem('userName') || 'Demo User';
    const userRole = localStorage.getItem('userRole') || 'Healthcare Provider';
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
    
    document.getElementById('userName').textContent = userName;
    document.getElementById('userRole').textContent = userRole;
    document.getElementById('userInitials').textContent = userInitials;
}

function startDashboardUpdates() {
    // Update dashboard with demo data every 10 seconds
    setInterval(() => {
        if (document.getElementById('dashboard').classList.contains('active')) {
            const vitals = generateVitalSigns();
            updateVitalDisplay('heartRateValue', vitals.heartRate);
            updateVitalDisplay('bloodPressureValue', `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`);
            updateVitalDisplay('temperatureValue', vitals.temperature.toFixed(1));
            updateVitalDisplay('oxygenValue', vitals.oxygenSaturation);
        }
    }, 10000);
}

// Event Handlers
function handleVitalSignsUpdate(data) {
    console.log('Vital signs update:', data);
    
    if (data.alerts && data.alerts.length > 0) {
        data.alerts.forEach(alert => {
            showAlert(`Alert: ${alert.message}`, alert.severity === 'critical' ? 'danger' : 'warning');
        });
    }
    
    // Update monitoring displays
    if (data.vitalSigns) {
        if (data.vitalSigns.heartRate) {
            updateVitalDisplay('monitorHeartRate', data.vitalSigns.heartRate.value);
            updateVitalDisplay('heartRateValue', data.vitalSigns.heartRate.value);
        }
        if (data.vitalSigns.bloodPressure) {
            const bp = `${data.vitalSigns.bloodPressure.systolic}/${data.vitalSigns.bloodPressure.diastolic}`;
            updateVitalDisplay('monitorBloodPressure', bp);
            updateVitalDisplay('bloodPressureValue', bp);
        }
        if (data.vitalSigns.temperature) {
            updateVitalDisplay('monitorTemperature', data.vitalSigns.temperature.value.toFixed(1));
            updateVitalDisplay('temperatureValue', data.vitalSigns.temperature.value.toFixed(1));
        }
        if (data.vitalSigns.oxygenSaturation) {
            updateVitalDisplay('monitorOxygen', data.vitalSigns.oxygenSaturation.value);
            updateVitalDisplay('oxygenValue', data.vitalSigns.oxygenSaturation.value);
        }
    }
}

function handleEmergencyAlert(data) {
    console.log('Emergency alert:', data);
    showAlert(`🚨 EMERGENCY ALERT: ${data.description}`, 'danger');
    
    // Add to emergency list
    addEmergencyToList(data);
}

function handleCriticalVitalAlert(data) {
    console.log('Critical vital alert:', data);
    showAlert(`🚨 CRITICAL VITALS: Patient ${data.patientId}`, 'danger');
}

function addEmergencyToList(alert) {
    const emergencyList = document.getElementById('emergencyList');
    if (!emergencyList) return;
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert alert-danger';
    alertElement.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${alert.alertId}</strong><br>
                ${alert.description}<br>
                <small>Severity: ${alert.severity} | ${new Date(alert.createdAt).toLocaleString()}</small>
            </div>
            <div>
                <button class="btn btn-primary" onclick="acknowledgeEmergency('${alert.alertId}')">
                    Acknowledge
                </button>
            </div>
        </div>
    `;
    
    emergencyList.insertBefore(alertElement, emergencyList.firstChild);
}

function acknowledgeEmergency(alertId) {
    showAlert(`Emergency ${alertId} acknowledged`, 'success');
    
    // Remove from list or update status
    const alertElements = document.querySelectorAll('.alert');
    alertElements.forEach(element => {
        if (element.innerHTML.includes(alertId)) {
            element.style.opacity = '0.5';
            element.innerHTML += '<div style="color: green; font-weight: bold;">✓ ACKNOWLEDGED</div>';
        }
    });
}

// Helper functions for other features
function getCurrentSessionId() {
    return document.getElementById('sessionId')?.value || 'demo-session';
}

function updateMonitoringStatus(isActive) {
    const button = document.querySelector('[onclick="startMonitoring()"]');
    if (button) {
        if (isActive) {
            button.innerHTML = '<i class="fas fa-stop"></i> Stop Monitoring';
            button.onclick = stopMonitoring;
            button.className = 'btn btn-danger';
        } else {
            button.innerHTML = '<i class="fas fa-play"></i> Start Monitoring';
            button.onclick = startMonitoring;
            button.className = 'btn btn-primary';
        }
    }
}

function updateConsultationStatus(isActive) {
    const joinButton = document.querySelector('[onclick="joinConsultation()"]');
    const leaveButton = document.querySelector('[onclick="leaveConsultation()"]');
    
    if (joinButton && leaveButton) {
        joinButton.style.display = isActive ? 'none' : 'inline-flex';
        leaveButton.style.display = isActive ? 'inline-flex' : 'none';
    }
}

// Initialize other event handlers
function handleUserJoined(data) {
    console.log('User joined:', data);
    showAlert(`${data.userType} joined the consultation`, 'info');
}

function handleUserLeft(data) {
    console.log('User left:', data);
    showAlert(`${data.userType} left the consultation`, 'info');
}

function handleOffer(data) {
    console.log('Received offer:', data);
    // Handle WebRTC offer
}

function handleAnswer(data) {
    console.log('Received answer:', data);
    // Handle WebRTC answer
}

function handleIceCandidate(data) {
    console.log('Received ICE candidate:', data);
    // Handle ICE candidate
}

function handleConsultationMessage(data) {
    console.log('Consultation message:', data);
    // Handle chat message
}

function handleDeviceStatusUpdate(data) {
    console.log('Device status update:', data);
    if (data.status === 'error' || data.status === 'lost') {
        showAlert(`Device ${data.deviceId} has issues: ${data.status}`, 'warning');
    }
}

function handleFallDetectionAlert(data) {
    console.log('Fall detection alert:', data);
    showAlert(`🚨 FALL DETECTED: Patient ${data.patientId} (Confidence: ${(data.confidence * 100).toFixed(1)}%)`, 'danger');
}

function handleMedicationReminder(data) {
    console.log('Medication reminder:', data);
    showAlert(`💊 Medication Reminder: ${data.medicationName} - ${data.dosage}`, 'info');
}

function initializePatientMonitoring() {
    // Set default values
    document.getElementById('patientId').value = document.getElementById('patientId').value || 'demo-patient-001';
    document.getElementById('deviceId').value = document.getElementById('deviceId').value || 'demo-device-001';
}

function initializeEmergencyResponse() {
    // Set default values for emergency form
    const emergencyPatientId = document.getElementById('emergencyPatientId');
    if (emergencyPatientId && !emergencyPatientId.value) {
        emergencyPatientId.value = 'demo-patient-001';
    }
}
