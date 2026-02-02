/**
 * PCBancard RBAC API Routes
 * 
 * API endpoints for:
 * - Getting current user's permissions
 * - Admin/Manager: Managing user permissions
 * - Applying presets
 */

import { Router, Request, Response } from 'express';
import { db } from '../db';
import { 
  requireRole, 
  requireFeature,
  invalidatePermissionCache,
  loadPermissionsMiddleware
} from '../middleware/permissionMiddleware';
import {
  FEATURES,
  PERMISSION_PRESETS,
  UserRole,
  AgentStage,
  getEffectivePermissions,
  getFeaturesByStageUnlock,
  getFeatureById
} from '../../shared/permissions';

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/me - Get current user's permissions
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/permissions/me', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  
  if (!req.permissions) {
    return res.status(500).json({ error: 'PERMISSIONS_NOT_LOADED' });
  }
  
  const effective = getEffectivePermissions(req.permissions);
  
  res.json({
    userId: req.user.id,
    organizationId: req.user.organizationId,
    role: req.permissions.role,
    agentStage: req.permissions.agentStage,
    overrides: req.permissions.overrides,
    effectiveFeatures: effective.features,
    canManagePermissions: effective.canManagePermissions,
    canViewTeam: effective.canViewTeam
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/features - Get feature registry
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/permissions/features', async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }
  
  const byStage = getFeaturesByStageUnlock();
  
  res.json({
    features: FEATURES,
    presets: PERMISSION_PRESETS,
    byStageUnlock: {
      trainee: byStage.trainee.map(f => f.id),
      active: byStage.active.map(f => f.id),
      senior: byStage.senior.map(f => f.id),
      managerOnly: byStage.managerOnly.map(f => f.id),
      adminOnly: byStage.adminOnly.map(f => f.id)
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/users - List users with permissions (manager+)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/permissions/users', 
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const isAdmin = req.permissions!.role === 'admin';
    
    // Managers can only see agents, admins can see everyone
    const roleFilter = isAdmin ? '' : `AND up.role = 'agent'`;
    
    const result = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        up.role,
        up.agent_stage,
        up.feature_overrides,
        up.updated_at,
        (SELECT name FROM users WHERE id = up.set_by) as set_by_name
      FROM users u
      JOIN organization_members om ON u.id = om.user_id AND om.organization_id = $1
      LEFT JOIN user_permissions up ON u.id = up.user_id AND up.organization_id = $1
      WHERE om.organization_id = $1 ${roleFilter}
      ORDER BY 
        CASE up.role 
          WHEN 'admin' THEN 1 
          WHEN 'manager' THEN 2 
          ELSE 3 
        END,
        u.name
    `, [orgId]);
    
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role || 'agent',
      agentStage: row.agent_stage || 'trainee',
      overrides: row.feature_overrides || {},
      updatedAt: row.updated_at,
      setByName: row.set_by_name
    }));
    
    res.json({ users });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/users/:userId - Get specific user's permissions
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/permissions/users/:userId',
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const orgId = req.user!.organizationId;
    
    const result = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        up.role,
        up.agent_stage,
        up.feature_overrides,
        up.notes,
        up.updated_at
      FROM users u
      JOIN organization_members om ON u.id = om.user_id AND om.organization_id = $2
      LEFT JOIN user_permissions up ON u.id = up.user_id AND up.organization_id = $2
      WHERE u.id = $1
    `, [userId, orgId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'USER_NOT_FOUND' });
    }
    
    const row = result.rows[0];
    const permissions = {
      userId: row.id,
      organizationId: orgId,
      role: (row.role || 'agent') as UserRole,
      agentStage: (row.agent_stage || 'trainee') as AgentStage,
      overrides: row.feature_overrides || {}
    };
    
    const effective = getEffectivePermissions(permissions);
    
    res.json({
      user: {
        id: row.id,
        name: row.name,
        email: row.email
      },
      permissions: {
        role: permissions.role,
        agentStage: permissions.agentStage,
        overrides: permissions.overrides,
        notes: row.notes
      },
      effectiveFeatures: effective.features,
      updatedAt: row.updated_at
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/permissions/users/:userId/role - Update user role
// ═══════════════════════════════════════════════════════════════════════════════

router.patch('/permissions/users/:userId/role',
  requireRole('admin'),  // Only admins can change roles
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { role, reason } = req.body;
    const orgId = req.user!.organizationId;
    const changedBy = req.user!.id;
    
    // Validate role
    if (!['admin', 'manager', 'agent'].includes(role)) {
      return res.status(400).json({ error: 'INVALID_ROLE' });
    }
    
    // Can't change own role
    if (parseInt(userId) === changedBy) {
      return res.status(400).json({ error: 'CANNOT_CHANGE_OWN_ROLE' });
    }
    
    // Get current role for audit
    const current = await db.query(
      `SELECT role FROM user_permissions WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );
    const oldRole = current.rows[0]?.role || 'agent';
    
    // Update role
    await db.query(`
      INSERT INTO user_permissions (user_id, organization_id, role, set_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET role = $3, set_by = $4, updated_at = NOW()
    `, [userId, orgId, role, changedBy]);
    
    // Audit log
    await db.query(`
      INSERT INTO permission_audit_log 
        (organization_id, changed_by_user_id, target_user_id, change_type, old_role, new_role, reason)
      VALUES ($1, $2, $3, 'role_change', $4, $5, $6)
    `, [orgId, changedBy, userId, oldRole, role, reason]);
    
    // Invalidate cache
    invalidatePermissionCache(orgId, parseInt(userId));
    
    res.json({ success: true, role });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// PATCH /api/permissions/users/:userId/stage - Update agent stage
// ═══════════════════════════════════════════════════════════════════════════════

router.patch('/permissions/users/:userId/stage',
  requireRole('manager'),  // Managers can change agent stages
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { stage, reason } = req.body;
    const orgId = req.user!.organizationId;
    const changedBy = req.user!.id;
    
    // Validate stage
    if (!['trainee', 'active', 'senior'].includes(stage)) {
      return res.status(400).json({ error: 'INVALID_STAGE' });
    }
    
    // Get current stage for audit
    const current = await db.query(
      `SELECT agent_stage, role FROM user_permissions WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );
    
    // Managers can only modify agents
    if (current.rows[0]?.role && current.rows[0].role !== 'agent' && req.permissions!.role !== 'admin') {
      return res.status(403).json({ error: 'CAN_ONLY_MODIFY_AGENTS' });
    }
    
    const oldStage = current.rows[0]?.agent_stage || 'trainee';
    
    // Update stage
    await db.query(`
      INSERT INTO user_permissions (user_id, organization_id, agent_stage, set_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET agent_stage = $3, set_by = $4, updated_at = NOW()
    `, [userId, orgId, stage, changedBy]);
    
    // Audit log
    await db.query(`
      INSERT INTO permission_audit_log 
        (organization_id, changed_by_user_id, target_user_id, change_type, old_stage, new_stage, reason)
      VALUES ($1, $2, $3, 'stage_change', $4, $5, $6)
    `, [orgId, changedBy, userId, oldStage, stage, reason]);
    
    // Invalidate cache
    invalidatePermissionCache(orgId, parseInt(userId));
    
    res.json({ success: true, stage });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/permissions/users/:userId/override - Add/update feature override
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/permissions/users/:userId/override',
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { featureId, enabled, reason } = req.body;
    const orgId = req.user!.organizationId;
    const changedBy = req.user!.id;
    
    // Validate feature exists
    const feature = getFeatureById(featureId);
    if (!feature) {
      return res.status(400).json({ error: 'INVALID_FEATURE' });
    }
    
    // Can't override critical features
    if (feature.isCritical) {
      return res.status(400).json({ error: 'CANNOT_OVERRIDE_CRITICAL' });
    }
    
    // Get current overrides
    const current = await db.query(
      `SELECT feature_overrides, role FROM user_permissions WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );
    
    // Managers can only modify agents
    if (current.rows[0]?.role && current.rows[0].role !== 'agent' && req.permissions!.role !== 'admin') {
      return res.status(403).json({ error: 'CAN_ONLY_MODIFY_AGENTS' });
    }
    
    const currentOverrides = current.rows[0]?.feature_overrides || {};
    const oldValue = currentOverrides[featureId];
    
    // Update overrides
    const newOverrides = { ...currentOverrides, [featureId]: enabled };
    
    await db.query(`
      INSERT INTO user_permissions (user_id, organization_id, feature_overrides, set_by)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET feature_overrides = $3, set_by = $4, updated_at = NOW()
    `, [userId, orgId, JSON.stringify(newOverrides), changedBy]);
    
    // Audit log
    await db.query(`
      INSERT INTO permission_audit_log 
        (organization_id, changed_by_user_id, target_user_id, change_type, feature_id, old_override, new_override, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [orgId, changedBy, userId, enabled ? 'override_added' : 'override_removed', featureId, oldValue, enabled, reason]);
    
    // Invalidate cache
    invalidatePermissionCache(orgId, parseInt(userId));
    
    res.json({ success: true, featureId, enabled });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/permissions/users/:userId/override/:featureId - Remove override
// ═══════════════════════════════════════════════════════════════════════════════

router.delete('/permissions/users/:userId/override/:featureId',
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const { userId, featureId } = req.params;
    const orgId = req.user!.organizationId;
    const changedBy = req.user!.id;
    
    // Get current overrides
    const current = await db.query(
      `SELECT feature_overrides FROM user_permissions WHERE user_id = $1 AND organization_id = $2`,
      [userId, orgId]
    );
    
    const currentOverrides = current.rows[0]?.feature_overrides || {};
    const oldValue = currentOverrides[featureId];
    
    // Remove override
    delete currentOverrides[featureId];
    
    await db.query(`
      UPDATE user_permissions 
      SET feature_overrides = $3, set_by = $4, updated_at = NOW()
      WHERE user_id = $1 AND organization_id = $2
    `, [userId, orgId, JSON.stringify(currentOverrides), changedBy]);
    
    // Audit log
    await db.query(`
      INSERT INTO permission_audit_log 
        (organization_id, changed_by_user_id, target_user_id, change_type, feature_id, old_override, new_override)
      VALUES ($1, $2, $3, 'override_removed', $4, $5, NULL)
    `, [orgId, changedBy, userId, featureId, oldValue]);
    
    // Invalidate cache
    invalidatePermissionCache(orgId, parseInt(userId));
    
    res.json({ success: true });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/permissions/users/:userId/preset - Apply a preset
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/permissions/users/:userId/preset',
  requireRole('manager'),
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { presetId, reason } = req.body;
    const orgId = req.user!.organizationId;
    const changedBy = req.user!.id;
    
    const preset = PERMISSION_PRESETS.find(p => p.id === presetId);
    if (!preset) {
      return res.status(400).json({ error: 'INVALID_PRESET' });
    }
    
    // Only admins can set manager/admin presets
    if ((preset.targetRole === 'admin' || preset.targetRole === 'manager') && req.permissions!.role !== 'admin') {
      return res.status(403).json({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
    
    // Update user
    await db.query(`
      INSERT INTO user_permissions (user_id, organization_id, role, agent_stage, feature_overrides, set_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, organization_id) 
      DO UPDATE SET role = $3, agent_stage = $4, feature_overrides = $5, set_by = $6, updated_at = NOW()
    `, [userId, orgId, preset.targetRole, preset.targetStage || 'trainee', JSON.stringify(preset.overrides), changedBy]);
    
    // Audit log
    await db.query(`
      INSERT INTO permission_audit_log 
        (organization_id, changed_by_user_id, target_user_id, change_type, preset_id, reason)
      VALUES ($1, $2, $3, 'preset_applied', $4, $5)
    `, [orgId, changedBy, userId, presetId, reason]);
    
    // Invalidate cache
    invalidatePermissionCache(orgId, parseInt(userId));
    
    res.json({ 
      success: true, 
      preset: preset.name,
      role: preset.targetRole,
      stage: preset.targetStage
    });
  }
);

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/permissions/audit - Get audit log
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/permissions/audit',
  requireRole('admin'),
  async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { limit = 50, offset = 0, userId } = req.query;
    
    let query = `
      SELECT 
        pal.*,
        cb.name as changed_by_name,
        tu.name as target_user_name
      FROM permission_audit_log pal
      LEFT JOIN users cb ON pal.changed_by_user_id = cb.id
      LEFT JOIN users tu ON pal.target_user_id = tu.id
      WHERE pal.organization_id = $1
    `;
    const params: any[] = [orgId];
    
    if (userId) {
      query += ` AND pal.target_user_id = $${params.length + 1}`;
      params.push(userId);
    }
    
    query += ` ORDER BY pal.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    res.json({ entries: result.rows });
  }
);

export default router;
