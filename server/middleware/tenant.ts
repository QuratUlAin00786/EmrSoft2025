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
    // Extract tenant from subdomain or header
    let subdomain = req.get("X-Tenant-Subdomain") || extractSubdomainFromHost(req.get("host"));
    
    // Default to demo for development when no subdomain is found
    if (!subdomain && process.env.NODE_ENV === "development") {
      subdomain = "demo";
    }
    
    // Default to demo for production when no subdomain is found (for main domain)
    if (!subdomain && process.env.NODE_ENV === "production") {
      subdomain = "demo";
    }
    
    if (!subdomain) {
      return res.status(400).json({ error: "Tenant subdomain required" });
    }

    let organization = await storage.getOrganizationBySubdomain(subdomain);
    
    // For development and production, try to get any organization if demo not found
    if (!organization && (process.env.NODE_ENV === "development" || process.env.NODE_ENV === "production")) {
      try {
        const { organizations } = await import("@shared/schema");
        const { db } = await import("../db");
        const orgs = await db.select().from(organizations).limit(1);
        organization = orgs[0];
        
        // Log for debugging
        console.log(`Using fallback organization: ${organization?.name} (${organization?.subdomain})`);
      } catch (error) {
        console.log("Error fetching fallback organization:", error);
      }
    }
    
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Check subscription status
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

    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function authMiddleware(req: TenantRequest, res: Response, next: NextFunction) {
  try {
    // Skip authentication in development mode for easier testing
    if (process.env.NODE_ENV === "development") {
      // Create a mock user for development
      req.user = {
        id: 1,
        email: "demo@demo.com",
        role: "admin",
        organizationId: req.tenant?.id || 1
      };
      return next();
    }

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
