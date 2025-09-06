import twilio, { Twilio } from 'twilio';

// Initialize Twilio client with proper error handling and validation
let client: Twilio | null = null;
let authenticationFailed = false; // Track if authentication has failed

function initializeTwilioClient() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
    const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
    const phoneNumber = process.env.TWILIO_PHONE_NUMBER?.trim();
    
    console.log('🔧 Twilio Initialization Debug:', {
      hasSID: !!accountSid,
      sidFormat: accountSid ? `${accountSid.substring(0, 5)}...` : 'missing',
      sidLength: accountSid?.length || 0,
      hasToken: !!authToken,
      tokenLength: authToken?.length || 0,
      hasPhone: !!phoneNumber,
      phoneFormat: phoneNumber || 'missing'
    });
    
    if (accountSid && 
        authToken && 
        phoneNumber &&
        accountSid.startsWith('AC') &&
        accountSid.length >= 34) {
      
      // Reset authentication flag when reinitializing
      authenticationFailed = false;
      
      // Only create client if credentials appear valid
      client = twilio(accountSid, authToken);
      console.log('✅ Twilio client initialized - credentials will be verified on first use');
      return true;
    } else {
      console.warn('❌ Twilio credentials invalid or incomplete:', {
        hasValidSID: accountSid?.startsWith('AC') && accountSid?.length >= 34,
        hasToken: !!authToken,
        hasPhone: !!phoneNumber
      });
      return false;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Twilio client:', error);
    client = null;
    return false;
  }
}

// Initialize on startup
initializeTwilioClient();

// Export function to reset client with new credentials
export function resetTwilioClient() {
  console.log('Resetting Twilio client with new credentials...');
  authenticationFailed = false; // Reset authentication flag
  return initializeTwilioClient();
}

export interface MessageOptions {
  to: string;
  message: string;
  type: 'sms' | 'whatsapp';
  priority?: 'low' | 'normal' | 'high';
  scheduledTime?: Date;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export class MessagingService {
  private twilioFromNumber: string;
  private whatsappFromNumber: string;

  constructor() {
    this.twilioFromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.whatsappFromNumber = `whatsapp:${process.env.TWILIO_PHONE_NUMBER}` || '';
  }

  /**
   * Send SMS message
   */
  async sendSMS(to: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<MessageResult> {
    try {
      // Check if Twilio is properly configured
      if (!client) {
        console.error('Twilio client not configured - missing credentials');
        return {
          success: false,
          error: 'SMS service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      // Check current authentication status, but don't permanently block attempts
      if (authenticationFailed) {
        console.warn('Previous authentication failed - will retry with current credentials');
        authenticationFailed = false; // Reset flag to allow retry
      }

      // Additional validation for Twilio configuration
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        console.error('Twilio credentials incomplete:', {
          hasSID: !!process.env.TWILIO_ACCOUNT_SID,
          hasToken: !!process.env.TWILIO_AUTH_TOKEN,
          hasPhone: !!process.env.TWILIO_PHONE_NUMBER
        });
        return {
          success: false,
          error: 'SMS service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(to);
      console.log(`📱 Phone number formatting: "${to}" -> "${phoneNumber}"`);
      
      const messageOptions: any = {
        body: message,
        from: this.twilioFromNumber,
        to: phoneNumber,
      };

      // Note: Development environment cannot receive webhooks from Twilio
      // Status tracking will be done via direct API polling instead
      console.log('📱 SMS sent without webhook (dev environment) - will poll status directly');

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('SMS sending error:', error);
      
      // Mark credentials as invalid if authentication fails
      if (error.code === 20003 || error.message?.includes('Authentication Error')) {
        authenticationFailed = true;
        console.error('🚨 TWILIO AUTHENTICATION FAILED - DETAILED ERROR:', {
          code: error.code,
          message: error.message,
          moreInfo: error.moreInfo,
          details: error.details,
          status: error.status
        });
        
        // Check for specific payment/billing issues
        let errorMessage = 'SMS service not properly configured. ';
        if (error.code === 20003) {
          errorMessage += '🚨 POSSIBLE CAUSES: 1) Invalid Twilio credentials, 2) Account suspended due to non-payment, 3) Trial account expired/out of credit, 4) Account deactivated. Please check your Twilio Console billing and account status.';
        } else {
          errorMessage += 'Please check Twilio credentials (Account SID, Auth Token, and Phone Number).';
        }
        
        return {
          success: false,
          error: errorMessage
        };
      }
      
      // Handle other Twilio errors
      let errorMessage = error.message || 'Failed to send SMS';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check the recipient phone number.';
      } else if (error.code === 21610) {
        errorMessage = `🚫 TWILIO TRIAL ACCOUNT LIMITATION: This phone number (${to}) is not verified in your Twilio trial account. Trial accounts can only send messages to verified numbers. To fix this: 1) Verify this number in your Twilio console, or 2) Upgrade to a paid Twilio account to send to any number.`;
        console.error(`🚫 TRIAL ACCOUNT BLOCK: ${to} - ${errorMessage}`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send WhatsApp message
   */
  async sendWhatsApp(to: string, message: string, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<MessageResult> {
    try {
      // Check if Twilio is properly configured
      if (!client) {
        console.error('Twilio client not configured - missing credentials');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      // If authentication has failed before, block further attempts
      if (authenticationFailed) {
        console.error('WhatsApp blocked - Twilio credentials previously failed authentication');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }

      const phoneNumber = this.formatPhoneNumber(to);
      const whatsappTo = `whatsapp:${phoneNumber}`;
      
      const messageOptions: any = {
        body: message,
        from: this.whatsappFromNumber,
        to: whatsappTo,
      };

      // Note: Development environment cannot receive webhooks from Twilio
      // Status tracking will be done via direct API polling instead
      console.log('📱 WhatsApp sent without webhook (dev environment) - will poll status directly');

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('WhatsApp sending error:', error);
      
      // Mark credentials as invalid if authentication fails
      if (error.code === 20003 || error.message?.includes('Authentication Error')) {
        authenticationFailed = true;
        console.error('Twilio authentication failed for WhatsApp - marking credentials as invalid');
        return {
          success: false,
          error: 'WhatsApp service not properly configured. Please check Twilio credentials (Account SID, Auth Token, and Phone Number).'
        };
      }
      
      // Handle other Twilio errors
      let errorMessage = error.message || 'Failed to send WhatsApp message';
      if (error.code === 21211) {
        errorMessage = 'Invalid phone number format. Please check the recipient phone number.';
      } else if (error.code === 21610) {
        errorMessage = `🚫 TWILIO TRIAL ACCOUNT LIMITATION: This phone number (${to}) is not verified in your Twilio trial account. Trial accounts can only send messages to verified numbers. To fix this: 1) Verify this number in your Twilio console, or 2) Upgrade to a paid Twilio account to send to any number.`;
        console.error(`🚫 TRIAL ACCOUNT BLOCK: ${to} - ${errorMessage}`);
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Send message with automatic channel selection
   */
  async sendMessage(options: MessageOptions): Promise<MessageResult> {
    const { to, message, type, priority = 'normal' } = options;

    if (type === 'sms') {
      return this.sendSMS(to, message, priority);
    } else if (type === 'whatsapp') {
      return this.sendWhatsApp(to, message, priority);
    } else {
      return {
        success: false,
        error: 'Invalid message type. Use "sms" or "whatsapp"'
      };
    }
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(patientPhone: string, patientName: string, appointmentDate: string, doctorName: string, clinicName: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

This is a reminder that you have an appointment scheduled on ${appointmentDate} with ${doctorName} at ${clinicName}.

Please arrive 15 minutes early for check-in.

If you need to reschedule, please call us.

Thank you,
${clinicName}`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send lab results notification
   */
  async sendLabResultsNotification(patientPhone: string, patientName: string, clinicName: string, clinicPhone: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

Your lab results are now available for review.

Please call us at ${clinicPhone} or visit your patient portal to discuss the results with your provider.

Best regards,
${clinicName}`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send prescription ready notification
   */
  async sendPrescriptionReady(patientPhone: string, patientName: string, pharmacyName: string, pharmacyAddress: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `Hi ${patientName},

Your prescription is ready for pickup at:
${pharmacyName}
${pharmacyAddress}

Please bring a valid ID when collecting your medication.

Thank you!`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'normal'
    });
  }

  /**
   * Send emergency notification
   */
  async sendEmergencyNotification(patientPhone: string, patientName: string, urgentMessage: string, clinicPhone: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<MessageResult> {
    const message = `URGENT - ${patientName}

${urgentMessage}

Please call us immediately at ${clinicPhone} or visit our emergency department.

This is an urgent medical notification.`;

    return this.sendMessage({
      to: patientPhone,
      message,
      type,
      priority: 'high'
    });
  }

  /**
   * Format phone number for Twilio (E.164 format)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // If already properly formatted in E.164, return as-is
    if (/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      console.log(`✅ Already E.164 compliant: ${phoneNumber}`);
      return phoneNumber;
    }
    
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    console.log(`🔍 Cleaned number: "${cleaned}", length: ${cleaned.length}`);
    
    // Handle different country formats
    if (cleaned.startsWith('92')) {
      // Already has Pakistan country code
      console.log(`✅ Pakistan country code detected: +${cleaned}`);
      return `+${cleaned}`;
    } else if (cleaned.startsWith('03') && cleaned.length === 11) {
      // Pakistani mobile number (03XXXXXXXX) - convert to international  
      const formatted = `+92${cleaned.substring(1)}`;
      console.log(`✅ Pakistani mobile detected: ${cleaned} -> ${formatted}`);
      return formatted;
    } else if (cleaned.startsWith('44')) {
      // UK number
      return `+${cleaned}`;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      // US number with country code
      return `+${cleaned}`;
    } else if (cleaned.length === 10 && !cleaned.startsWith('0')) {
      // US number without country code
      return `+1${cleaned}`;
    }
    
    // If starts with + but digits were removed, try to reconstruct
    if (phoneNumber.startsWith('+')) {
      const result = `+${cleaned}`;
      console.log(`✅ Reconstructed E.164: ${phoneNumber} -> ${result}`);
      return result;
    }
    
    // Default: add + prefix if not present
    const result = `+${cleaned}`;
    console.log(`⚠️ Default formatting applied: ${cleaned} -> ${result}`);
    return result;
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageId: string): Promise<any> {
    try {
      if (!client) {
        return null;
      }
      const message = await client.messages(messageId).fetch();
      return {
        status: message.status,
        dateCreated: message.dateCreated,
        dateSent: message.dateSent,
        price: message.price,
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Error fetching message status:', error);
      return null;
    }
  }

  /**
   * Get account balance and usage
   */
  async getAccountInfo(): Promise<any> {
    try {
      if (!client || !process.env.TWILIO_ACCOUNT_SID) {
        return {
          accountType: 'unknown',
          balance: 'unknown',
          status: 'not configured',
          verifiedNumbers: []
        };
      }
      
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      // Try to get verified numbers (for trial account diagnostics)
      let verifiedNumbers = [];
      try {
        const outgoingCallerIds = await client.outgoingCallerIds.list();
        verifiedNumbers = outgoingCallerIds.map(id => id.phoneNumber);
      } catch (error) {
        console.log('Could not fetch verified numbers:', error.message);
      }
      
      return {
        accountType: account.type === 'Trial' ? 'trial' : 'paid',
        balance: account.balance,
        status: account.status,
        verifiedNumbers: verifiedNumbers
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      return {
        accountType: 'error',
        balance: 'error',
        status: 'authentication failed',
        verifiedNumbers: [],
        error: error.message
      };
    }
  }

  /**
   * Send bulk messages (for campaigns)
   */
  async sendBulkMessages(recipients: Array<{phone: string, name: string}>, message: string, type: 'sms' | 'whatsapp' = 'sms'): Promise<Array<MessageResult & {recipient: string}>> {
    const results: Array<MessageResult & {recipient: string}> = [];
    
    for (const recipient of recipients) {
      const personalizedMessage = message.replace('{{patientName}}', recipient.name);
      const result = await this.sendMessage({
        to: recipient.phone,
        message: personalizedMessage,
        type,
        priority: 'normal'
      });
      
      results.push({
        ...result,
        recipient: recipient.phone
      });
      
      // Add delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }
}

export const messagingService = new MessagingService();