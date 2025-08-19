import type { Express, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const SAAS_JWT_SECRET = process.env.SAAS_JWT_SECRET || "saas-super-secret-key-change-in-production";

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
      
      const result = await storage.createCustomerOrganization(customerData);
      res.json(result);
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ message: 'Failed to create customer' });
    }
  });

  app.patch('/api/saas/customers/status', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { organizationId, status } = req.body;
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

  // Billing Management
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

  app.get('/api/saas/billing/stats', verifySaaSToken, async (req: Request, res: Response) => {
    try {
      const { dateRange } = req.query;
      const stats = await storage.getBillingStats(dateRange as string);
      res.json(stats);
    } catch (error) {
      console.error('Error fetching billing stats:', error);
      res.status(500).json({ message: 'Failed to fetch billing stats' });
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