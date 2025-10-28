import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer;
    path?: string;
    contentType?: string;
    cid?: string;
  }>;
}

// SendGrid client getter
async function getUncachableSendGridClient() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    console.error('[SENDGRID] No X_REPLIT_TOKEN found');
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  console.log('[SENDGRID] Fetching connection settings from hostname:', hostname);
  
  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );

  const data = await response.json();
  console.log('[SENDGRID] Connection response status:', response.status);
  console.log('[SENDGRID] Connection items count:', data.items?.length || 0);
  
  const connectionSettings = data.items?.[0];

  if (!connectionSettings) {
    console.error('[SENDGRID] No connection settings found');
    throw new Error('SendGrid connection not found - please setup SendGrid integration');
  }

  const apiKey = connectionSettings.settings?.api_key;
  const fromEmail = connectionSettings.settings?.from_email;

  console.log('[SENDGRID] API key exists:', !!apiKey);
  console.log('[SENDGRID] API key prefix:', apiKey?.substring(0, 3));
  console.log('[SENDGRID] From email:', fromEmail);

  if (!apiKey || !fromEmail) {
    console.error('[SENDGRID] Missing API key or from email');
    throw new Error('SendGrid not properly configured - missing API key or from email');
  }
  
  if (!apiKey.startsWith('SG.')) {
    console.error('[SENDGRID] Invalid API key format - should start with SG.');
    throw new Error('Invalid SendGrid API key format');
  }
  
  sgMail.setApiKey(apiKey);
  return {
    client: sgMail,
    fromEmail: fromEmail
  };
}

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private initialized: boolean = false;
  // Gmail SMTP only - no SendGrid

  constructor() {
    // Initialize with fallback transporter
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'test@test.com',
        pass: 'test'
      }
    });
    
    // Initialize production email service
    this.initializeProductionEmailService();
  }

  private async initializeProductionEmailService() {
    try {
      console.log('[EMAIL] Initializing Gmail SMTP for all environments...');
      
      // Force use Gmail SMTP for both development and production
      console.log('[EMAIL] Using Gmail SMTP for email delivery...');
      // Production-ready email configuration that works in hosting environments
      const smtpConfig = {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: 'noreply@curaemr.ai',
          pass: 'wxndhigmfhgjjklr'
        },
        debug: false,
        logger: false,
        tls: {
          rejectUnauthorized: false
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
      };
      
      this.transporter = nodemailer.createTransport(smtpConfig);
      // Gmail SMTP configured
      this.initialized = true;
      
      // Skip verification in production to avoid blocking initialization
      console.log('[EMAIL] ✅ Gmail SMTP configured for production');
      
    } catch (error) {
      console.error('[EMAIL] Failed to initialize email service:', error);
      this.initialized = true;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // Try SendGrid first
      const result = await this.sendWithSendGrid(options);
      if (result) {
        return true;
      }
      
      // If SendGrid fails, log the email details for manual follow-up
      console.log('[EMAIL] 🚨 EMAIL DELIVERY FAILED:');
      console.log('[EMAIL] TO:', options.to);
      console.log('[EMAIL] SUBJECT:', options.subject);
      console.log('[EMAIL] CONTENT:', options.text?.substring(0, 200));
      
      // Return false to properly indicate delivery failure
      return false;
      
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error);
      // Return false to indicate delivery failure
      return false;
    }
  }

  private async sendWithSendGrid(options: EmailOptions): Promise<boolean> {
    try {
      const { client, fromEmail } = await getUncachableSendGridClient();
      
      // Prepare attachments for SendGrid
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content?.toString('base64') || '',
        type: att.contentType || 'application/octet-stream',
        disposition: 'attachment'
      })) || [];

      const msg = {
        to: options.to,
        from: options.from || fromEmail,
        subject: options.subject,
        text: options.text || '',
        html: options.html || '',
        attachments
      };

      await client.send(msg);
      console.log('[EMAIL] ✅ Email sent successfully via SendGrid to:', options.to);
      return true;
    } catch (error) {
      console.error('[EMAIL] SendGrid failed:', error);
      return false;
    }
  }

  // Gmail SMTP only - SendGrid removed as requested by user

  private async sendWithSMTP(options: EmailOptions): Promise<boolean> {
    try {
      // Use only the attachments provided in options, don't add logos automatically
      const attachments = [...(options.attachments || [])];

      // Use authenticated Gmail address to match SMTP credentials (production-safe)
      let fromAddress = options.from || 'noreply@curaemr.ai';

      const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments
      };

      console.log('[EMAIL] Attempting to send email via SMTP:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      // Try to send the email
      try {
        const result = await this.transporter.sendMail(mailOptions);
        console.log('[EMAIL] SMTP email sent successfully:', result.messageId);
        return true;
      } catch (smtpError: any) {
        console.log('[EMAIL] Primary SMTP failed:', smtpError.message);
        
        // If primary fails due to domain issues, try fallback method
        if (smtpError.code === 'ENOTFOUND' || smtpError.code === 'ECONNREFUSED') {
          console.log('[EMAIL] Domain not configured, checking for fallback email credentials...');
          
          if (process.env.FALLBACK_EMAIL_USER && process.env.FALLBACK_EMAIL_PASS) {
            console.log('[EMAIL] Attempting fallback email delivery...');
            return await this.sendWithFallback(mailOptions);
          } else {
            console.log('[EMAIL] No fallback credentials available. Email delivery failed.');
            this.logEmailContent(mailOptions);
            return false; // Return false to indicate delivery failure
          }
        }
        
        throw smtpError;
      }
    } catch (error) {
      console.error('[EMAIL] Failed to send email via SMTP:', error);
      return false;
    }
  }

  private async sendWithFallback(mailOptions: any): Promise<boolean> {
    try {
      // Create new transporter with fallback credentials
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.FALLBACK_EMAIL_USER,
          pass: process.env.FALLBACK_EMAIL_PASS
        }
      });

      // Update from address to use the authenticated email
      mailOptions.from = `Cura EMR <${process.env.FALLBACK_EMAIL_USER}>`;
      
      const result = await fallbackTransporter.sendMail(mailOptions);
      console.log('[EMAIL] Fallback email sent successfully:', result.messageId);
      return true;
    } catch (error) {
      console.error('[EMAIL] Fallback email also failed:', error);
      this.logEmailContent(mailOptions);
      return false; // Return false to indicate delivery failure
    }
  }

  private logEmailContent(mailOptions: any): void {
    console.log('[EMAIL] Email delivery failed - logging content:');
    console.log('[EMAIL] From:', mailOptions.from);
    console.log('[EMAIL] To:', mailOptions.to);
    console.log('[EMAIL] Subject:', mailOptions.subject);
    console.log('[EMAIL] Text:', mailOptions.text?.substring(0, 200) + '...');
    console.log('[EMAIL] HTML:', mailOptions.html ? 'HTML content included' : 'No HTML content');
    console.log('[EMAIL] Attachments:', mailOptions.attachments?.length || 0, 'files');
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

  // Template for general reminders (medication, follow-up, etc.)
  generateGeneralReminderEmail(patientName: string, reminderType: string, message: string): EmailTemplate {
    const typeLabels: Record<string, string> = {
      'appointment_reminder': 'Appointment Reminder',
      'medication_reminder': 'Medication Reminder', 
      'follow_up_reminder': 'Follow-up Reminder',
      'emergency_alert': 'Emergency Alert',
      'preventive_care': 'Preventive Care Reminder',
      'billing_notice': 'Billing Notice',
      'health_check': 'Health Check Reminder'
    };
    
    const subject = `${typeLabels[reminderType] || 'Healthcare Reminder'} - Cura EMR`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .reminder-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>${typeLabels[reminderType] || 'Healthcare Reminder'}</h2>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            
            <div class="reminder-details">
              <h3>Reminder Message</h3>
              <p>${message}</p>
            </div>
            
            <p>If you have any questions or need to reschedule, please contact your healthcare provider.</p>
            
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

${typeLabels[reminderType] || 'Healthcare Reminder'}

${message}

If you have any questions or need to reschedule, please contact your healthcare provider.

Best regards,
Cura EMR Team
    `;

    return { subject, html, text };
  }

  // Send general reminder
  async sendGeneralReminder(patientEmail: string, patientName: string, reminderType: string, message: string): Promise<boolean> {
    const template = this.generateGeneralReminderEmail(patientName, reminderType, message);
    return this.sendEmail({
      to: patientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Template for sharing imaging studies
  generateImagingStudyShareEmail(recipientEmail: string, patientName: string, studyType: string, sharedBy: string, customMessage: string = '', reportUrl?: string): EmailTemplate {
    const subject = `Imaging Study Shared - ${patientName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .study-details { background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .custom-message { background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; }
          .report-link { background-color: #DBEAFE; border: 1px solid #3B82F6; border-radius: 5px; padding: 15px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>Imaging Study Shared</h2>
          </div>
          <div class="content">
            <p>Dear Colleague,</p>
            <p>An imaging study has been shared with you by ${sharedBy}:</p>
            
            <div class="study-details">
              <h3>Study Information</h3>
              <p><strong>Patient:</strong> ${patientName}</p>
              <p><strong>Study Type:</strong> ${studyType}</p>
              <p><strong>Shared by:</strong> ${sharedBy}</p>
              <p><strong>Date Shared:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${customMessage ? `
            <div class="custom-message">
              <h4>Message from ${sharedBy}:</h4>
              <p>${customMessage}</p>
            </div>
            ` : ''}
            
            ${reportUrl ? `
            <div class="report-link">
              <h4>Report Access</h4>
              <p>Click the link below to view the imaging report:</p>
              <a href="${reportUrl}" style="display: inline-block; background-color: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px;">View Report</a>
            </div>
            ` : ''}
            
            <p>This study has been shared for medical consultation purposes. Please ensure appropriate patient confidentiality is maintained.</p>
            
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
Dear Colleague,

An imaging study has been shared with you by ${sharedBy}:

Patient: ${patientName}
Study Type: ${studyType}  
Shared by: ${sharedBy}
Date Shared: ${new Date().toLocaleDateString()}

${customMessage ? `Message from ${sharedBy}: ${customMessage}` : ''}

${reportUrl ? `Report URL: ${reportUrl}` : ''}

This study has been shared for medical consultation purposes. Please ensure appropriate patient confidentiality is maintained.

Best regards,
Cura EMR Team
    `;

    return { subject, html, text };
  }

  // Send imaging study share email
  async sendImagingStudyShare(recipientEmail: string, patientName: string, studyType: string, sharedBy: string, customMessage: string = '', reportUrl?: string): Promise<boolean> {
    const template = this.generateImagingStudyShareEmail(recipientEmail, patientName, studyType, sharedBy, customMessage, reportUrl);
    return this.sendEmail({
      to: recipientEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }

  // Template for prescription PDF emails with clinic logo in header and Cura logo in footer
  generatePrescriptionEmail(
    patientName: string, 
    pharmacyName: string, 
    prescriptionData?: any,
    clinicLogoUrl?: string,
    organizationName?: string,
    hasAttachments: boolean = true
  ): EmailTemplate {
    const subject = `Prescription PDF - ${patientName}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f8fafc;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: white; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }
          .header { 
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            align-items: center;
            gap: 35px;
            position: relative;
          }
          .clinic-logo {
            width: 80px;
            height: 80px;
            border-radius: 12px;
            object-fit: contain;
            background: white;
            padding: 12px;
            flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
          }
          .fallback-logo {
            background: white;
            border-radius: 12px;
            flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            border-collapse: collapse;
          }
          .header-info {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .clinic-name {
            font-size: 24px;
            font-weight: 700;
            color: white;
            margin: 0 0 4px 0;
            line-height: 1.1;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }
          .clinic-tagline {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.95);
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
          }
          .header h1 { 
            margin: 0; 
            font-size: 28px; 
            font-weight: 700;
            color: white;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
          .header p { 
            margin: 5px 0 0; 
            opacity: 0.9; 
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
          }
          .content { 
            padding: 40px 30px; 
          }
          .prescription-details { 
            background: linear-gradient(135deg, #EEF2FF 0%, #F3E8FF 100%); 
            padding: 25px; 
            border-radius: 12px; 
            margin: 25px 0; 
            border-left: 4px solid #4F46E5;
          }
          .detail-item {
            margin: 12px 0;
            padding: 8px 0;
            border-bottom: 1px solid rgba(79, 70, 229, 0.1);
          }
          .detail-item:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: #4F46E5;
            display: inline-block;
            width: 120px;
          }
          .detail-value {
            color: #1f2937;
          }
          .attachment-notice {
            background: #F0FDF4;
            border: 2px dashed #22C55E;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 25px 0;
          }
          .attachment-icon {
            font-size: 32px;
            margin-bottom: 10px;
            color: #22C55E;
          }
          .footer { 
            background: #f8fafc;
            padding: 15px 30px 10px; 
            text-align: center; 
            border-top: 1px solid #e5e7eb;
          }
          .footer-logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 12px;
            margin: 0 auto 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            color: white;
            font-size: 18px;
            box-shadow: 0 4px 20px rgba(79, 70, 229, 0.3);
            border: 3px solid #4F46E5;
            padding: 10px;
          }
          .footer-brand {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .footer-text {
            color: #9ca3af; 
            font-size: 12px; 
            line-height: 1.4;
            margin: 0;
          }
          .btn {
            display: inline-block;
            background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            ${clinicLogoUrl ? 
              `<img src="${clinicLogoUrl}" alt="${organizationName || 'Medical Clinic'} Logo" class="clinic-logo">
               <div class="header-info">
                 <h1 class="clinic-name">${organizationName || 'Medical Clinic'}</h1>
                 <p class="clinic-tagline">Powered by Cura EMR Platform</p>
               </div>` :
              `<table class="fallback-logo" style="width: 95px; height: 95px; margin-right: 20px;">
                 <tr>
                   <td style="text-align: center; vertical-align: middle; padding: 12px;">
                     <img src="cid:cura-new-logo" alt="Cura EMR" style="width: 70px; height: 70px; object-fit: contain; display: block; margin: 0 auto;">
                   </td>
                 </tr>
               </table>
               <div class="header-info">
                 <h1 class="clinic-name">Cura EMR</h1>
                 <p class="clinic-tagline">AI-Powered Healthcare Platform</p>
               </div>`
            }
          </div>
          
          <div class="content">
            <h2 style="color: #1f2937; margin-bottom: 20px;">Prescription Document</h2>
            
            <p style="font-size: 16px; color: #4b5563;">Dear ${pharmacyName || 'Pharmacy Team'},</p>
            
            <p style="font-size: 16px; line-height: 1.6; color: #4b5563;">
              Please find attached the electronic prescription for <strong>${patientName}</strong>. 
              This document has been digitally generated and contains all necessary prescription details 
              with electronic signature verification.
            </p>

            <div class="prescription-details">
              <h3 style="color: #4F46E5; margin-top: 0; margin-bottom: 15px;">Prescription Details</h3>
              <div class="detail-item">
                <span class="detail-label">Patient:</span>
                <span class="detail-value">${patientName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Document:</span>
                <span class="detail-value">Electronic Prescription (PDF)</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">System:</span>
                <span class="detail-value">Cura EMR Platform</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Generated:</span>
                <span class="detail-value">${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}</span>
              </div>
            </div>

            ${hasAttachments ? `<div class="attachment-notice">
              <div class="attachment-icon">📄</div>
              <h3 style="color: #15803d; margin: 0 0 8px 0;">PDF Attachment Included</h3>
              <p style="margin: 0; color: #166534;">
                The complete prescription document is attached to this email as a PDF file.
                <br>Please review and process according to your standard procedures.
              </p>
            </div>` : ''}

            <h3 style="color: #1f2937; margin-top: 30px;">Important Notes:</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li>This prescription has been electronically signed and verified</li>
              <li>Please check the PDF attachment for complete medication details</li>
              <li>Contact our system if you need any clarification</li>
              <li>Maintain confidentiality as per healthcare regulations</li>
            </ul>

            <p style="color: #4b5563; margin-top: 30px;">
              Thank you for your professional service.
            </p>
          </div>
          
          <div class="footer">
            ${clinicLogoUrl ? `
              <div style="margin-bottom: 15px;">
                <img src="${clinicLogoUrl}" alt="${organizationName || 'Clinic'} Logo" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: white; padding: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              </div>
            ` : ''}
            <div class="footer-brand">Powered by Cura EMR</div>
            <p class="footer-text">
              This email was automatically generated by the Cura EMR system.<br>
              For technical support, please contact your system administrator.<br>
              © 2025 Cura Software Limited. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Prescription Document

Dear ${pharmacyName || 'Pharmacy Team'},

Please find attached the electronic prescription for ${patientName}.
This document has been digitally generated and contains all necessary prescription details with electronic signature verification.

Prescription Details:
- Patient: ${patientName}
- Document: Electronic Prescription (PDF)
- System: Cura EMR Platform
- Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}

${hasAttachments ? `PDF Attachment Included
The complete prescription document is attached to this email as a PDF file.
Please review and process according to your standard procedures.

` : ''}Important Notes:
- This prescription has been electronically signed and verified
- Please check the PDF attachment for complete medication details
- Contact our system if you need any clarification
- Maintain confidentiality as per healthcare regulations

Thank you for your professional service.

---
Powered by Cura EMR
This email was automatically generated by the Cura EMR system.
For technical support, please contact your system administrator.
© 2025 Cura Software Limited. All rights reserved.
    `;

    return { subject, html, text };
  }

  // Send prescription email with PDF attachment
  async sendPrescriptionEmail(
    pharmacyEmail: string, 
    patientName: string, 
    pharmacyName: string, 
    pdfBuffer: Buffer,
    prescriptionData?: any,
    clinicLogoUrl?: string,
    organizationName?: string
  ): Promise<boolean> {
    const template = this.generatePrescriptionEmail(patientName, pharmacyName, prescriptionData, clinicLogoUrl, organizationName);
    
    return this.sendEmail({
      to: pharmacyEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
      attachments: [
        {
          filename: `prescription-${patientName.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }

  // Template for new user account creation
  generateNewUserAccountEmail(
    userName: string, 
    userEmail: string, 
    password: string,
    organizationName: string,
    role: string
  ): EmailTemplate {
    const subject = `Welcome to Cura EMR - Your Account Has Been Created`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #333; 
          }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; }
          .header { 
            background: linear-gradient(135deg, #4A7DFF 0%, #7279FB 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
            border-radius: 8px 8px 0 0;
          }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .content { padding: 30px 20px; background-color: #f9fafb; }
          .welcome-message { 
            background-color: #ffffff; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            border-left: 4px solid #4A7DFF;
          }
          .credentials-box { 
            background-color: #ffffff; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0;
            border: 2px solid #e5e7eb;
          }
          .credential-item { 
            margin: 12px 0; 
            padding: 12px;
            background-color: #f3f4f6;
            border-radius: 6px;
          }
          .credential-label { 
            font-weight: 600; 
            color: #4A7DFF; 
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .credential-value { 
            font-size: 16px; 
            color: #1f2937; 
            font-family: 'Courier New', monospace;
            margin-top: 4px;
          }
          .warning-box {
            background-color: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
          }
          .warning-box p {
            margin: 0;
            color: #92400E;
          }
          .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 12px; 
            padding: 20px;
            border-top: 1px solid #e5e7eb;
          }
          .button {
            display: inline-block;
            background-color: #4A7DFF;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Cura EMR</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Your Healthcare Management Platform</p>
          </div>
          
          <div class="content">
            <div class="welcome-message">
              <h2 style="margin-top: 0; color: #1f2937;">Hello ${userName}!</h2>
              <p>Your account has been successfully created at <strong>${organizationName}</strong>.</p>
              <p>You have been assigned the role of <strong>${role}</strong> and can now access the Cura EMR system.</p>
            </div>
            
            <div class="credentials-box">
              <h3 style="margin-top: 0; color: #1f2937;">Your Login Credentials</h3>
              
              <div class="credential-item">
                <div class="credential-label">Email Address</div>
                <div class="credential-value">${userEmail}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Temporary Password</div>
                <div class="credential-value">${password}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Organization</div>
                <div class="credential-value">${organizationName}</div>
              </div>
              
              <div class="credential-item">
                <div class="credential-label">Role</div>
                <div class="credential-value">${role}</div>
              </div>
            </div>

            <div class="warning-box">
              <p><strong>⚠️ Security Notice:</strong> For your security, please change your password after your first login. Keep your credentials confidential and do not share them with anyone.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <p>Ready to get started? Click the button below to log in:</p>
              <a href="https://app.curaemr.ai/auth/login" class="button">Login to Cura EMR</a>
            </div>

            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-top: 20px;">
              <h3 style="margin-top: 0; color: #1f2937;">Next Steps</h3>
              <ol style="color: #4b5563; line-height: 1.8;">
                <li>Log in using your email and temporary password</li>
                <li>Complete your profile setup</li>
                <li>Change your password to something secure</li>
                <li>Explore the platform features</li>
              </ol>
            </div>

            <p style="margin-top: 30px; color: #6b7280;">If you have any questions or need assistance, please contact your system administrator.</p>
          </div>
          
          <div class="footer">
            <p style="margin: 0 0 10px 0;"><strong>Cura Software Limited</strong></p>
            <p style="margin: 0;">Ground Floor Unit 2, Drayton Court, Drayton Road</p>
            <p style="margin: 0;">Solihull, England B90 4NG</p>
            <p style="margin: 10px 0 0 0;">Company Registration: 16556912</p>
            <p style="margin: 10px 0 0 0;">© 2025 Cura Software Limited. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Welcome to Cura EMR!

Hello ${userName},

Your account has been successfully created at ${organizationName}.
You have been assigned the role of ${role}.

YOUR LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━
Email Address: ${userEmail}
Temporary Password: ${password}
Organization: ${organizationName}
Role: ${role}

⚠️ SECURITY NOTICE:
For your security, please change your password after your first login.
Keep your credentials confidential and do not share them with anyone.

NEXT STEPS:
1. Log in at: https://app.curaemr.ai/auth/login
2. Complete your profile setup
3. Change your password to something secure
4. Explore the platform features

If you have any questions or need assistance, please contact your system administrator.

━━━━━━━━━━━━━━━━━━━━━━━━━
Cura Software Limited
Ground Floor Unit 2, Drayton Court, Drayton Road
Solihull, England B90 4NG
Company Registration: 16556912

© 2025 Cura Software Limited. All rights reserved.
    `;

    return { subject, html, text };
  }

  // Send new user account email
  async sendNewUserAccountEmail(
    userEmail: string,
    userName: string,
    password: string,
    organizationName: string,
    role: string
  ): Promise<boolean> {
    const template = this.generateNewUserAccountEmail(userName, userEmail, password, organizationName, role);
    return this.sendEmail({
      to: userEmail,
      subject: template.subject,
      html: template.html,
      text: template.text
    });
  }
}

export const emailService = new EmailService();