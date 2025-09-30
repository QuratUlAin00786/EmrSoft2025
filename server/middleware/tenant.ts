import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { authService } from "../services/auth";

export interface TenantRequest extends Request {
  tenant?: {
    id: number;
    name: string;
    subdomain: string;
    region: string;
    settings: any;
  };
  organizationId?: number;
  user?: {
    id: number;
    email: string;
    role: string;
    organizationId: number;
  };
}

export async function tenantMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    console.log(`[TENANT-MIDDLEWARE] Processing request: ${req.method} ${req.path} ${req.url}`);
    
    // Skip tenant middleware for static assets and development files to prevent DB calls
    const skipPaths = [
      '/assets', '/@vite', '/src', '/node_modules', '/__vite_hmr',
      '/favicon.ico', '/robots.txt', '/sitemap.xml', '/.vite',
      '/public', '/client/public'
    ];
    
    if (skipPaths.some(path => req.path.startsWith(path))) {
      console.log(`[TENANT-MIDDLEWARE] Skipping static path: ${req.path}`);
      return next();
    }
    
    // Path is already stripped by Express mounting at /api, so we process all paths
    console.log(`[TENANT-MIDDLEWARE] Processing API path: ${req.path} (original URL: ${req.originalUrl})`);

    // Extract subdomain from host header or use X-Tenant-Subdomain header
    let subdomain = req.get("X-Tenant-Subdomain") || extractSubdomainFromHost(req.get("host")) || "demo";
    console.log(`[TENANT-MIDDLEWARE] Detected subdomain: ${subdomain} from host: ${req.get("host")}`);
    
    let organization = await storage.getOrganizationBySubdomain(subdomain);
    
    // FORCE fallback organization for all environments
    if (!organization) {
      try {
        const { organizations } = await import("@shared/schema");
        const { db } = await import("../db");
        const orgs = await db.select().from(organizations).limit(1);
        organization = orgs[0];
        
        console.log(`FORCE USING fallback organization: ${organization?.name}`);
      } catch (error) {
        console.log("Error fetching fallback organization:", error);
      }
    }
    
    // FORCE create demo org if none exists
    if (!organization) {
      organization = {
        id: 1,
        name: "Halo Healthcare",
        subdomain: "demo",
        region: "UK",
        brandName: "Cura",
        settings: {},
        features: {
          maxUsers: 50,
          maxPatients: 500,
          aiEnabled: true,
          telemedicineEnabled: true,
          billingEnabled: true,
          analyticsEnabled: true
        },
        accessLevel: "full",
        subscriptionStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      console.log("FORCE CREATED demo organization");
    }

    // Check subscription status (ensure organization exists)
    if (!organization) {
      return res.status(500).json({ error: "Failed to initialize organization" });
    }
    
    const subscription = await storage.getSubscription(organization.id);
    if (subscription && !["trial", "active"].includes(subscription.status)) {
      return res.status(403).json({ error: "Subscription inactive" });
    }

    req.tenant = {
      id: organization.id,
      name: organization.name,
      subdomain: organization.subdomain,
      region: organization.region,
      settings: organization.settings || {}
    };
    req.organizationId = organization.id;

    console.log(`[TENANT-MIDDLEWARE] Set organizationId: ${req.organizationId} for path: ${req.path}`);
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function authMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    const token = authService.extractTokenFromHeader(req.get("Authorization"));
    
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Ensure user belongs to the current tenant
    if (req.tenant && payload.organizationId !== req.tenant.id) {
      return res.status(403).json({ error: "Access denied for this organization" });
    }

    // Get user details
    const user = await storage.getUser(payload.userId, payload.organizationId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export function requireRole(roles: string[]) {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!authService.hasPermission(req.user.role, roles)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function requireNonPatientRole() {
  return (req: TenantRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (req.user.role === "patient") {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function gdprComplianceMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return next();
  }

  const compliance = authService.checkGDPRCompliance(req.tenant.region);
  
  // Add GDPR headers
  if (compliance.gdprRequired) {
    res.set({
      "X-GDPR-Compliant": "true",
      "X-Data-Retention": compliance.retentionPeriod.toString(),
      "X-Data-Residency": compliance.dataResidencyRules.join(",")
    });
  }

  // Log data access for audit trail
  if (req.method !== "GET" && req.user) {
    console.log(`[AUDIT] ${req.user.email} ${req.method} ${req.path} - Tenant: ${req.tenant.subdomain}`);
  }

  next();
}

function extractSubdomainFromHost(host: string | undefined): string | null {
  if (!host) return null;
  
  const parts = host.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  
  return null;
}
