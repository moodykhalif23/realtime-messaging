const nodemailer = require('nodemailer');
const { email } = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    if (!email.user || !email.password) {
      console.warn('Email credentials not configured. Email notifications will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: email.host,
      port: email.port,
      secure: false,
      auth: {
        user: email.user,
        pass: email.password
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    if (!this.transporter) {
      console.log('Email service not configured. Skipping email send.');
      return;
    }

    try {
      const mailOptions = {
        from: `"Healthcare Telemedicine System" <${email.user}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  async sendAppointmentConfirmation(appointment) {
    const patientEmail = appointment.patient.userId.email;
    const patientName = `${appointment.patient.userId.firstName} ${appointment.patient.userId.lastName}`;
    const providerName = `${appointment.provider.userId.firstName} ${appointment.provider.userId.lastName}`;
    const appointmentDate = new Date(appointment.scheduledDateTime).toLocaleDateString();
    const appointmentTime = new Date(appointment.scheduledDateTime).toLocaleTimeString();

    const subject = 'Appointment Confirmation - Healthcare Telemedicine System';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Appointment Confirmation</h2>

        <p>Dear ${patientName},</p>

        <p>Your appointment has been successfully scheduled. Here are the details:</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c5aa0;">Appointment Details</h3>
          <p><strong>Appointment ID:</strong> ${appointment.appointmentId}</p>
          <p><strong>Provider:</strong> Dr. ${providerName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
          <p><strong>Type:</strong> ${appointment.type.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Reason:</strong> ${appointment.reason}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0066cc;">Important Reminders</h4>
          <ul>
            <li>Please join the consultation 5 minutes before your scheduled time</li>
            <li>Ensure you have a stable internet connection for video consultations</li>
            <li>Have your medical history and current medications list ready</li>
            <li>If you need to cancel or reschedule, please do so at least 24 hours in advance</li>
          </ul>
        </div>

        <p>If you have any questions or need to make changes to your appointment, please contact our support team.</p>

        <p>Best regards,<br>Healthcare Telemedicine System Team</p>

        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 12px; color: #666;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;

    return await this.sendEmail(patientEmail, subject, html);
  }

  async sendAppointmentReminder(appointment, reminderType = '24h') {
    const patientEmail = appointment.patient.userId.email;
    const patientName = `${appointment.patient.userId.firstName} ${appointment.patient.userId.lastName}`;
    const providerName = `${appointment.provider.userId.firstName} ${appointment.provider.userId.lastName}`;
    const appointmentDate = new Date(appointment.scheduledDateTime).toLocaleDateString();
    const appointmentTime = new Date(appointment.scheduledDateTime).toLocaleTimeString();

    let reminderText = '';
    switch (reminderType) {
      case '24h':
        reminderText = 'tomorrow';
        break;
      case '1h':
        reminderText = 'in 1 hour';
        break;
      case '15m':
        reminderText = 'in 15 minutes';
        break;
      default:
        reminderText = 'soon';
    }

    const subject = `Appointment Reminder - ${reminderText}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Appointment Reminder</h2>

        <p>Dear ${patientName},</p>

        <p>This is a friendly reminder that you have an appointment scheduled ${reminderText}.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c5aa0;">Appointment Details</h3>
          <p><strong>Provider:</strong> Dr. ${providerName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
          <p><strong>Type:</strong> ${appointment.type.replace('_', ' ').toUpperCase()}</p>
        </div>

        ${reminderType === '15m' ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Ready to join?</strong> Please prepare for your consultation and ensure you have a stable internet connection.</p>
          </div>
        ` : ''}

        <p>If you need to cancel or reschedule, please contact us as soon as possible.</p>

        <p>Best regards,<br>Healthcare Telemedicine System Team</p>
      </div>
    `;

    return await this.sendEmail(patientEmail, subject, html);
  }

  async sendAppointmentCancellation(appointment, cancelledBy, reason) {
    const patientEmail = appointment.patient.userId.email;
    const patientName = `${appointment.patient.userId.firstName} ${appointment.patient.userId.lastName}`;
    const providerName = `${appointment.provider.userId.firstName} ${appointment.provider.userId.lastName}`;
    const appointmentDate = new Date(appointment.scheduledDateTime).toLocaleDateString();
    const appointmentTime = new Date(appointment.scheduledDateTime).toLocaleTimeString();

    const subject = 'Appointment Cancellation Notice';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Appointment Cancellation</h2>

        <p>Dear ${patientName},</p>

        <p>We regret to inform you that your appointment has been cancelled.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #dc3545;">Cancelled Appointment Details</h3>
          <p><strong>Provider:</strong> Dr. ${providerName}</p>
          <p><strong>Date:</strong> ${appointmentDate}</p>
          <p><strong>Time:</strong> ${appointmentTime}</p>
          <p><strong>Cancelled by:</strong> ${cancelledBy}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0066cc;">Next Steps</h4>
          <p>Please contact our support team to reschedule your appointment or if you have any questions about this cancellation.</p>
        </div>

        <p>We apologize for any inconvenience this may cause.</p>

        <p>Best regards,<br>Healthcare Telemedicine System Team</p>
      </div>
    `;

    return await this.sendEmail(patientEmail, subject, html);
  }

  async sendWelcomeEmail(user, userType) {
    const subject = `Welcome to Healthcare Telemedicine System`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c5aa0;">Welcome to Healthcare Telemedicine System</h2>

        <p>Dear ${user.firstName} ${user.lastName},</p>

        <p>Welcome to our Healthcare Telemedicine System! We're excited to have you join our platform.</p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c5aa0;">Your Account Details</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Role:</strong> ${userType}</p>
          <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #0066cc;">Getting Started</h4>
          ${userType === 'patient' ? `
            <ul>
              <li>Complete your medical profile</li>
              <li>Add your emergency contact information</li>
              <li>Browse available healthcare providers</li>
              <li>Schedule your first appointment</li>
            </ul>
          ` : `
            <ul>
              <li>Complete your professional profile</li>
              <li>Set your availability schedule</li>
              <li>Upload your credentials and certifications</li>
              <li>Start accepting patient appointments</li>
            </ul>
          `}
        </div>

        <p>If you have any questions or need assistance, our support team is here to help.</p>

        <p>Best regards,<br>Healthcare Telemedicine System Team</p>
      </div>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new EmailService();
