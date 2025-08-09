import nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Averox email configuration
export const averoxEmailConfig: EmailConfig = {
  host: 'smtp.averox.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.AVEROX_EMAIL_USER || 'noreply@averox.com',
    pass: process.env.AVEROX_EMAIL_PASSWORD || ''
  },
  from: 'noreply@averox.com'
};

// Create transporter for Averox emails
export const createAveroxTransporter = () => {
  return nodemailer.createTransporter({
    host: averoxEmailConfig.host,
    port: averoxEmailConfig.port,
    secure: averoxEmailConfig.secure,
    auth: averoxEmailConfig.auth,
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
  });
};

// Email service for messaging functionality
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = createAveroxTransporter();
  }

  async sendEmail(options: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    attachments?: any[];
  }) {
    try {
      const result = await this.transporter.sendMail({
        from: averoxEmailConfig.from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (error) {
      console.error('Email send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendScheduledTimeUpdate(options: {
    to: string;
    patientName: string;
    oldTime: string;
    newTime: string;
    doctorName: string;
  }) {
    const subject = 'Appointment Time Update - Cura EMR';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Appointment Time Updated</h2>
        <p>Dear ${options.patientName},</p>
        <p>Your appointment time has been updated:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Previous Time:</strong> ${options.oldTime}</p>
          <p><strong>New Time:</strong> ${options.newTime}</p>
          <p><strong>Doctor:</strong> ${options.doctorName}</p>
        </div>
        <p>Please make note of this change and ensure you arrive 15 minutes early for your appointment.</p>
        <p>If you have any questions, please contact our office.</p>
        <hr style="border: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #6b7280; font-size: 12px;">
          This is an automated message from Cura EMR by Halo Group.<br>
          Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: options.to,
      subject,
      html,
    });
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connected successfully' };
    } catch (error) {
      console.error('Email verification error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}

export const emailService = new EmailService();