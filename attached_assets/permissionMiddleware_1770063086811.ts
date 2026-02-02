/**
 * PCBancard RBAC Middleware
 * 
 * Server-side enforcement of permissions on routes and API endpoints.
 * This is the SECURITY layer - UI hiding is just UX.
 */

import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import {
  UserPermissions,
  UserRole,
  AgentStage,
  evaluatePermission,
  canAccessRoute,
  canAccessApi,
  getFeatureById,
  getEffectivePermissions
} from '../../shared/permissions';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        organizationId: number;
        email?: string;
        name?: string;
      };
      permissions?: UserPermissions;
      effectivePermissions?: ReturnType<typeof getEffectivePermissions>;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  permissions: UserPermissions;
  timestamp: number;
}

const permissionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 1000; // 30 seconds (shorter than feature toggles for security)

function getCacheKey(userId: number, orgId: number): string {
  return `${orgId}:${userId}`;
}

export function invalidatePermissionCache(orgId: number, userId?: number): void {
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
  userId: number,
  orgId: number
): Promise<UserPermissions> {
  const cacheKey = getCacheKey(userId, orgId);
  const cached = permissionCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.permissions;
  }
  
  // Load from database
  const result = await db.query(
    `SELECT 
      user_id,
      organization_id,
      role,
      agent_stage,
      feature_overrides
     FROM user_permissions
     WHERE user_id = $1 AND organization_id = $2`,
    [userId, orgId]
  );
  
  let permissions: UserPermissions;
  
  if (result.rows.length > 0) {
    const row = result.rows[0];
    permissions = {
      userId: row.user_id,
      organizationId: row.organization_id,
      role: row.role as UserRole,
      agentStage: row.agent_stage as AgentStage | undefined,
      overrides: row.feature_overrides || {}
    };
  } else {
    // Default permissions for new users
    permissions = {
      userId,
      organizationId: orgId,
      role: 'agent',
      agentStage: 'trainee',
      overrides: {}
    };
    
    // Create the record
    await db.query(
      `INSERT INTO user_permissions (user_id, organization_id, role, agent_stage)
       VALUES ($1, $2, 'agent', 'trainee')
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [userId, orgId]
    );
  }
  
  // Check org-level feature disables
  const orgFeatures = await db.query(
    `SELECT feature_id, enabled FROM organization_features WHERE organization_id = $1`,
    [orgId]
  );
  
  // Org-level disables override everything
  for (const row of orgFeatures.rows) {
    if (!row.enabled) {
      permissions.overrides[row.feature_id] = false;
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
 * Must run AFTER authentication middleware.
 */
export function loadPermissionsMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next();
    }
    
    try {
      req.permissions = await loadUserPermissions(
        req.user.id,
        req.user.organizationId
      );
      req.effectivePermissions = getEffectivePermissions(req.permissions);
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
 * 
 * Usage:
 *   router.get('/pipeline', requireFeature('deal_pipeline'), pipelineHandler);
 */
export function requireFeature(featureId: string, options: RequireFeatureOptions = {}) {
  const { redirectTo, message } = options;
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // Must be authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    // Load permissions if not already loaded
    if (!req.permissions) {
      try {
        req.permissions = await loadUserPermissions(
          req.user.id,
          req.user.organizationId
        );
      } catch (error) {
        console.error('Error loading permissions:', error);
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    // Check permission
    const hasAccess = evaluatePermission(featureId, req.permissions);
    
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
        requiredStage: getRequiredStage(featureId, req.permissions),
        currentStage: req.permissions.agentStage,
        currentRole: req.permissions.role
      });
    }
    
    next();
  };
}

/**
 * Get the minimum stage required for a feature (for helpful error messages)
 */
function getRequiredStage(featureId: string, permissions: UserPermissions): string | null {
  const feature = getFeatureById(featureId);
  if (!feature) return null;
  
  if (feature.stageDefaults.trainee) return 'trainee';
  if (feature.stageDefaults.active) return 'active';
  if (feature.stageDefaults.senior) return 'senior';
  if (feature.roleDefaults.manager) return 'manager role';
  if (feature.roleDefaults.admin) return 'admin role';
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Require Role
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware to require a minimum role level.
 * 
 * Usage:
 *   router.get('/team', requireRole('manager'), teamHandler);
 */
export function requireRole(minRole: UserRole) {
  const roleHierarchy: Record<UserRole, number> = {
    agent: 1,
    manager: 2,
    admin: 3
  };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    if (!req.permissions) {
      try {
        req.permissions = await loadUserPermissions(
          req.user.id,
          req.user.organizationId
        );
      } catch (error) {
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    const userLevel = roleHierarchy[req.permissions.role];
    const requiredLevel = roleHierarchy[minRole];
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'INSUFFICIENT_ROLE',
        currentRole: req.permissions.role,
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
 * 
 * Usage:
 *   router.get('/pipeline', requireStage('active'), pipelineHandler);
 */
export function requireStage(minStage: AgentStage) {
  const stageHierarchy: Record<AgentStage, number> = {
    trainee: 1,
    active: 2,
    senior: 3
  };
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'UNAUTHORIZED',
        message: 'Authentication required' 
      });
    }
    
    if (!req.permissions) {
      try {
        req.permissions = await loadUserPermissions(
          req.user.id,
          req.user.organizationId
        );
      } catch (error) {
        return res.status(500).json({ 
          error: 'PERMISSION_ERROR',
          message: 'Error checking permissions' 
        });
      }
    }
    
    // Admins and managers bypass stage requirements
    if (req.permissions.role === 'admin' || req.permissions.role === 'manager') {
      return next();
    }
    
    const userLevel = stageHierarchy[req.permissions.agentStage || 'trainee'];
    const requiredLevel = stageHierarchy[minStage];
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({
        error: 'INSUFFICIENT_STAGE',
        currentStage: req.permissions.agentStage,
        requiredStage: minStage,
        message: `This feature requires ${minStage} stage or higher. Contact your manager to upgrade your access.`
      });
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE: Auto Route Gate
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Automatic middleware that gates ALL routes based on the feature registry.
 * This is the catch-all security layer.
 * 
 * Usage:
 *   app.use(autoRouteGate());
 */
export function autoRouteGate() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for unauthenticated users (let auth middleware handle it)
    if (!req.user) {
      return next();
    }
    
    // Load permissions if needed
    if (!req.permissions) {
      try {
        req.permissions = await loadUserPermissions(
          req.user.id,
          req.user.organizationId
        );
      } catch (error) {
        console.error('Error loading permissions in autoRouteGate:', error);
        return next();
      }
    }
    
    // Check route access
    const { allowed, blockedByFeature } = canAccessRoute(req.path, req.permissions);
    
    if (!allowed && blockedByFeature) {
      const feature = getFeatureById(blockedByFeature);
      
      // For API routes
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({
          error: 'ACCESS_DENIED',
          feature: blockedByFeature,
          featureName: feature?.name,
          message: `You don't have access to ${feature?.name || 'this feature'}`,
          requiredStage: getRequiredStage(blockedByFeature, req.permissions!),
          currentStage: req.permissions!.agentStage,
          currentRole: req.permissions!.role
        });
      }
      
      // For page routes, redirect to no-access page
      return res.redirect(`/no-access?feature=${blockedByFeature}`);
    }
    
    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if current user has access to a feature (for use in handlers)
 */
export function hasFeatureAccess(req: Request, featureId: string): boolean {
  if (!req.permissions) return false;
  return evaluatePermission(featureId, req.permissions);
}

/**
 * Check if current user is at least a certain role
 */
export function hasRole(req: Request, minRole: UserRole): boolean {
  if (!req.permissions) return false;
  
  const roleHierarchy: Record<UserRole, number> = {
    agent: 1,
    manager: 2,
    admin: 3
  };
  
  return roleHierarchy[req.permissions.role] >= roleHierarchy[minRole];
}

/**
 * Check if current user is at least a certain stage (agents only)
 */
export function hasStage(req: Request, minStage: AgentStage): boolean {
  if (!req.permissions) return false;
  
  // Non-agents bypass stage checks
  if (req.permissions.role !== 'agent') return true;
  
  const stageHierarchy: Record<AgentStage, number> = {
    trainee: 1,
    active: 2,
    senior: 3
  };
  
  return stageHierarchy[req.permissions.agentStage || 'trainee'] >= stageHierarchy[minStage];
}

/**
 * Get list of features the user CAN access
 */
export function getAccessibleFeatures(req: Request): string[] {
  if (!req.effectivePermissions) return [];
  
  return Object.entries(req.effectivePermissions.features)
    .filter(([, allowed]) => allowed)
    .map(([featureId]) => featureId);
}

/**
 * Get list of features the user CANNOT access
 */
export function getBlockedFeatures(req: Request): string[] {
  if (!req.effectivePermissions) return [];
  
  return Object.entries(req.effectivePermissions.features)
    .filter(([, allowed]) => !allowed)
    .map(([featureId]) => featureId);
}
