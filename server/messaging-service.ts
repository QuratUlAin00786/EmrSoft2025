import twilio from 'twilio';

// Initialize Twilio client with proper error handling
const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

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
          error: 'SMS service not configured. Please check Twilio credentials.'
        };
      }

      // Validate phone number format
      const phoneNumber = this.formatPhoneNumber(to);
      
      const messageOptions: any = {
        body: message,
        from: this.twilioFromNumber,
        to: phoneNumber,
      };

      // Set priority (affects delivery speed)
      if (priority === 'high') {
        messageOptions.statusCallback = process.env.TWILIO_STATUS_CALLBACK_URL;
        messageOptions.statusCallbackMethod = 'POST';
      }

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send SMS'
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
          error: 'WhatsApp service not configured. Please check Twilio credentials.'
        };
      }

      const phoneNumber = this.formatPhoneNumber(to);
      const whatsappTo = `whatsapp:${phoneNumber}`;
      
      const messageOptions: any = {
        body: message,
        from: this.whatsappFromNumber,
        to: whatsappTo,
      };

      const twilioMessage = await client.messages.create(messageOptions);

      return {
        success: true,
        messageId: twilioMessage.sid,
        cost: parseFloat(twilioMessage.price || '0')
      };
    } catch (error: any) {
      console.error('WhatsApp sending error:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
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
   * Format phone number for Twilio
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add + if not present and assume it's a UK number if no country code
    if (!cleaned.startsWith('44') && cleaned.length === 10) {
      return `+44${cleaned}`;
    } else if (cleaned.startsWith('44')) {
      return `+${cleaned}`;
    } else if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+${cleaned}`;
    }
    
    return `+${cleaned}`;
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
        return null;
      }
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      return {
        balance: account.balance,
        status: account.status,
        subresourceUris: account.subresourceUris
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      return null;
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