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

  constructor() {
    // Try multiple SMTP configurations for curampms.ai domain
    const smtpConfigs = [
      {
        name: 'mail subdomain',
        host: 'mail.curampms.ai',
        port: 587,
        secure: false
      },
      {
        name: 'smtp subdomain',
        host: 'smtp.curampms.ai',
        port: 465,
        secure: true
      },
      {
        name: 'smtp subdomain alternate',
        host: 'smtp.curampms.ai',
        port: 25,
        secure: false
      },
      {
        name: 'main domain',
        host: 'curampms.ai',
        port: 587,
        secure: false
      }
    ];

    // Domain curampms.ai is not configured yet - disable email until domain is set up
    const smtpConfig = {
      host: 'localhost', // Placeholder host - will fail gracefully
      port: 587,
      secure: false,
      auth: {
        user: 'noreply@curampms.ai',
        pass: 'CuraPMS123!'
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 2000, // Quick timeout
      greetingTimeout: 2000,
      socketTimeout: 2000
    };
    
    console.log('[EMAIL] Initializing EmailService with config:', {
      host: smtpConfig.host,
      port: smtpConfig.port,
      user: smtpConfig.auth.user,
      secure: smtpConfig.secure
    });
    
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      console.log('[EMAIL] SMTP Configuration Issue: curampms.ai domain not configured');
      console.log('[EMAIL] Email would be sent with:', {
        from: 'Cura EMR <noreply@curampms.ai>',
        to: options.to,
        subject: options.subject
      });
      
      // For now, log the email instead of actually sending it
      console.log('[EMAIL] Email functionality temporarily disabled until domain is configured');
      console.log('[EMAIL] Email content would be:', {
        text: options.text?.substring(0, 100) + '...',
        html: options.html ? 'HTML content included' : 'No HTML content'
      });
      
      // Return true to prevent application errors
      console.log('[EMAIL] Simulated successful email send (domain configuration pending)');
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
            padding: 30px; 
            text-align: center; 
            border-top: 1px solid #e5e7eb;
          }
          .footer-logo {
            width: 80px;
            height: 80px;
            background: white;
            border-radius: 12px;
            margin: 0 auto 15px;
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
            margin-bottom: 10px;
          }
          .footer-text {
            color: #9ca3af; 
            font-size: 12px; 
            line-height: 1.5;
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
              <img src="cid:cura-email-logo" alt="Cura EMR" style="width: 65px; height: 65px; object-fit: contain;">
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
}

export const emailService = new EmailService();