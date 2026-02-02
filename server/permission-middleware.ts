/**
 * PCBancard RBAC Permission Middleware
 * 
 * Server-side enforcement of permissions on routes and API endpoints.
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { storage } from "./storage";
import {
  UserPermissionsData,
  UserRole,
  AgentStage,
  evaluatePermission,
  canAccessRoute,
  canAccessApi,
  getFeatureById,
  getEffectivePermissions,
  mapOrgRoleToUserRole,
  hasMinRole,
  hasMinStage,
  ROLE_HIERARCHY,
  STAGE_HIERARCHY
} from "@shared/permissions";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      userPermissions?: UserPermissionsData;
      effectivePermissions?: ReturnType<typeof getEffectivePermissions>;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  permissions: UserPermissionsData;
  timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 seconds

function getCacheKey(userId: string, orgId: number): string {
  return `${orgId}:${userId}`;
}

export function invalidatePermissionCache(orgId: number, userId?: string): void {
  if (userId) {
    permissionCache.delete(getCacheKey(userId, orgId));
  } else {
    for (const key of permissionCache.keys()) {
      if (key.startsWith(`${orgId}:`)) {
        permissionCache.delete(key);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOAD PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

async function loadUserPermissions(
  userId: string,
  orgId: number,
  orgRole: string
): Promise<UserPermissionsData> {
  const cacheKey = getCacheKey(userId, orgId);
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  // Load from database
  const dbPerms = await storage.getUserPermissions(userId);
  
  let permissions: UserPermissionsData;
  
  if (dbPerms) {
    permissions = {
      userId: dbPerms.userId,
      organizationId: orgId,
      role: (dbPerms.role as UserRole) || mapOrgRoleToUserRole(orgRole),
      agentStage: (dbPerms.agentStage as AgentStage) || 'trainee',
      overrides: (dbPerms.featureOverrides as Record<string, boolean>) || {}
    };
  } else {
    // Default permissions for new users based on org role
    const role = mapOrgRoleToUserRole(orgRole);
    permissions = {
      userId,
      organizationId: orgId,
      role,
      agentStage: role === 'agent' ? 'trainee' : undefined,
      overrides: {}
    };
    
    // Create the record
    await storage.createUserPermissions({
      userId,
      orgId,
      role,
      agentStage: role === 'agent' ? 'trainee' : null,
      featureOverrides: {}
    });
  }
  
  // Check org-level feature disables
  const orgFeatures = await storage.getOrganizationFeatures(orgId);
  
  // Org-level disables override everything
  for (const feature of orgFeatures) {
    if (!feature.enabled) {
      permissions.overrides[feature.featureId] = false;
    }
  }
  
  // Cache it
  permissionCache.set(cacheKey, { permissions, timestamp: Date.now() });
  
  return permissions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Load Permissions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware to load permissions for authenticated users.
 * Must run AFTER authentication and org membership middleware.
 */
export function loadPermissionsMiddleware(): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const membership = req.orgMembership;
    
    if (!user?.claims?.sub || !membership) {
      return next();
    }
    
    try {
      req.userPermissions = await loadUserPermissions(
        user.claims.sub,
        membership.orgId,
        membership.role
      );
      req.effectivePermissions = getEffectivePermissions(req.userPermissions);
    } catch (error) {
      console.error('Error loading permissions:', error);
      // Continue with no permissions (will be denied by guards)
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Require Feature
// ═══════════════════════════════════════════════════════════════════════════════

interface RequireFeatureOptions {
  redirectTo?: string;
  message?: string;
}

/**
 * Middleware to require a specific feature.
 * Returns 403 if user doesn't have access.
 */
export function requireFeature(featureId: string, options: RequireFeatureOptions = {}): RequestHandler {
  const { redirectTo, message } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const membership = req.orgMembership;
    
    // Must be authenticated
    if (!user?.claims?.sub) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    // Load permissions if not already loaded
    if (!req.userPermissions && membership) {
      try {
        req.userPermissions = await loadUserPermissions(
          user.claims.sub,
          membership.orgId,
          membership.role
        );
      } catch (error) {
        console.error('Error loading permissions:', error);
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    if (!req.userPermissions) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'No permissions found'
      });
    }
    
    // Check permission
    const hasAccess = evaluatePermission(featureId, req.userPermissions);
    
    if (!hasAccess) {
      const feature = getFeatureById(featureId);
      
      // For HTML requests, redirect
      if (redirectTo && req.accepts('html')) {
        return res.redirect(redirectTo);
      }
      
      // For API requests, return 403
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        feature: featureId,
        featureName: feature?.name || featureId,
        message: message || `You don't have access to ${feature?.name || 'this feature'}`,
        currentStage: req.userPermissions.agentStage,
        currentRole: req.userPermissions.role
      });
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Require Role
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware to require a minimum role level.
 */
export function requirePermissionRole(minRole: UserRole): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const membership = req.orgMembership;
    
    if (!user?.claims?.sub) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    if (!req.userPermissions && membership) {
      try {
        req.userPermissions = await loadUserPermissions(
          user.claims.sub,
          membership.orgId,
          membership.role
        );
      } catch (error) {
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    if (!req.userPermissions) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'No permissions found'
      });
    }
    
    if (!hasMinRole(req.userPermissions.role, minRole)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_ROLE',
        currentRole: req.userPermissions.role,
        requiredRole: minRole,
        message: `This action requires ${minRole} role or higher`
      });
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Require Stage
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware to require a minimum agent stage.
 * Only applies to agents - managers and admins bypass this.
 */
export function requireStage(minStage: AgentStage): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as any;
    const membership = req.orgMembership;
    
    if (!user?.claims?.sub) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    if (!req.userPermissions && membership) {
      try {
        req.userPermissions = await loadUserPermissions(
          user.claims.sub,
          membership.orgId,
          membership.role
        );
      } catch (error) {
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    if (!req.userPermissions) {
      return res.status(403).json({
        error: 'ACCESS_DENIED',
        message: 'No permissions found'
      });
    }
    
    // Admins and managers bypass stage requirements
    if (req.userPermissions.role === 'admin' || req.userPermissions.role === 'manager') {
      return next();
    }
    
    if (!hasMinStage(req.userPermissions, minStage)) {
      return res.status(403).json({
        error: 'INSUFFICIENT_STAGE',
        currentStage: req.userPermissions.agentStage,
        requiredStage: minStage,
        message: `This feature requires ${minStage} stage or higher. Contact your manager to upgrade your access.`
      });
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER: Check feature access
// ═══════════════════════════════════════════════════════════════════════════════

export function checkFeatureAccess(req: Request, featureId: string): boolean {
  if (!req.userPermissions) return false;
  return evaluatePermission(featureId, req.userPermissions);
}
