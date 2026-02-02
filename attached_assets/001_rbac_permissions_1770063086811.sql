-- PCBancard RBAC + Feature Access Control System
-- Database Schema Migration
-- 
-- This schema supports:
-- 1. User roles (admin, manager, agent)
-- 2. Agent stages (trainee, active, senior)
-- 3. Per-user feature overrides
-- 4. Audit logging

-- ═══════════════════════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'manager', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE agent_stage AS ENUM ('trainee', 'active', 'senior');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- USER PERMISSIONS TABLE
-- Stores role, stage, and per-user feature overrides
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Role and stage
  role user_role NOT NULL DEFAULT 'agent',
  agent_stage agent_stage DEFAULT 'trainee',  -- Only relevant when role = 'agent'
  
  -- Per-user feature overrides (JSON object: { "feature_id": true/false })
  -- These OVERRIDE the defaults from role/stage
  feature_overrides JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  set_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- One permission record per user per org
  UNIQUE(user_id, organization_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_org ON user_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_role ON user_permissions(role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_stage ON user_permissions(agent_stage);

-- ═══════════════════════════════════════════════════════════════════════════════
-- PERMISSION CHANGE AUDIT LOG
-- Track all permission changes for compliance
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS permission_audit_log (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Who made the change
  changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- Whose permissions changed
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  -- What changed
  change_type VARCHAR(50) NOT NULL,  -- 'role_change', 'stage_change', 'override_added', 'override_removed', 'preset_applied'
  
  -- Previous and new values
  old_role user_role,
  new_role user_role,
  old_stage agent_stage,
  new_stage agent_stage,
  feature_id VARCHAR(100),
  old_override BOOLEAN,
  new_override BOOLEAN,
  preset_id VARCHAR(100),
  
  -- Context
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permission_audit_org ON permission_audit_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_target ON permission_audit_log(target_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_changed_by ON permission_audit_log(changed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_created ON permission_audit_log(created_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- ORGANIZATION FEATURE SETTINGS
-- Organization-wide feature enable/disable (overrides everything)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organization_features (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_id VARCHAR(100) NOT NULL,
  
  -- If false, feature is disabled for ENTIRE organization regardless of user perms
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  disabled_reason TEXT,
  disabled_by INTEGER REFERENCES users(id),
  disabled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(organization_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_org_features_org ON organization_features(organization_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Get user permissions record (creates default if not exists)
CREATE OR REPLACE FUNCTION get_or_create_user_permissions(
  p_user_id INTEGER,
  p_organization_id INTEGER
) RETURNS user_permissions AS $$
DECLARE
  result user_permissions;
BEGIN
  -- Try to get existing
  SELECT * INTO result
  FROM user_permissions
  WHERE user_id = p_user_id AND organization_id = p_organization_id;
  
  -- If not found, create with defaults
  IF NOT FOUND THEN
    INSERT INTO user_permissions (user_id, organization_id, role, agent_stage)
    VALUES (p_user_id, p_organization_id, 'agent', 'trainee')
    RETURNING * INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Check if a feature is enabled for organization
CREATE OR REPLACE FUNCTION is_org_feature_enabled(
  p_organization_id INTEGER,
  p_feature_id VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  is_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO is_enabled
  FROM organization_features
  WHERE organization_id = p_organization_id AND feature_id = p_feature_id;
  
  -- If no record, default to enabled
  RETURN COALESCE(is_enabled, true);
END;
$$ LANGUAGE plpgsql;

-- Get all user permissions as JSON (for API response)
CREATE OR REPLACE FUNCTION get_user_permissions_json(
  p_user_id INTEGER,
  p_organization_id INTEGER
) RETURNS JSONB AS $$
DECLARE
  perms user_permissions;
BEGIN
  perms := get_or_create_user_permissions(p_user_id, p_organization_id);
  
  RETURN jsonb_build_object(
    'userId', perms.user_id,
    'organizationId', perms.organization_id,
    'role', perms.role,
    'agentStage', perms.agent_stage,
    'overrides', perms.feature_overrides,
    'updatedAt', perms.updated_at
  );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════
-- UPDATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_permissions_updated ON user_permissions;
CREATE TRIGGER user_permissions_updated
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION update_permissions_timestamp();

DROP TRIGGER IF EXISTS org_features_updated ON organization_features;
CREATE TRIGGER org_features_updated
  BEFORE UPDATE ON organization_features
  FOR EACH ROW EXECUTE FUNCTION update_permissions_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA / MIGRATION FOR EXISTING USERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create permissions for all existing users who don't have them
-- Default: agent role, trainee stage
INSERT INTO user_permissions (user_id, organization_id, role, agent_stage)
SELECT 
  om.user_id,
  om.organization_id,
  CASE 
    WHEN om.role = 'owner' THEN 'admin'::user_role
    WHEN om.role = 'admin' THEN 'admin'::user_role
    WHEN om.role = 'manager' THEN 'manager'::user_role
    ELSE 'agent'::user_role
  END,
  'trainee'::agent_stage
FROM organization_members om
WHERE NOT EXISTS (
  SELECT 1 FROM user_permissions up 
  WHERE up.user_id = om.user_id AND up.organization_id = om.organization_id
)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE user_permissions IS 'User roles, agent stages, and per-user feature overrides';
COMMENT ON TABLE permission_audit_log IS 'Audit trail of all permission changes';
COMMENT ON TABLE organization_features IS 'Organization-wide feature toggles (master switch)';

COMMENT ON COLUMN user_permissions.role IS 'admin = all access, manager = team oversight, agent = controlled by stage';
COMMENT ON COLUMN user_permissions.agent_stage IS 'trainee = training only, active = CRM/drops, senior = full tools';
COMMENT ON COLUMN user_permissions.feature_overrides IS 'Per-user overrides: { "feature_id": true/false }';
