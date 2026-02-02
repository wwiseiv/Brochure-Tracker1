/**
 * PCBancard RBAC - Permission Engine Tests
 * 
 * Tests to verify permission resolution logic works correctly.
 * Run with: npx vitest run permissions.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  evaluatePermission,
  getEffectivePermissions,
  canAccessRoute,
  canAccessApi,
  getFeatureById,
  getTrainingFeatures,
  UserPermissions
} from '../shared/permissions';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════

const traineeAgent: UserPermissions = {
  userId: 1,
  organizationId: 1,
  role: 'agent',
  agentStage: 'trainee',
  overrides: {}
};

const activeAgent: UserPermissions = {
  userId: 2,
  organizationId: 1,
  role: 'agent',
  agentStage: 'active',
  overrides: {}
};

const seniorAgent: UserPermissions = {
  userId: 3,
  organizationId: 1,
  role: 'agent',
  agentStage: 'senior',
  overrides: {}
};

const manager: UserPermissions = {
  userId: 4,
  organizationId: 1,
  role: 'manager',
  overrides: {}
};

const admin: UserPermissions = {
  userId: 5,
  organizationId: 1,
  role: 'admin',
  overrides: {}
};

const traineeWithOverride: UserPermissions = {
  userId: 6,
  organizationId: 1,
  role: 'agent',
  agentStage: 'trainee',
  overrides: {
    deal_pipeline: true  // Override to grant access
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION RESOLUTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Permission Resolution Order', () => {
  
  describe('1. Admin role => allow ALL', () => {
    it('admin can access any feature', () => {
      expect(evaluatePermission('deal_pipeline', admin)).toBe(true);
      expect(evaluatePermission('statement_analyzer', admin)).toBe(true);
      expect(evaluatePermission('team_management', admin)).toBe(true);
      expect(evaluatePermission('admin_dashboard', admin)).toBe(true);
    });
  });

  describe('2. Critical features => always allowed', () => {
    it('all users can access critical features', () => {
      expect(evaluatePermission('user_profile', traineeAgent)).toBe(true);
      expect(evaluatePermission('help_center', traineeAgent)).toBe(true);
      expect(evaluatePermission('dashboard', activeAgent)).toBe(true);
    });
  });

  describe('3. Explicit per-user overrides', () => {
    it('override grants access even if stage denies', () => {
      // Trainee normally can't access pipeline
      expect(evaluatePermission('deal_pipeline', traineeAgent)).toBe(false);
      // But with override, they can
      expect(evaluatePermission('deal_pipeline', traineeWithOverride)).toBe(true);
    });

    it('override can deny access even if stage allows', () => {
      const seniorWithDeny: UserPermissions = {
        ...seniorAgent,
        overrides: { statement_analyzer: false }
      };
      // Senior normally has access
      expect(evaluatePermission('statement_analyzer', seniorAgent)).toBe(true);
      // But override denies it
      expect(evaluatePermission('statement_analyzer', seniorWithDeny)).toBe(false);
    });
  });

  describe('4. Stage defaults for agents', () => {
    it('trainee can only access training features', () => {
      // Training features - YES
      expect(evaluatePermission('sales_spark', traineeAgent)).toBe(true);
      expect(evaluatePermission('role_play', traineeAgent)).toBe(true);
      expect(evaluatePermission('presentation_training', traineeAgent)).toBe(true);
      expect(evaluatePermission('equipiq', traineeAgent)).toBe(true);
      expect(evaluatePermission('ai_coaching', traineeAgent)).toBe(true);
      
      // CRM features - NO
      expect(evaluatePermission('deal_pipeline', traineeAgent)).toBe(false);
      expect(evaluatePermission('merchant_crm', traineeAgent)).toBe(false);
      expect(evaluatePermission('drop_logging', traineeAgent)).toBe(false);
      
      // Advanced AI tools - NO
      expect(evaluatePermission('statement_analyzer', traineeAgent)).toBe(false);
      expect(evaluatePermission('proposal_generator', traineeAgent)).toBe(false);
    });

    it('active agent can access CRM but not advanced AI', () => {
      // Training features - YES
      expect(evaluatePermission('sales_spark', activeAgent)).toBe(true);
      
      // CRM features - YES
      expect(evaluatePermission('deal_pipeline', activeAgent)).toBe(true);
      expect(evaluatePermission('merchant_crm', activeAgent)).toBe(true);
      expect(evaluatePermission('drop_logging', activeAgent)).toBe(true);
      
      // Advanced AI tools - NO
      expect(evaluatePermission('statement_analyzer', activeAgent)).toBe(false);
      expect(evaluatePermission('proposal_generator', activeAgent)).toBe(false);
    });

    it('senior agent can access all agent features', () => {
      expect(evaluatePermission('sales_spark', seniorAgent)).toBe(true);
      expect(evaluatePermission('deal_pipeline', seniorAgent)).toBe(true);
      expect(evaluatePermission('statement_analyzer', seniorAgent)).toBe(true);
      expect(evaluatePermission('proposal_generator', seniorAgent)).toBe(true);
      
      // But not team management
      expect(evaluatePermission('team_management', seniorAgent)).toBe(false);
    });
  });

  describe('5. Role defaults', () => {
    it('manager has team oversight features', () => {
      expect(evaluatePermission('team_management', manager)).toBe(true);
      expect(evaluatePermission('team_pipeline', manager)).toBe(true);
      expect(evaluatePermission('activity_feed', manager)).toBe(true);
      expect(evaluatePermission('user_permissions', manager)).toBe(true);
      
      // But not admin features
      expect(evaluatePermission('admin_dashboard', manager)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTE PROTECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Route Protection', () => {
  it('trainee cannot access /pipeline', () => {
    const result = canAccessRoute('/pipeline', traineeAgent);
    expect(result.allowed).toBe(false);
    expect(result.blockedByFeature).toBe('deal_pipeline');
  });

  it('trainee can access /coach', () => {
    const result = canAccessRoute('/coach', traineeAgent);
    expect(result.allowed).toBe(true);
  });

  it('active agent can access /pipeline', () => {
    const result = canAccessRoute('/pipeline', activeAgent);
    expect(result.allowed).toBe(true);
  });

  it('active agent cannot access /admin/permissions', () => {
    const result = canAccessRoute('/admin/permissions', activeAgent);
    expect(result.allowed).toBe(false);
  });

  it('manager can access /admin/permissions', () => {
    const result = canAccessRoute('/admin/permissions', manager);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// API PROTECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('API Protection', () => {
  it('trainee cannot access /api/deals', () => {
    const result = canAccessApi('/api/deals/123', traineeAgent);
    expect(result.allowed).toBe(false);
  });

  it('trainee can access /api/coach', () => {
    const result = canAccessApi('/api/coach/advice', traineeAgent);
    expect(result.allowed).toBe(true);
  });

  it('senior agent can access /api/statement-analyzer', () => {
    const result = canAccessApi('/api/statement-analyzer/analyze', seniorAgent);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECTIVE PERMISSIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Effective Permissions', () => {
  it('correctly computes all permissions for trainee', () => {
    const effective = getEffectivePermissions(traineeAgent);
    
    expect(effective.role).toBe('agent');
    expect(effective.agentStage).toBe('trainee');
    expect(effective.canManagePermissions).toBe(false);
    expect(effective.canViewTeam).toBe(false);
    
    // Training features enabled
    expect(effective.features.sales_spark).toBe(true);
    expect(effective.features.equipiq).toBe(true);
    
    // CRM disabled
    expect(effective.features.deal_pipeline).toBe(false);
  });

  it('manager has team permissions', () => {
    const effective = getEffectivePermissions(manager);
    
    expect(effective.canManagePermissions).toBe(true);
    expect(effective.canViewTeam).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING FEATURES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Training Features Bundle', () => {
  it('returns correct training features', () => {
    const trainingFeatures = getTrainingFeatures();
    const trainingIds = trainingFeatures.map(f => f.id);
    
    // Should include all training features
    expect(trainingIds).toContain('sales_spark');
    expect(trainingIds).toContain('ai_coaching');
    expect(trainingIds).toContain('role_play');
    expect(trainingIds).toContain('presentation_training');
    expect(trainingIds).toContain('equipiq');
    expect(trainingIds).toContain('daily_edge');
    expect(trainingIds).toContain('ai_help_assistant');
    
    // Should not include CRM features
    expect(trainingIds).not.toContain('deal_pipeline');
    expect(trainingIds).not.toContain('merchant_crm');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE REGISTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Feature Registry', () => {
  it('all features have required properties', () => {
    const salesSpark = getFeatureById('sales_spark');
    
    expect(salesSpark).toBeDefined();
    expect(salesSpark?.name).toBe('Sales Spark');
    expect(salesSpark?.routes).toContain('/coach');
    expect(salesSpark?.roleDefaults).toBeDefined();
    expect(salesSpark?.stageDefaults).toBeDefined();
  });

  it('unknown feature returns undefined', () => {
    const unknown = getFeatureById('nonexistent_feature');
    expect(unknown).toBeUndefined();
  });
});
