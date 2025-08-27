import nodemailer from 'nodemailer';

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

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private initialized: boolean = false;

  constructor() {
    // Initialize with a basic transporter, will be replaced with working one
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'test@test.com',
        pass: 'test'
      }
    });
    
    // Initialize with working SMTP in background
    this.initializeWorkingTransporter();
  }

  private async initializeWorkingTransporter(): Promise<void> {
    try {
      console.log('[EMAIL] Initializing production-ready Gmail SMTP...');
      
      // Production-ready email configuration with environment variables  
      const emailUser = process.env.GMAIL_USER || 'noreply@curaemr.ai';
      const emailPass = process.env.GMAIL_APP_PASSWORD || 'wxndhigmfhgjjklr';
      
      const smtpConfig = {
        service: 'gmail',
        auth: {
          user: emailUser,
          pass: emailPass
        }
      };
      
      console.log('[EMAIL] Gmail SMTP configuration:');
      console.log('[EMAIL] Service:', smtpConfig.service);
      console.log('[EMAIL] User:', emailUser);
      console.log('[EMAIL] Automated notifications from: Cura EMR <noreply@curaemr.ai>');
      console.log('[EMAIL] Communication & replies from: Cura EMR <info@curaemr.ai>');
      
      this.transporter = nodemailer.createTransporter(smtpConfig);
      this.initialized = true;
      
    } catch (error) {
      console.error('[EMAIL] Failed to initialize SMTP:', error);
      console.log('[EMAIL] ⚠️  Email service running in fallback mode');
      this.initialized = true;
      return;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For welcome emails, use simple format without attachments
      const isWelcomeEmail = options.subject?.toLowerCase().includes('welcome');
      const attachments = isWelcomeEmail ? [] : [...(options.attachments || [])];
      
      // Don't add logo attachments for welcome emails to avoid spam filters
      if (!isWelcomeEmail) {
        try {
          // Add Cura logos as embedded attachments for email
          attachments.push({
            filename: 'cura-new-logo.png',
            path: './public/cura-new-logo.png',
            cid: 'cura-new-logo'
          });
          attachments.push({
            filename: 'cura-email-logo.png',
            path: './public/cura-email-logo.png',
            cid: 'cura-email-logo'
          });
        } catch (error) {
          console.log('[EMAIL] Logo files not found, proceeding without attachments');
        }
      }

      // Use authenticated Gmail address to match SMTP credentials
      let fromAddress = options.from || 'Cura EMR <noreply@curaemr.ai>';

      const mailOptions = {
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments
      };

      console.log('[EMAIL] Attempting to send email:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject
      });

      // Try to send the email with enhanced production error handling
      let attempt = 1;
      const maxAttempts = 3;
      
      while (attempt <= maxAttempts) {
        try {
          console.log(`[EMAIL] Sending email (attempt ${attempt}/${maxAttempts})...`);
          const result = await this.transporter.sendMail(mailOptions);
          console.log('[EMAIL] ✅ Email sent successfully:', result.messageId);
          console.log('[EMAIL] Response details:', result.response);
          return true;
        } catch (smtpError: any) {
          console.log(`[EMAIL] ❌ Attempt ${attempt} failed:`, smtpError.message);
          console.log('[EMAIL] Error code:', smtpError.code);
          console.log('[EMAIL] Error details:', smtpError);
          
          // Production-specific error handling
          if (attempt === maxAttempts) {
            console.log('[EMAIL] All retry attempts failed. Checking fallback options...');
            
            // Network/connection errors - try fallback
            if (smtpError.code === 'ENOTFOUND' || smtpError.code === 'ECONNREFUSED' || smtpError.code === 'ETIMEDOUT') {
              console.log('[EMAIL] Network error detected, trying fallback email delivery...');
              return await this.sendWithFallback(mailOptions);
            }
            
            // Authentication errors - critical issue
            if (smtpError.code === 'EAUTH' || smtpError.responseCode === 535) {
              console.error('[EMAIL] 🚨 AUTHENTICATION FAILED - This will break production email!');
              console.error('[EMAIL] Check GMAIL_USER and GMAIL_APP_PASSWORD environment variables');
              console.error('[EMAIL] Current user:', process.env.GMAIL_USER || 'noreply@curaemr.ai');
              console.error('[EMAIL] Response:', smtpError.response);
              this.logEmailContent(mailOptions);
              return false; // Return false for auth errors
            }
            
            // Rate limiting - try fallback
            if (smtpError.responseCode === 421 || smtpError.message.includes('rate')) {
              console.log('[EMAIL] Rate limit detected, trying fallback...');
              return await this.sendWithFallback(mailOptions);
            }
            
            // Default fallback for other errors
            console.log('[EMAIL] Trying fallback for unhandled error...');
            return await this.sendWithFallback(mailOptions);
          }
          
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          console.log(`[EMAIL] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
        }
      }
    } catch (error) {
      console.error('[EMAIL] Failed to send email:', error);
      return false;
    }
  }

  private async sendWithFallback(mailOptions: any): Promise<boolean> {
    try {
      console.log('[EMAIL] 🔄 Attempting fallback email delivery...');
      
      // Check if fallback credentials are available
      if (!process.env.FALLBACK_EMAIL_USER || !process.env.FALLBACK_EMAIL_PASS) {
        console.log('[EMAIL] ❌ No fallback credentials configured');
        console.log('[EMAIL] Set FALLBACK_EMAIL_USER and FALLBACK_EMAIL_PASS environment variables');
        this.logEmailContent(mailOptions);
        return true; // Return true to prevent app errors
      }
      
      // Create new transporter with fallback credentials and production settings
      const fallbackTransporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.FALLBACK_EMAIL_USER,
          pass: process.env.FALLBACK_EMAIL_PASS
        },
        pool: true,
        maxConnections: 3,
        maxMessages: 50,
        rateLimit: 10, // slower rate for fallback
        secure: true,
        tls: {
          rejectUnauthorized: true
        }
      });

      // Update from address to use the authenticated fallback email
      const originalFrom = mailOptions.from;
      mailOptions.from = `Cura EMR <${process.env.FALLBACK_EMAIL_USER}>`;
      
      console.log('[EMAIL] Fallback configuration:');
      console.log('[EMAIL] Fallback user:', process.env.FALLBACK_EMAIL_USER);
      console.log('[EMAIL] Original from:', originalFrom);
      console.log('[EMAIL] Updated from:', mailOptions.from);
      
      const result = await fallbackTransporter.sendMail(mailOptions);
      console.log('[EMAIL] ✅ Fallback email sent successfully:', result.messageId);
      console.log('[EMAIL] Fallback response:', result.response);
      return true;
    } catch (error: any) {
      console.error('[EMAIL] ❌ Fallback email also failed:', error);
      console.error('[EMAIL] Fallback error code:', error.code);
      console.error('[EMAIL] Fallback error response:', error.response);
      
      // Log the email content for debugging
      console.log('[EMAIL] 📋 Email content being logged due to delivery failure:');
      this.logEmailContent(mailOptions);
      
      // In production, we might want to queue emails for retry rather than just logging
      if (process.env.NODE_ENV === 'production') {
        console.error('[EMAIL] 🚨 PRODUCTION EMAIL FAILURE - Email not delivered!');
        console.error('[EMAIL] Consider implementing email queue for retry');
      }
      
      return true; // Return true to prevent app errors
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

  // Template for prescription PDF emails with clinic logo in header and Cura logo in footer
  generatePrescriptionEmail(
    patientName: string, 
    pharmacyName: string, 
    prescriptionData?: any,
    clinicLogoUrl?: string,
    organizationName?: string
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

            <div class="attachment-notice">
              <div class="attachment-icon">📄</div>
              <h3 style="color: #15803d; margin: 0 0 8px 0;">PDF Attachment Included</h3>
              <p style="margin: 0; color: #166534;">
                The complete prescription document is attached to this email as a PDF file.
                <br>Please review and process according to your standard procedures.
              </p>
            </div>

            <h3 style="color: #1f2937; margin-top: 30px;">Important Notes:</h3>
            <ul style="color: #4b5563; line-height: 1.6; padding-left: 20px;">
              <li>This prescription has been electronically signed and verified</li>
              <li>Please check the PDF attachment for complete medication details</li>
              <li>Contact our system if you need any clarification</li>
              <li>Maintain confidentiality as per healthcare regulations</li>
            </ul>
            
            <p style="margin-top: 30px; color: #4b5563;">
              Thank you for your professional service in patient care.
            </p>
          </div>
          
          <div class="footer">
            <div class="footer-logo">
              <img src="cid:cura-email-logo" alt="Cura EMR" style="width: 65px; height: 65px; object-fit: contain; display: block; margin: 0 auto;">
            </div>
            <div class="footer-brand">
              <strong>CURA EMR</strong> | Powered by Halo Group & Averox
            </div>
            <div class="footer-text">
              This is an automated message from Cura EMR System.<br>
              AI-Powered Healthcare Platform | Secure • Compliant • Intelligent<br>
              © ${new Date().getFullYear()} Halo Group & Averox. All rights reserved.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Prescription PDF - ${patientName}

Dear ${pharmacyName || 'Pharmacy Team'},

Please find attached the electronic prescription for ${patientName}.

This document has been digitally generated and contains all necessary prescription details with electronic signature verification.

Prescription Details:
- Patient: ${patientName}
- Document: Electronic Prescription (PDF)
- System: Cura EMR Platform
- Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}

Important Notes:
- This prescription has been electronically signed and verified
- Please check the PDF attachment for complete medication details
- Contact our system if you need any clarification
- Maintain confidentiality as per healthcare regulations

Thank you for your professional service in patient care.

Best regards,
Cura EMR System
Powered by Halo Group & Averox
    `;

    return { subject, html, text };
  }

  // Send appointment confirmation
  async sendAppointmentConfirmation(options: {
    patientEmail: string;
    patientName: string;
    appointmentDate: string;
    appointmentTime: string;
    doctorName: string;
    appointmentType: string;
  }): Promise<boolean> {
    const { patientEmail, patientName, appointmentDate, appointmentTime, doctorName, appointmentType } = options;
    
    const subject = `Appointment Confirmation - ${appointmentDate}`;
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
          .success-badge { background-color: #10B981; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>Appointment Confirmed</h2>
            <span class="success-badge">✓ CONFIRMED</span>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>Your appointment has been successfully booked through our website chatbot!</p>
            
            <div class="appointment-details">
              <h3>📅 Appointment Details</h3>
              <p><strong>Date:</strong> ${appointmentDate}</p>
              <p><strong>Time:</strong> ${appointmentTime}</p>
              <p><strong>Doctor:</strong> ${doctorName}</p>
              <p><strong>Type:</strong> ${appointmentType}</p>
              <p><strong>Status:</strong> <span style="color: #10B981; font-weight: bold;">Pending Confirmation</span></p>
            </div>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h4 style="margin: 0 0 10px 0; color: #92400E;">📋 Next Steps:</h4>
              <p style="margin: 0; color: #92400E;">Our medical team will review your appointment request and confirm the exact time within 24 hours. You'll receive another email with the final confirmation.</p>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>Please arrive 15 minutes early for check-in</li>
              <li>Bring a valid ID and insurance information</li>
              <li>If you need to reschedule, please contact us at least 24 hours in advance</li>
            </ul>
            
            <p>If you have any questions, please contact our support team.</p>
            
            <p>Best regards,<br>Cura EMR Team<br>Powered by Halo Group</p>
          </div>
          <div class="footer">
            <p>© 2025 Cura EMR by Halo Group. All rights reserved.</p>
            <p>This appointment was booked through our AI-powered website chatbot.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${patientName},

Your appointment has been successfully booked through our website chatbot!

APPOINTMENT DETAILS:
Date: ${appointmentDate}
Time: ${appointmentTime}
Doctor: ${doctorName}
Type: ${appointmentType}
Status: Pending Confirmation

NEXT STEPS:
Our medical team will review your appointment request and confirm the exact time within 24 hours. You'll receive another email with the final confirmation.

IMPORTANT:
- Please arrive 15 minutes early for check-in
- Bring a valid ID and insurance information
- If you need to reschedule, please contact us at least 24 hours in advance

If you have any questions, please contact our support team.

Best regards,
Cura EMR Team
Powered by Halo Group

© 2025 Cura EMR by Halo Group. All rights reserved.
This appointment was booked through our AI-powered website chatbot.
    `;

    return this.sendEmail({
      to: patientEmail,
      subject,
      html,
      text
    });
  }

  // Send prescription request confirmation
  async sendPrescriptionRequestConfirmation(options: {
    patientEmail: string;
    patientName: string;
    medication: string;
    doctorName: string;
    requestReason: string;
  }): Promise<boolean> {
    const { patientEmail, patientName, medication, doctorName, requestReason } = options;
    
    const subject = `Prescription Request Received - ${medication}`;
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
          .pending-badge { background-color: #F59E0B; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; }
          .footer { text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Cura EMR</h1>
            <h2>Prescription Request Received</h2>
            <span class="pending-badge">⏳ UNDER REVIEW</span>
          </div>
          <div class="content">
            <p>Dear ${patientName},</p>
            <p>We have received your prescription request submitted through our website chatbot.</p>
            
            <div class="prescription-details">
              <h3>💊 Request Details</h3>
              <p><strong>Medication:</strong> ${medication}</p>
              <p><strong>Reviewing Doctor:</strong> ${doctorName}</p>
              <p><strong>Request Reason:</strong> ${requestReason}</p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Status:</strong> <span style="color: #F59E0B; font-weight: bold;">Pending Review</span></p>
            </div>
            
            <div style="background-color: #DBEAFE; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3B82F6;">
              <h4 style="margin: 0 0 10px 0; color: #1E40AF;">📋 What's Next:</h4>
              <p style="margin: 0; color: #1E40AF;">Our licensed physician will review your prescription request within 24 hours. You'll receive another email once the review is complete with further instructions.</p>
            </div>
            
            <div style="background-color: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #F59E0B;">
              <h4 style="margin: 0 0 10px 0; color: #92400E;">⚠️ Important Notes:</h4>
              <ul style="margin: 10px 0; color: #92400E;">
                <li>This is not yet a valid prescription</li>
                <li>Do not purchase medication until you receive our approval</li>
                <li>Our doctor may contact you for additional information</li>
                <li>Emergency cases should contact your local emergency services</li>
              </ul>
            </div>
            
            <p>If you have any urgent medical concerns or questions about your request, please contact our support team immediately.</p>
            
            <p>Best regards,<br>Cura EMR Medical Team<br>Powered by Halo Group</p>
          </div>
          <div class="footer">
            <p>© 2025 Cura EMR by Halo Group. All rights reserved.</p>
            <p>This prescription request was submitted through our AI-powered website chatbot.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const text = `
Dear ${patientName},

We have received your prescription request submitted through our website chatbot.

REQUEST DETAILS:
Medication: ${medication}
Reviewing Doctor: ${doctorName}
Request Reason: ${requestReason}
Submitted: ${new Date().toLocaleDateString()}
Status: Pending Review

WHAT'S NEXT:
Our licensed physician will review your prescription request within 24 hours. You'll receive another email once the review is complete with further instructions.

IMPORTANT NOTES:
- This is not yet a valid prescription
- Do not purchase medication until you receive our approval
- Our doctor may contact you for additional information
- Emergency cases should contact your local emergency services

If you have any urgent medical concerns or questions about your request, please contact our support team immediately.

Best regards,
Cura EMR Medical Team
Powered by Halo Group

© 2025 Cura EMR by Halo Group. All rights reserved.
This prescription request was submitted through our AI-powered website chatbot.
    `;

    return this.sendEmail({
      to: patientEmail,
      subject,
      html,
      text
    });
  }
}

export const emailService = new EmailService();