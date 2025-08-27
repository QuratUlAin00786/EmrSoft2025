import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { db } from "./db";
import nodemailer from 'nodemailer';
import { saasOwners } from '@shared/schema';

const SAAS_JWT_SECRET = process.env.SAAS_JWT_SECRET || "saas-super-secret-key-change-in-production";

// Email configuration for customer notifications
async function sendWelcomeEmail(organization: any, adminUser: any) {
  try {
    console.log('📧 sendWelcomeEmail called with:', {
      orgName: organization?.name,
      orgSubdomain: organization?.subdomain,
      adminEmail: adminUser?.email,
      adminName: `${adminUser?.firstName} ${adminUser?.lastName}`,
      hasTempPassword: !!adminUser?.tempPassword
    });
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'noreply@curaemr.ai',
        pass: 'wxndhigmfhgjjklr',
      },
    });

    const mailOptions = {
      from: 'noreply@curaemr.ai',
      to: adminUser.email,
      subject: 'TEST - Cura EMR Login Details',
      text: `Hello ${adminUser.firstName},

Your Cura EMR account for ${organization.name} is ready.

Login: ${adminUser.email}
Password: ${adminUser.tempPassword}
URL: https://${organization.subdomain}

Best regards,
Cura EMR Team`
    };

    console.log('📧 About to send email with options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
      hasHtml: !!mailOptions.html
    });
    
    const emailResult = await transporter.sendMail(mailOptions);
    console.log('📧 ✅ Email sent successfully! Result:', emailResult);
    console.log(`📧 Welcome email sent to ${adminUser.email} for organization ${organization.name}`);
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
    const saasUser = await storage.getUser(decoded.id, 0); // organizationId 0 = system-wide
    
    if (!saasUser || !saasUser.isSaaSOwner || !saasUser.isActive) {
      return res.status(401).json({ message: 'Invalid token or inactive owner' });
    }
    
    req.saasOwner = saasUser;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// Simple test route to verify email functionality
async function testEmailConnection() {
  try {
    console.log('📧 TESTING EMAIL CONNECTION...');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'noreply@curaemr.ai',
        pass: 'wxndhigmfhgjjklr',
      },
    });
    
    const testResult = await transporter.verify();
    console.log('📧 ✅ SMTP CONNECTION VERIFIED:', testResult);
    return testResult;
  } catch (error) {
    console.error('📧 ❌ SMTP CONNECTION FAILED:', error);
    return false;
  }
}

export function registerSaaSRoutes(app: Express) {
  
  // Send email to specific customer by ID
  app.post('/api/saas/send-email-to-customer/:customerId', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.customerId);
      console.log(`📧 Sending welcome email to customer ID: ${customerId}`);
      
      // Get the organization
      const organization = await storage.getOrganization(customerId);
      if (!organization) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      
      // Get the admin user for this organization
      const adminUsers = await storage.getUsersByRole('admin', customerId);
      if (!adminUsers || adminUsers.length === 0) {
        return res.status(404).json({ success: false, message: 'No admin user found for this customer' });
      }
      
      const adminUser = adminUsers[0];
      
      console.log('📧 Sending welcome email to:', {
        organization: organization.name,
        adminEmail: adminUser.email,
        adminName: `${adminUser.firstName} ${adminUser.lastName}`
      });
      
      // Send the welcome email
      await sendWelcomeEmail(organization, adminUser);
      
      res.json({ 
        success: true, 
        message: `Welcome email sent successfully`,
        sentTo: adminUser.email,
        organization: organization.name
      });
      
    } catch (error: any) {
      console.error('📧 ❌ Error sending welcome email to customer:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send welcome email',
        error: error.message 
      });
    }
  });

  // DIRECT EMAIL TEST - Bypasses all middleware
  app.get('/api/direct-email-test', async (req: Request, res: Response) => {
    try {
      console.log('🔥 DIRECT EMAIL TEST STARTING...');
      
      // Create test organization and user data with YOUR email
      const testOrganization = {
        id: 1,
        name: 'Halo Healthcare',
        subdomain: 'halo',
        createdAt: new Date()
      };
      
      const testAdminUser = {
        id: 348,
        email: 'admin@cura.com', // Using your real email from the customer list
        firstName: 'Muhammad',
        lastName: 'Younus',
        tempPassword: 'temp123'
      };
      
      console.log('🔥 Sending test email to:', testAdminUser.email);
      console.log('🔥 Organization:', testOrganization.name);
      
      await sendWelcomeEmail(testOrganization, testAdminUser);
      
      console.log('🔥 ✅ DIRECT EMAIL TEST COMPLETED SUCCESSFULLY!');
      
      res.json({
        success: true,
        message: 'Direct email test completed successfully',
        sentTo: testAdminUser.email,
        organization: testOrganization.name,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('🔥 ❌ DIRECT EMAIL TEST FAILED:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });
  // Production Setup Endpoint - Creates SaaS owner through normal user system
  app.post('/api/production-setup', async (req: Request, res: Response) => {
    try {
      // Check if SaaS owner already exists in regular users table
      const existingUser = await storage.getUserByEmail('saas_admin@curaemr.ai', 0); // organizationId 0 = system-wide
      
      if (existingUser) {
        return res.json({ 
          success: true, 
          message: 'SaaS admin already exists', 
          alreadyExists: true 
        });
      }

      // Create SaaS owner as a special system user (organizationId: 0)
      const hashedPassword = await bcrypt.hash('admin123', 12);
      
      const saasOwnerUser = await storage.createUser({
        firstName: 'SaaS',
        lastName: 'Administrator', 
        email: 'saas_admin@curaemr.ai',
        username: 'saas_admin',
        password: hashedPassword,
        role: 'saas_owner', // Special role for SaaS owners
        organizationId: 0, // 0 = System-wide, hidden from regular organizations
        isActive: true,
        isSaaSOwner: true // Flag to identify SaaS owners
      });

      console.log('✅ Production SaaS owner created as system user');
      
      res.json({ 
        success: true, 
        message: 'SaaS admin account created successfully',
        owner: {
          id: saasOwnerUser.id,
          username: saasOwnerUser.username,
          email: saasOwnerUser.email
        }
      });
      
    } catch (error) {
      console.error('❌ Production setup failed:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to create SaaS admin account',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // SaaS Owner Profile Management
  app.get('/api/saas/owner/profile', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const saasOwner = (req as any).saasOwner;
      
      // Return SaaS owner without password
      const { password, ...ownerWithoutPassword } = saasOwner;
      res.json(ownerWithoutPassword);
    } catch (error) {
      console.error('Error fetching owner profile:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  });

  app.put('/api/saas/owner/profile', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const saasOwner = (req as any).saasOwner;
      const { email, firstName, lastName } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      const updatedOwner = await storage.updateUser(saasOwner.id, 0, {
        email,
        firstName,
        lastName,
      });

      if (!updatedOwner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      // Return owner without password
      const { password, ...ownerWithoutPassword } = updatedOwner;
      res.json(ownerWithoutPassword);
    } catch (error) {
      console.error('Error updating owner profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  app.put('/api/saas/owner/password', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const saasOwner = (req as any).saasOwner;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, saasOwner.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      await storage.updateUser(saasOwner.id, 0, {
        password: hashedNewPassword,
      });

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // Create User
  app.post('/api/saas/users/create', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { firstName, lastName, email, username, password, role, organizationId } = req.body;

      if (!firstName || !lastName || !email || !username || !password || !role || !organizationId) {
        return res.status(400).json({ error: 'All fields are required' });
      }

      // Validate organization exists
      const organization = await storage.getOrganization(parseInt(organizationId));
      if (!organization) {
        return res.status(400).json({ error: 'Invalid organization selected' });
      }

      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(username, parseInt(organizationId));
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(email, parseInt(organizationId));
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        firstName,
        lastName,
        email,
        username,
        password: hashedPassword,
        role,
        organizationId: parseInt(organizationId),
        isActive: true,
      });

      // Return user without password
      const { password: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // SaaS diagnostic endpoint for production debugging
  // Test email connection
  app.get('/api/saas/test-email', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      console.log('📧 Manual email test requested...');
      const result = await testEmailConnection();
      res.json({ success: result, message: result ? 'Email connection verified' : 'Email connection failed' });
    } catch (error) {
      console.error('Error testing email:', error);
      res.status(500).json({ success: false, message: 'Email test failed' });
    }
  });

  // Send welcome email to last customer created
  app.post('/api/saas/send-welcome-to-last-customer', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      console.log('📧 Manual welcome email requested for last customer...');
      
      // Get all organizations ordered by creation date (newest first)
      const organizations = await storage.getAllOrganizations();
      
      if (!organizations || organizations.length === 0) {
        return res.status(404).json({ success: false, message: 'No customers found' });
      }
      
      // Get the most recent organization (last created)
      const lastOrganization = organizations.sort((a, b) => 
        new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
      )[0];
      
      console.log('📧 Last customer found:', {
        id: lastOrganization.id,
        name: lastOrganization.name,
        subdomain: lastOrganization.subdomain,
        createdAt: lastOrganization.createdAt
      });
      
      // Get the admin user for this organization
      const adminUsers = await storage.getUsersByRole('admin', lastOrganization.id);
      
      if (!adminUsers || adminUsers.length === 0) {
        return res.status(404).json({ success: false, message: 'No admin user found for last customer' });
      }
      
      const adminUser = adminUsers[0]; // Take the first admin
      
      console.log('📧 Admin user found:', {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName
      });
      
      // Send the welcome email
      console.log('📧 About to send welcome email...');
      await sendWelcomeEmail(lastOrganization, adminUser);
      console.log('📧 ✅ Welcome email sent successfully!');
      
      res.json({ 
        success: true, 
        message: `Welcome email sent to ${adminUser.email} for organization ${lastOrganization.name}`,
        organization: {
          name: lastOrganization.name,
          subdomain: lastOrganization.subdomain
        },
        adminUser: {
          email: adminUser.email,
          name: `${adminUser.firstName} ${adminUser.lastName}`
        }
      });
      
    } catch (error: any) {
      console.error('📧 ❌ Error sending welcome email to last customer:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to send welcome email',
        error: error.message 
      });
    }
  });

  app.get('/api/saas/debug', async (req: Request, res: Response) => {
    try {
      const hasSaaSUser = await storage.getUserByUsername('saas_admin', 0);
      
      res.json({
        debug: true,
        environment: process.env.NODE_ENV || 'unknown',
        hostname: req.hostname,
        headers: {
          host: req.get('host'),
          origin: req.get('origin'),
          referer: req.get('referer'),
          userAgent: req.get('user-agent')
        },
        hasSaaSJWTSecret: !!process.env.SAAS_JWT_SECRET,
        jwtSecretLength: SAAS_JWT_SECRET.length,
        hasSaaSAdmin: !!hasSaaSUser,
        saasAdminActive: hasSaaSUser?.isActive || false,
        saasAdminEmail: hasSaaSUser?.email || 'none',
        isSaaSOwner: hasSaaSUser?.isSaaSOwner || false,
        databaseConnected: true,
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

      // Check for SaaS owner in users table (organizationId = 0)
      const saasUser = await storage.getUserByUsername(username, 0);
      
      console.log('SaaS login attempt for username:', username);
      console.log('SaaS user found:', !!saasUser);
      console.log('Is SaaS owner:', saasUser?.isSaaSOwner || false);
      
      if (!saasUser || !saasUser.isSaaSOwner) {
        console.log('No SaaS owner found with username:', username);
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      console.log('Comparing password for SaaS user:', saasUser.username);
      const isValidPassword = await bcrypt.compare(password, saasUser.password);
      console.log('Password valid:', isValidPassword);
      
      if (!isValidPassword) {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid credentials' 
        });
      }

      if (!saasUser.isActive) {
        return res.status(401).json({ 
          success: false, 
          message: 'Account is deactivated' 
        });
      }

      // Skip last login update to avoid SQL errors - not essential for SaaS login
      console.log(`Storage: SaaS user ${saasUser.id} login successful, skipping update`);

      // Generate JWT token
      const token = jwt.sign(
        { id: saasUser.id, username: saasUser.username, isSaaSOwner: true },
        SAAS_JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        token,
        owner: {
          id: saasUser.id,
          username: saasUser.username,
          email: saasUser.email,
          firstName: saasUser.firstName,
          lastName: saasUser.lastName,
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

  // Subscription Contact Management (PRIVACY COMPLIANT)
  // SaaS owners should only see one subscription contact per organization, not all internal users
  app.get('/api/saas/subscription-contacts', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { search } = req.query;
      // Only get subscription contacts (organization admins who subscribed)
      const contacts = await storage.getSubscriptionContacts(search as string);
      res.json(contacts);
    } catch (error) {
      console.error('Error fetching subscription contacts:', error);
      res.status(500).json({ message: 'Failed to fetch subscription contacts' });
    }
  });

  app.post('/api/saas/subscription-contacts/reset-password', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { contactId } = req.body;
      // Only allow password reset for subscription contacts (org admins), not all users
      const result = await storage.resetSubscriptionContactPassword(contactId);
      res.json(result);
    } catch (error) {
      console.error('Error resetting subscription contact password:', error);
      res.status(500).json({ message: 'Failed to reset contact password' });
    }
  });

  app.patch('/api/saas/subscription-contacts/status', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { contactId, isActive } = req.body;
      // Only allow status changes for subscription contacts (org admins), not all users
      const result = await storage.updateSubscriptionContactStatus(contactId, isActive);
      res.json(result);
    } catch (error) {
      console.error('Error updating subscription contact status:', error);
      res.status(500).json({ message: 'Failed to update contact status' });
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
      console.log('📧 Email Debug - Customer creation result:', {
        success: result.success,
        hasAdminUser: !!result.adminUser,
        adminEmail: result.adminUser?.email,
        orgName: result.organization?.name
      });
      
      if (result.success && result.adminUser) {
        try {
          console.log('📧 Attempting to send welcome email to:', result.adminUser.email);
          await sendWelcomeEmail(result.organization, result.adminUser);
          console.log('📧 ✅ Welcome email sent successfully to:', result.adminUser.email);
        } catch (emailError: any) {
          console.error('📧 ❌ Failed to send welcome email:', emailError);
          console.error('📧 ❌ Email error details:', {
            message: emailError.message,
            code: emailError.code,
            stack: emailError.stack
          });
          // Don't fail the customer creation if email fails
        }
      } else {
        console.log('📧 ⚠️ Email not sent - conditions not met:', {
          success: result.success,
          hasAdminUser: !!result.adminUser
        });
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

  app.delete('/api/saas/customers/:id', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const customerId = parseInt(req.params.id);
      console.log('Deleting customer:', customerId);
      
      const result = await storage.deleteCustomerOrganization(customerId);
      res.json(result);
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({ message: 'Failed to delete customer' });
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