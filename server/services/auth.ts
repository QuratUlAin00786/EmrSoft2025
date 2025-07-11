import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User } from "@shared/schema";

const JWT_SECRET = process.env.JWT_SECRET || "emr-secret-key-change-in-production";
const SALT_ROUNDS = 12;

export interface AuthTokenPayload {
  userId: number;
  organizationId: number;
  email: string;
  role: string;
}

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateToken(user: User): string {
    const payload: AuthTokenPayload = {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, JWT_SECRET, { 
      expiresIn: "7d", // Extended to 7 days for development
      issuer: "medicore-emr",
      audience: "medicore-users"
    });
  }

  verifyToken(token: string): AuthTokenPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET, {
        issuer: "medicore-emr",
        audience: "medicore-users"
      }) as AuthTokenPayload;
      
      return payload;
    } catch (error) {
      console.error("Token verification failed:", error);
      return null;
    }
  }

  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    return authHeader.substring(7);
  }

  hasPermission(userRole: string, requiredRoles: string[]): boolean {
    const roleHierarchy = {
      admin: 4,
      doctor: 3,
      nurse: 2,
      receptionist: 1
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
    const requiredLevel = Math.min(...requiredRoles.map(role => 
      roleHierarchy[role as keyof typeof roleHierarchy] || 5
    ));

    return userLevel >= requiredLevel;
  }

  checkGDPRCompliance(organizationRegion: string): {
    gdprRequired: boolean;
    dataResidencyRules: string[];
    retentionPeriod: number; // in days
  } {
    switch (organizationRegion) {
      case "UK":
      case "EU":
        return {
          gdprRequired: true,
          dataResidencyRules: ["EU_ONLY", "ENCRYPTION_REQUIRED", "AUDIT_TRAIL"],
          retentionPeriod: 2555 // 7 years for medical records
        };
      case "ME":
      case "SA":
        return {
          gdprRequired: false,
          dataResidencyRules: ["REGIONAL_STORAGE", "ENCRYPTION_REQUIRED"],
          retentionPeriod: 3650 // 10 years
        };
      case "US":
        return {
          gdprRequired: false,
          dataResidencyRules: ["HIPAA_COMPLIANCE", "ENCRYPTION_REQUIRED"],
          retentionPeriod: 2555 // 7 years
        };
      default:
        return {
          gdprRequired: true,
          dataResidencyRules: ["ENCRYPTION_REQUIRED"],
          retentionPeriod: 2555
        };
    }
  }
}

export const authService = new AuthService();
