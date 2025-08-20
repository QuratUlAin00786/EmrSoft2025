import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import nodemailer from 'nodemailer';

const SAAS_JWT_SECRET = process.env.SAAS_JWT_SECRET || "saas-super-secret-key-change-in-production";

// Email configuration for customer notifications
async function sendWelcomeEmail(organization: any, adminUser: any) {
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER || 'noreply@curapms.ai',
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: 'Cura EMR <noreply@curapms.ai>',
      to: adminUser.email,
      subject: `Welcome to Cura EMR - Your Account is Ready`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .credentials { background: #fff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .security-note { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏥 Welcome to Cura EMR</h1>
            <p>Your healthcare management system is ready!</p>
          </div>
          
          <div class="content">
            <h2>Hello ${adminUser.firstName} ${adminUser.lastName},</h2>
            
            <p>Congratulations! Your organization <strong>"${organization.name}"</strong> has been successfully set up in the Cura EMR system.</p>
            
            <div class="credentials">
              <h3>🔐 Your Administrator Credentials</h3>
              <p><strong>Login URL:</strong> https://${organization.subdomain}</p>
              <p><strong>Email:</strong> ${adminUser.email}</p>
              <p><strong>Temporary Password:</strong> <code style="background:#f0f0f0;padding:2px 6px;border-radius:3px;">${adminUser.tempPassword}</code></p>
            </div>
            
            <div class="security-note">
              <h4>🛡️ Important Security Notice</h4>
              <p>For security reasons, you must change your password on first login. This temporary password will expire after your initial login session.</p>
            </div>
            
            <p>Your Cura EMR system includes:</p>
            <ul>
              <li>✅ Patient Management System</li>
              <li>✅ Appointment Scheduling</li>
              <li>✅ Medical Records Management</li>
              <li>✅ Real-time Messaging</li>
              <li>✅ AI-Powered Clinical Insights</li>
              <li>✅ Comprehensive Reporting</li>
            </ul>
            
            <a href="https://${organization.subdomain}" class="button">Access Your EMR System</a>
            
            <p style="margin-top: 30px;">If you have any questions or need assistance getting started, our support team is here to help.</p>
            
            <p>Best regards,<br>
            <strong>The Cura EMR Team</strong><br>
            Cura Software Limited</p>
          </div>
          
          <div class="footer">
            <p>This email was sent to ${adminUser.email} regarding your new Cura EMR account.</p>
            <p>Cura Software Limited | Ground Floor Unit 2, Drayton Court, Drayton Road, Solihull, England B90 4NG</p>
            <p>Registration: 16556912 | For support, contact: info@curapms.ai</p>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${adminUser.email} for organization ${organization.name}`);
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
}

// Middleware to verify SaaS owner token
interface SaaSRequest extends Request {
  saasOwner?: any;
}

const verifySaaSToken = async (req: SaaSRequest, res: Response, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, SAAS_JWT_SECRET) as any;
    const owner = await storage.getSaaSOwner(decoded.id);
    
    if (!owner || !owner.isActive) {
      return res.status(401).json({ message: 'Invalid token or inactive owner' });
    }
    
    req.saasOwner = owner;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export function registerSaaSRoutes(app: Express) {
  // SaaS diagnostic endpoint for production debugging
  app.get('/api/saas/debug', async (req: Request, res: Response) => {
    try {
      const hasOwner = await storage.getSaaSOwnerByUsername('saas_admin');
      
      res.json({
        debug: true,
        environment: process.env.NODE_ENV || 'unknown',
        hasSaaSJWTSecret: !!process.env.SAAS_JWT_SECRET,
        jwtSecretLength: SAAS_JWT_SECRET.length,
        hasSaaSAdmin: !!hasOwner,
        saasAdminActive: hasOwner?.isActive || false,
        saasAdminEmail: hasOwner?.email || 'none',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('SaaS debug error:', error);
      res.status(500).json({ error: 'Debug endpoint failed', message: (error as Error).message });
    }
  });

  // SaaS Owner Login
  app.post('/api/saas/login', async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          success: false, 
          message: 'Username and password are required' 
        });
      }

      const owner = await storage.getSaaSOwnerByUsername(username);
      
      console.log('Login attempt for username:', username);
      console.log('Owner found:', !!owner);
      
      if (!owner) {
        console.log('No owner found with username:', username);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      console.log('Comparing password for owner:', owner.username);
      console.log('Stored hash:', owner.password);
      const isValidPassword = await bcrypt.compare(password, owner.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      if (!owner.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated' 
        });
      }

      // Update last login
      await storage.updateSaaSOwnerLastLogin(owner.id);

      // Generate JWT token
      const token = jwt.sign(
        { id: owner.id, username: owner.username },
        SAAS_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        owner: {
          id: owner.id,
          username: owner.username,
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
        }
      });
    } catch (error) {
      console.error('SaaS login error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Internal server error' 
      });
    }
  });

  // SaaS Dashboard Stats
  app.get('/api/saas/stats', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getSaaSStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching SaaS stats:', error);
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // Recent Activity
  app.get('/api/saas/activity', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const activity = await storage.getRecentActivity(page, limit);
      res.json(activity);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      res.status(500).json({ message: 'Failed to fetch activity' });
    }
  });

  // System Alerts
  app.get('/api/saas/alerts', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const alerts = await storage.getSystemAlerts();
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ message: 'Failed to fetch alerts' });
    }
  });

  // Users Management
  app.get('/api/saas/users', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { search, organizationId } = req.query;
      const users = await storage.getAllUsers(search as string, organizationId as string);
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.post('/api/saas/users/reset-password', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { userId } = req.body;
      const result = await storage.resetUserPassword(userId);
      res.json(result);
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  app.patch('/api/saas/users/status', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { userId, isActive } = req.body;
      const result = await storage.updateUserStatus(userId, isActive);
      res.json(result);
    } catch (error) {
      console.error('Error updating user status:', error);
      res.status(500).json({ message: 'Failed to update user status' });
    }
  });

  // Organizations/Customers Management
  app.get('/api/saas/organizations', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const organizations = await storage.getAllOrganizations();
      res.json(organizations);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      res.status(500).json({ message: 'Failed to fetch organizations' });
    }
  });

  app.get('/api/saas/customers', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { search, status } = req.query;
      const customers = await storage.getAllCustomers(search as string, status as string);
      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ message: 'Failed to fetch customers' });
    }
  });

  app.post('/api/saas/customers', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const customerData = req.body;
      
      // Validate required fields
      if (!customerData.name || !customerData.subdomain || !customerData.adminEmail) {
        return res.status(400).json({ message: 'Name, subdomain, and admin email are required' });
      }

      // Check if subdomain already exists
      const existingOrg = await storage.getOrganizationBySubdomain(customerData.subdomain);
      if (existingOrg) {
        return res.status(400).json({ message: `Subdomain '${customerData.subdomain}' is already taken. Please choose a different subdomain.` });
      }
      
      const result = await storage.createCustomerOrganization(customerData);
      
      // Send welcome email with credentials
      if (result.success && result.adminUser) {
        try {
          await sendWelcomeEmail(result.organization, result.adminUser);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
          // Don't fail the customer creation if email fails
        }
      }
      
      res.json(result);
    } catch (error: any) {
      console.error('Error creating customer:', error);
      
      // Handle specific database errors
      if (error.code === '23505' && error.detail?.includes('subdomain')) {
        return res.status(400).json({ message: `Subdomain '${req.body.subdomain}' is already taken. Please choose a different subdomain.` });
      }
      
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.patch('/api/saas/customers/:id', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      const customerData = req.body;
      
      console.log('Customer update request:', { customerId, customerData });
      
      // Check if this is a status-only update and redirect to proper endpoint
      if (customerData.organizationId && customerData.status && Object.keys(customerData).length === 2) {
        console.log('Redirecting to status update');
        const result = await storage.updateCustomerStatus(customerData.organizationId, customerData.status);
        return res.json(result);
      }
      
      const result = await storage.updateCustomerOrganization(customerId, customerData);
      res.json(result);
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({ message: 'Failed to update customer' });
    }
  });

  app.patch('/api/saas/customers/status', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { organizationId, status } = req.body;
      console.log('Status update request:', { organizationId, status });
      
      if (!organizationId || !status) {
        return res.status(400).json({ message: 'Organization ID and status are required' });
      }
      
      const result = await storage.updateCustomerStatus(organizationId, status);
      res.json(result);
    } catch (error) {
      console.error('Error updating customer status:', error);
      res.status(500).json({ message: 'Failed to update customer status' });
    }
  });

  // Packages Management
  app.get('/api/saas/packages', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const packages = await storage.getAllPackages();
      res.json(packages);
    } catch (error) {
      console.error('Error fetching packages:', error);
      res.status(500).json({ message: 'Failed to fetch packages' });
    }
  });

  // Get website-visible packages (public endpoint for pricing section)
  app.get('/api/website/packages', async (req: Request, res: Response) => {
    try {
      const packages = await storage.getWebsiteVisiblePackages();
      res.json(packages);
    } catch (error) {
      console.error('Error getting website packages:', error);
      res.status(500).json({ message: 'Failed to get website packages' });
    }
  });

  app.post('/api/saas/packages', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const packageData = req.body;
      const result = await storage.createPackage(packageData);
      res.json(result);
    } catch (error) {
      console.error('Error creating package:', error);
      res.status(500).json({ message: 'Failed to create package' });
    }
  });

  app.put('/api/saas/packages/:id', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      const packageData = req.body;
      const result = await storage.updatePackage(packageId, packageData);
      res.json(result);
    } catch (error) {
      console.error('Error updating package:', error);
      res.status(500).json({ message: 'Failed to update package' });
    }
  });

  app.delete('/api/saas/packages/:id', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const packageId = parseInt(req.params.id);
      const result = await storage.deletePackage(packageId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting package:', error);
      res.status(500).json({ message: 'Failed to delete package' });
    }
  });

  // ============================================
  // COMPREHENSIVE BILLING & PAYMENT MANAGEMENT
  // ============================================

  // Get billing statistics
  app.get('/api/saas/billing/stats', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { dateRange } = req.query;
      const stats = await storage.getBillingStats(dateRange as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching billing stats:', error);
      res.status(500).json({ message: 'Failed to fetch billing statistics' });
    }
  });

  // Get billing data (payments/invoices) - Updated endpoint
  app.get('/api/saas/billing/data', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { search, dateRange } = req.query;
      const billingData = await storage.getBillingData(search as string, dateRange as string);
      res.json(billingData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      res.status(500).json({ message: 'Failed to fetch billing data' });
    }
  });

  // Legacy billing endpoint for backwards compatibility
  app.get('/api/saas/billing', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { search, dateRange } = req.query;
      const billingData = await storage.getBillingData(search as string, dateRange as string);
      res.json(billingData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      res.status(500).json({ message: 'Failed to fetch billing data' });
    }
  });

  // Get overdue invoices
  app.get('/api/saas/billing/overdue', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      res.json(overdueInvoices);
    } catch (error) {
      console.error('Error fetching overdue invoices:', error);
      res.status(500).json({ message: 'Failed to fetch overdue invoices' });
    }
  });

  // Create a new payment
  app.post('/api/saas/billing/payments', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const paymentData = req.body;
      
      // Validate required fields
      if (!paymentData.organizationId || !paymentData.amount || !paymentData.paymentMethod) {
        return res.status(400).json({ 
          message: 'Organization ID, amount, and payment method are required' 
        });
      }

      // Ensure dates are properly formatted
      const currentTime = new Date();
      const dueDateObj = paymentData.dueDate ? new Date(paymentData.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Set payment data with proper date handling
      const processedPaymentData = {
        organizationId: parseInt(paymentData.organizationId),
        invoiceNumber: paymentData.invoiceNumber || `INV-${Date.now()}`,
        amount: paymentData.amount.toString(),
        currency: paymentData.currency || 'GBP',
        paymentMethod: paymentData.paymentMethod,
        paymentStatus: paymentData.paymentStatus || 'pending',
        description: paymentData.description || 'Payment for Cura EMR Services',
        dueDate: dueDateObj,
        paymentDate: paymentData.paymentStatus === 'completed' ? currentTime : null,
        periodStart: currentTime,
        periodEnd: new Date(currentTime.getTime() + 30 * 24 * 60 * 60 * 1000),
        paymentProvider: paymentData.paymentMethod,
        metadata: paymentData.metadata || {}
      };

      const payment = await storage.createPayment(processedPaymentData);

      res.status(201).json(payment);
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({ message: 'Failed to create payment' });
    }
  });

  // Update payment status
  app.put('/api/saas/billing/payments/:paymentId/status', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const { status, transactionId } = req.body;

      if (!status) {
        return res.status(400).json({ message: 'Status is required' });
      }

      // Validate status values
      const validStatuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
        });
      }

      const payment = await storage.updatePaymentStatus(
        parseInt(paymentId), 
        status, 
        transactionId
      );

      res.json(payment);
    } catch (error) {
      console.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Failed to update payment status' });
    }
  });

  // Create invoice
  app.post('/api/saas/billing/invoices', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const invoiceData = req.body;
      
      if (!invoiceData.organizationId || !invoiceData.amount) {
        return res.status(400).json({ 
          message: 'Organization ID and amount are required' 
        });
      }

      const invoice = await storage.createInvoice({
        ...invoiceData,
        invoiceNumber: invoiceData.invoiceNumber || `INV-${Date.now()}`,
        currency: invoiceData.currency || 'GBP',
        status: invoiceData.status || 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      res.status(201).json(invoice);
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({ message: 'Failed to create invoice' });
    }
  });

  // Suspend unpaid subscriptions
  app.post('/api/saas/billing/suspend-unpaid', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      await storage.suspendUnpaidSubscriptions();
      res.json({ 
        success: true, 
        message: 'Unpaid subscriptions have been suspended successfully' 
      });
    } catch (error) {
      console.error('Error suspending unpaid subscriptions:', error);
      res.status(500).json({ message: 'Failed to suspend unpaid subscriptions' });
    }
  });

  // Monthly recurring revenue calculation endpoint
  app.get('/api/saas/billing/mrr', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const mrr = await storage.calculateMonthlyRecurring();
      res.json({ 
        monthlyRecurringRevenue: mrr,
        currency: 'GBP',
        calculatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error calculating MRR:', error);
      res.status(500).json({ message: 'Failed to calculate monthly recurring revenue' });
    }
  });

  // Generate payment report (CSV export)
  app.get('/api/saas/billing/export', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { dateRange, format = 'csv' } = req.query;
      
      // Get billing data for export
      const billingData = await storage.getBillingData('', dateRange as string);
      
      if (format === 'csv') {
        // Generate CSV content
        const headers = [
          'Invoice Number',
          'Customer',
          'Amount',
          'Currency',
          'Payment Method', 
          'Status',
          'Created Date',
          'Due Date',
          'Description'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        billingData.invoices.forEach((invoice: any) => {
          const row = [
            invoice.invoiceNumber,
            invoice.organizationName || 'Unknown',
            invoice.amount,
            invoice.currency,
            invoice.paymentMethod.replace('_', ' '),
            invoice.paymentStatus,
            new Date(invoice.createdAt).toLocaleDateString(),
            invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
            invoice.description || ''
          ];
          csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="billing-report-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
      } else {
        res.status(400).json({ message: 'Unsupported export format' });
      }
    } catch (error) {
      console.error('Error exporting billing data:', error);
      res.status(500).json({ message: 'Failed to export billing data' });
    }
  });

  // Settings Management
  app.get('/api/saas/settings', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const settings = await storage.getSaaSSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ message: 'Failed to fetch settings' });
    }
  });

  app.put('/api/saas/settings', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const settings = req.body;
      const result = await storage.updateSaaSSettings(settings);
      res.json(result);
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  app.post('/api/saas/settings/test-email', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const result = await storage.testEmailSettings();
      res.json(result);
    } catch (error) {
      console.error('Error testing email:', error);
      res.status(500).json({ message: 'Failed to test email' });
    }
  });
}