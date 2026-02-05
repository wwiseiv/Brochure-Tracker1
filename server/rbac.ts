import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import { authStorage } from "./replit_integrations/auth";
import type { OrganizationMember, Organization, OrgMemberRole } from "@shared/schema";
import { sendNewMemberNotification } from "./email";

const ADMIN_EMAILS = [
  "wwiseiv@icloud.com",
  "emma@pcbancard.com"
];

/**
 * Gets the effective user ID for RBAC purposes.
 * When impersonating, returns the impersonated user's ID so that permissions
 * are correctly applied as if the admin is seeing what the impersonated user sees.
 */
async function getEffectiveUserIdForRBAC(req: Request): Promise<string | null> {
  const user = req.user as any;
  const originalUserId = user?.claims?.sub;
  if (!originalUserId) return null;
  
  const impersonationToken = req.headers["x-impersonation-token"] as string;
  if (!impersonationToken) return originalUserId;
  
  try {
    const session = await storage.getImpersonationSessionByToken(impersonationToken);
    // Check session exists, is active (status === "active"), and not expired
    if (session && session.status === "active" && new Date(session.expiresAt) > new Date()) {
      // Verify the original user is the one who started the impersonation
      if (session.originalUserId === originalUserId) {
        console.log(`[RBAC Impersonation] Using impersonated user: ${session.impersonatedUserId} (original: ${originalUserId})`);
        return session.impersonatedUserId;
      }
    }
  } catch (error) {
    console.error("[RBAC] Error checking impersonation session:", error);
  }
  
  return originalUserId;
}

/**
 * Check if the current request is an active impersonation session.
 * Returns true if admin is impersonating another user.
 */
async function isImpersonating(req: Request): Promise<boolean> {
  const user = req.user as any;
  const originalUserId = user?.claims?.sub;
  if (!originalUserId) return false;
  
  const impersonationToken = req.headers["x-impersonation-token"] as string;
  if (!impersonationToken) return false;
  
  try {
    const session = await storage.getImpersonationSessionByToken(impersonationToken);
    // Check session exists, is active (status === "active"), and not expired
    if (session && session.status === "active" && new Date(session.expiresAt) > new Date()) {
      return session.originalUserId === originalUserId;
    }
  } catch (error) {
    console.error("[RBAC] Error checking impersonation status:", error);
  }
  
  return false;
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const lowerEmail = email.toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === lowerEmail);
}

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

async function autoUpgradeAdminIfNeeded(userId: string, membership: OrgMembershipInfo): Promise<OrgMembershipInfo> {
  const authUser = await authStorage.getUser(userId);
  const authEmail = authUser?.email;
  if (isAdminEmail(authEmail) && membership.role !== 'master_admin') {
    await storage.updateOrganizationMemberRole(membership.id, 'master_admin');
    membership.role = 'master_admin';
    if (!membership.email && authEmail) {
      await storage.updateOrganizationMember(membership.id, { email: authEmail });
      membership.email = authEmail;
    }
  }
  return membership;
}

export async function bootstrapUserOrganization(userId: string): Promise<OrgMembershipInfo> {
  const existingMembership = await storage.getUserMembership(userId);
  if (existingMembership) {
    return existingMembership;
  }

  const user = await authStorage.getUser(userId);
  const userEmail = user?.email?.toLowerCase();
  
  if (userEmail) {
    const pendingInvitation = await storage.getPendingInvitationByEmail(userEmail);
    if (pendingInvitation) {
      const inviteOrg = await storage.getOrganization(pendingInvitation.orgId);
      if (inviteOrg) {
        try {
          const member = await storage.createOrganizationMember({
            orgId: inviteOrg.id,
            userId: userId,
            role: pendingInvitation.role as OrgMemberRole,
            managerId: null,
          });
          
          await storage.updateInvitationStatus(pendingInvitation.id, "accepted", new Date());
          
          sendNewMemberNotification({
            adminEmail: ADMIN_EMAILS[0],
            memberName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "New User",
            memberEmail: userEmail,
            organizationName: inviteOrg.name,
            role: pendingInvitation.role,
            joinedVia: "invitation",
          }).catch(err => console.error("Failed to send new member notification:", err));
          
          return { ...member, organization: inviteOrg };
        } catch (error: any) {
          if (error?.code === '23505') {
            const existingMembership = await storage.getUserMembership(userId);
            if (existingMembership) {
              return existingMembership;
            }
          }
          throw error;
        }
      }
    }
  }

  const primaryOrg = await storage.getPrimaryOrganization();
  if (primaryOrg) {
    const userIsAdmin = isAdminEmail(userEmail);
    const role: OrgMemberRole = userIsAdmin ? "master_admin" : "agent";
    
    try {
      const member = await storage.createOrganizationMember({
        orgId: primaryOrg.id,
        userId: userId,
        role: role,
        managerId: null,
      });
      
      if (!userIsAdmin) {
        sendNewMemberNotification({
          adminEmail: ADMIN_EMAILS[0],
          memberName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : "New User",
          memberEmail: userEmail || "Unknown",
          organizationName: primaryOrg.name,
          role: role,
          joinedVia: "self_signup",
        }).catch(err => console.error("Failed to send new member notification:", err));
      }
      
      return { ...member, organization: primaryOrg };
    } catch (error: any) {
      if (error?.code === '23505') {
        const existingMembership = await storage.getUserMembership(userId);
        if (existingMembership) {
          return existingMembership;
        }
      }
      throw error;
    }
  }

  const orgName = user 
    ? `${user.firstName || 'User'} ${user.lastName || ''}'s Organization`.trim()
    : `Organization ${userId.slice(0, 8)}`;

  const organization = await storage.createOrganization({ name: orgName, isPrimary: true });
  
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

      // Use effective user ID (impersonated user if impersonating)
      const effectiveUserId = await getEffectiveUserIdForRBAC(req);
      if (!effectiveUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let membership = await storage.getUserMembership(effectiveUserId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(effectiveUserId);
      }
      
      // Only auto-upgrade if NOT impersonating (don't auto-upgrade impersonated users)
      const impersonating = await isImpersonating(req);
      if (!impersonating) {
        membership = await autoUpgradeAdminIfNeeded(effectiveUserId, membership);
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

      // Use effective user ID (impersonated user if impersonating)
      const effectiveUserId = await getEffectiveUserIdForRBAC(req);
      if (!effectiveUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let membership = await storage.getUserMembership(effectiveUserId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(effectiveUserId);
      }
      
      // Only auto-upgrade if NOT impersonating
      const impersonating = await isImpersonating(req);
      if (!impersonating) {
        membership = await autoUpgradeAdminIfNeeded(effectiveUserId, membership);
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

      // Use effective user ID (impersonated user if impersonating)
      const effectiveUserId = await getEffectiveUserIdForRBAC(req);
      if (!effectiveUserId) {
        return next();
      }

      let membership = await storage.getUserMembership(effectiveUserId);
      
      if (!membership) {
        membership = await bootstrapUserOrganization(effectiveUserId);
      }
      
      // Only auto-upgrade if NOT impersonating
      const impersonating = await isImpersonating(req);
      if (!impersonating) {
        membership = await autoUpgradeAdminIfNeeded(effectiveUserId, membership);
      }
      
      req.orgMembership = membership;

      next();
    } catch (error) {
      console.error("Error in ensureOrgMembership middleware:", error);
      res.status(500).json({ error: "Failed to verify organization membership" });
    }
  };
}
