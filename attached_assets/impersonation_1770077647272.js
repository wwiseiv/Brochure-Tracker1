// =====================================================
// IMPERSONATION API ROUTES
// =====================================================

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  ImpersonationManager, 
  requireRole, 
  requireCanImpersonate,
  blockDuringImpersonation 
} = require('../middleware/impersonation');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// =====================================================
// USER MANAGEMENT ENDPOINTS
// =====================================================

/**
 * GET /api/impersonation/users
 * Get list of users that can be impersonated by current user
 */
router.get('/users', requireCanImpersonate, async (req, res) => {
  try {
    const effectiveUser = req.impersonation?.originalUser || req.user;
    const users = await User.getImpersonatableUsers(effectiveUser.id);
    
    // Group by role for easier display
    const grouped = {
      managers: users.filter(u => u.role === 'manager'),
      agents: users.filter(u => u.role === 'agent'),
      admins: users.filter(u => u.role === 'admin')
    };

    res.json({
      success: true,
      currentUserRole: effectiveUser.role,
      users: users.map(u => u.toJSON()),
      grouped: {
        managers: grouped.managers.map(u => u.toJSON()),
        agents: grouped.agents.map(u => u.toJSON()),
        admins: grouped.admins.map(u => u.toJSON())
      },
      totalCount: users.length
    });
  } catch (err) {
    console.error('Error fetching impersonatable users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/impersonation/users/hierarchy
 * Get full user hierarchy (for super admins and admins)
 */
router.get('/users/hierarchy', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    // Get all managers with their agents
    const result = await pool.query(`
      SELECT 
        m.id as manager_id,
        m.email as manager_email,
        m.first_name as manager_first_name,
        m.last_name as manager_last_name,
        m.role as manager_role,
        COALESCE(
          json_agg(
            json_build_object(
              'id', a.id,
              'email', a.email,
              'firstName', a.first_name,
              'lastName', a.last_name,
              'isActive', a.is_active
            )
          ) FILTER (WHERE a.id IS NOT NULL),
          '[]'
        ) as agents
      FROM users m
      LEFT JOIN manager_agent_assignments maa ON m.id = maa.manager_id AND maa.is_active = true
      LEFT JOIN users a ON maa.agent_id = a.id AND a.is_active = true
      WHERE m.role IN ('manager', 'admin', 'super_admin') AND m.is_active = true
      GROUP BY m.id, m.email, m.first_name, m.last_name, m.role
      ORDER BY m.role DESC, m.last_name, m.first_name
    `);

    res.json({
      success: true,
      hierarchy: result.rows
    });
  } catch (err) {
    console.error('Error fetching user hierarchy:', err);
    res.status(500).json({ error: 'Failed to fetch user hierarchy' });
  }
});

// =====================================================
// IMPERSONATION SESSION ENDPOINTS
// =====================================================

/**
 * POST /api/impersonation/start
 * Start impersonating another user
 */
router.post('/start', requireCanImpersonate, async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const effectiveUser = req.impersonation?.originalUser || req.user;

    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required' });
    }

    // End any existing impersonation first
    if (req.impersonation?.isActive) {
      await ImpersonationManager.endImpersonation(
        req.impersonation.sessionId, 
        req.impersonation.originalUser.id
      );
    }

    const session = await ImpersonationManager.startImpersonation(
      effectiveUser.id,
      targetUserId,
      req
    );

    res.json({
      success: true,
      message: `Now viewing as ${session.impersonatedUser.fullName}`,
      session: {
        id: session.sessionId,
        token: session.token,
        originalUser: session.originalUser,
        impersonatedUser: session.impersonatedUser
      }
    });
  } catch (err) {
    console.error('Error starting impersonation:', err);
    res.status(403).json({ error: err.message });
  }
});

/**
 * POST /api/impersonation/end
 * End current impersonation session
 */
router.post('/end', async (req, res) => {
  try {
    if (!req.impersonation?.isActive) {
      return res.status(400).json({ error: 'No active impersonation session' });
    }

    await ImpersonationManager.endImpersonation(
      req.impersonation.sessionId,
      req.impersonation.originalUser.id
    );

    res.json({
      success: true,
      message: 'Impersonation ended',
      returnToUser: req.impersonation.originalUser.toJSON()
    });
  } catch (err) {
    console.error('Error ending impersonation:', err);
    res.status(500).json({ error: 'Failed to end impersonation' });
  }
});

/**
 * GET /api/impersonation/status
 * Get current impersonation status
 */
router.get('/status', async (req, res) => {
  try {
    if (req.impersonation?.isActive) {
      res.json({
        isImpersonating: true,
        sessionId: req.impersonation.sessionId,
        originalUser: req.impersonation.originalUser.toJSON(),
        impersonatedUser: req.impersonation.impersonatedUser.toJSON(),
        startedAt: req.impersonation.startedAt
      });
    } else {
      res.json({
        isImpersonating: false,
        currentUser: req.user?.toJSON() || null
      });
    }
  } catch (err) {
    console.error('Error fetching impersonation status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

/**
 * GET /api/impersonation/active-sessions
 * Get all active impersonation sessions (super admin only)
 */
router.get('/active-sessions', requireRole('super_admin'), async (req, res) => {
  try {
    const sessions = await ImpersonationManager.getAllActiveSessions();
    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (err) {
    console.error('Error fetching active sessions:', err);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

/**
 * POST /api/impersonation/end-all
 * End all impersonation sessions for current user
 */
router.post('/end-all', async (req, res) => {
  try {
    const userId = req.impersonation?.originalUser?.id || req.user?.id;
    await ImpersonationManager.endAllSessions(userId);
    
    res.json({
      success: true,
      message: 'All impersonation sessions ended'
    });
  } catch (err) {
    console.error('Error ending all sessions:', err);
    res.status(500).json({ error: 'Failed to end sessions' });
  }
});

// =====================================================
// AUDIT LOG ENDPOINTS
// =====================================================

/**
 * GET /api/impersonation/audit-log
 * Get impersonation audit log (admin only)
 */
router.get('/audit-log', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0, userId } = req.query;

    let query = `
      SELECT 
        ial.*,
        ou.email as original_user_email,
        ou.first_name as original_user_first_name,
        ou.last_name as original_user_last_name,
        iu.email as impersonated_user_email,
        iu.first_name as impersonated_user_first_name,
        iu.last_name as impersonated_user_last_name
      FROM impersonation_audit_log ial
      JOIN users ou ON ial.original_user_id = ou.id
      JOIN users iu ON ial.impersonated_user_id = iu.id
    `;

    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` WHERE ial.original_user_id = $${paramIndex++} OR ial.impersonated_user_id = $${paramIndex++}`;
      params.push(userId, userId);
    }

    query += ` ORDER BY ial.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM impersonation_audit_log');

    res.json({
      success: true,
      logs: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Failed to fetch audit log' });
  }
});

// =====================================================
// MANAGER-AGENT ASSIGNMENT ENDPOINTS
// =====================================================

/**
 * POST /api/impersonation/assign-agent
 * Assign an agent to a manager
 */
router.post('/assign-agent', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { managerId, agentId } = req.body;

    if (!managerId || !agentId) {
      return res.status(400).json({ error: 'managerId and agentId are required' });
    }

    const manager = await User.findById(managerId);
    const agent = await User.findById(agentId);

    if (!manager || !agent) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!manager.isManager) {
      return res.status(400).json({ error: 'Target user is not a manager' });
    }

    if (agent.role !== 'agent') {
      return res.status(400).json({ error: 'Can only assign agents' });
    }

    await manager.assignAgent(agentId, req.user.id);

    res.json({
      success: true,
      message: `${agent.fullName} assigned to ${manager.fullName}`
    });
  } catch (err) {
    console.error('Error assigning agent:', err);
    res.status(500).json({ error: 'Failed to assign agent' });
  }
});

/**
 * POST /api/impersonation/unassign-agent
 * Remove an agent from a manager
 */
router.post('/unassign-agent', requireRole('super_admin', 'admin'), async (req, res) => {
  try {
    const { managerId, agentId } = req.body;

    const manager = await User.findById(managerId);
    if (!manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    await manager.removeAgent(agentId);

    res.json({
      success: true,
      message: 'Agent unassigned successfully'
    });
  } catch (err) {
    console.error('Error unassigning agent:', err);
    res.status(500).json({ error: 'Failed to unassign agent' });
  }
});

// =====================================================
// ROLE MANAGEMENT ENDPOINTS
// =====================================================

/**
 * POST /api/impersonation/update-role
 * Update a user's role (super admin only)
 */
router.post('/update-role', requireRole('super_admin'), blockDuringImpersonation, async (req, res) => {
  try {
    const { userId, newRole } = req.body;

    if (!userId || !newRole) {
      return res.status(400).json({ error: 'userId and newRole are required' });
    }

    if (!['super_admin', 'admin', 'manager', 'agent'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.updateRole(newRole);

    res.json({
      success: true,
      message: `${user.fullName} role updated to ${newRole}`,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('Error updating role:', err);
    res.status(500).json({ error: err.message || 'Failed to update role' });
  }
});

module.exports = router;
