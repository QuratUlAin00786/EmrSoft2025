import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.averox.com',
      port: 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: 'no-reply@averox.com',
        pass: 'Averox@123'
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || 'Cura EMR <no-reply@averox.com>',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  // Template for appointment reminders
  generateAppointmentReminderEmail(patientName: string, doctorName: string, appointmentDate: string, appointmentTime: string): EmailTemplate {
    const subject = `Appointment Reminder - ${appointmentDate}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .appointment-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>Appointment Reminder</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>This is a friendly reminder about your upcoming appointment:</p>
            
            <div class="appointment-details">
              <h3>Appointment Details</h3>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Doctor:</strong> ${doctorName}</p>
            </div>
            
            <p>Please arrive 15 minutes early for check-in.</p>
            <p>If you need to reschedule or have any questions, please contact us.</p>
            
            <p>Best regards,<br>Cura EMR Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Cura EMR by Halo Group. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${patientName},

This is a friendly reminder about your upcoming appointment:

Date: ${appointmentDate}
Time: ${appointmentTime}
Doctor: ${doctorName}

Please arrive 15 minutes early for check-in.
If you need to reschedule or have any questions, please contact us.

Best regards,
Cura EMR Team
    `;

    return { subject, html, text };
  }

  // Template for prescription notifications
  generatePrescriptionNotificationEmail(patientName: string, medicationName: string, dosage: string, instructions: string): EmailTemplate {
    const subject = `New Prescription - ${medicationName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .prescription-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>New Prescription</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>A new prescription has been issued for you:</p>
            
            <div class="prescription-details">
              <h3>Prescription Details</h3>
              <p><strong>Medication:</strong> ${medicationName}</p>
              <p><strong>Dosage:</strong> ${dosage}</p>
              <p><strong>Instructions:</strong> ${instructions}</p>
            </div>
            
            <p>Please collect your prescription from the pharmacy and follow the instructions carefully.</p>
            <p>If you have any questions about this medication, please contact your healthcare provider.</p>
            
            <p>Best regards,<br>Cura EMR Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Cura EMR by Halo Group. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${patientName},

A new prescription has been issued for you:

Medication: ${medicationName}
Dosage: ${dosage}
Instructions: ${instructions}

Please collect your prescription from the pharmacy and follow the instructions carefully.
If you have any questions about this medication, please contact your healthcare provider.

Best regards,
Cura EMR Team
    `;

    return { subject, html, text };
  }

  // Template for test results
  generateTestResultsEmail(patientName: string, testName: string, status: string): EmailTemplate {
    const subject = `Test Results Available - ${testName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .results-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>Test Results Available</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>Your test results are now available:</p>
            
            <div class="results-details">
              <h3>Test Information</h3>
              <p><strong>Test Name:</strong> ${testName}</p>
              <p><strong>Status:</strong> ${status}</p>
            </div>
            
            <p>Please log into your patient portal or contact your healthcare provider to discuss the results.</p>
            <p>If you have any questions or concerns, please don't hesitate to reach out.</p>
            
            <p>Best regards,<br>Cura EMR Team</p>
          </div>
          <div class="footer">
            <p>© 2025 Cura EMR by Halo Group. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${patientName},

Your test results are now available:

Test Name: ${testName}
Status: ${status}

Please log into your patient portal or contact your healthcare provider to discuss the results.
If you have any questions or concerns, please don't hesitate to reach out.

Best regards,
Cura EMR Team
    `;

    return { subject, html, text };
  }

  // Send appointment reminder
  async sendAppointmentReminder(patientEmail: string, patientName: string, doctorName: string, appointmentDate: string, appointmentTime: string): Promise<boolean> {
    const template = this.generateAppointmentReminderEmail(patientName, doctorName, appointmentDate, appointmentTime);
    return this.sendEmail({
      to: patientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send prescription notification
  async sendPrescriptionNotification(patientEmail: string, patientName: string, medicationName: string, dosage: string, instructions: string): Promise<boolean> {
    const template = this.generatePrescriptionNotificationEmail(patientName, medicationName, dosage, instructions);
    return this.sendEmail({
      to: patientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Send test results notification
  async sendTestResultsNotification(patientEmail: string, patientName: string, testName: string, status: string): Promise<boolean> {
    const template = this.generateTestResultsEmail(patientName, testName, status);
    return this.sendEmail({
      to: patientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
}

export const emailService = new EmailService();