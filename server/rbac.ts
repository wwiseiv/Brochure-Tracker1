import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth";
import type { OrganizationMember, Organization, OrgMemberRole } from "@shared/schema";

export interface OrgMembershipInfo extends OrganizationMember {
  organization: Organization;
}

declare global {
  namespace Express {
    interface Request {
      orgMembership?: OrgMembershipInfo;
    }
  }
}

export async function getUserOrgMembership(req: Request): Promise<OrgMembershipInfo | null> {
  const user = req.user as any;
  if (!user?.claims?.sub) {
    return null;
  }
  
  const userId = user.claims.sub;
  const membership = await storage.getUserMembership(userId);
  
  return membership || null;
}

export async function bootstrapUserOrganization(userId: string): Promise<OrgMembershipInfo> {
  const existingMembership = await storage.getUserMembership(userId);
  if (existingMembership) {
    return existingMembership;
  }

  const user = await authStorage.getUser(userId);
  const orgName = user 
    ? `${user.firstName || 'User'} ${user.lastName || ''}'s Organization`.trim()
    : `Organization ${userId.slice(0, 8)}`;

  const organization = await storage.createOrganization({ name: orgName });
  
  const member = await storage.createOrganizationMember({
    orgId: organization.id,
    userId: userId,
    role: "master_admin",
    managerId: null,
  });

  return { ...member, organization };
}

export function requireRole(...allowedRoles: OrgMemberRole[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = user.claims.sub;
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }

      req.orgMembership = membership;

      if (!allowedRoles.includes(membership.role as OrgMemberRole)) {
        return res.status(403).json({ 
          error: "Forbidden", 
          message: `Access denied. Required role(s): ${allowedRoles.join(", ")}` 
        });
      }

      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireOrgAccess(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = user.claims.sub;
      let membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(userId);
      }

      req.orgMembership = membership;
      next();
    } catch (error) {
      console.error("Error in requireOrgAccess middleware:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function ensureOrgMembership(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as any;
      if (!user?.claims?.sub) {
        return next();
      }

      const userId = user.claims.sub;
      const membership = await storage.getUserMembership(userId);
      
      if (!membership) {
        await bootstrapUserOrganization(userId);
      }

      next();
    } catch (error) {
      console.error("Error in ensureOrgMembership middleware:", error);
      next();
    }
  };
}
