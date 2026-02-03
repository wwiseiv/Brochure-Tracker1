-- =====================================================
-- USER IMPERSONATION SYSTEM - DATABASE SCHEMA
-- =====================================================

-- User Roles Enum
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'manager', 'agent');

-- =====================================================
-- USERS TABLE (Update existing or create new)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role NOT NULL DEFAULT 'agent',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Ensure managers can only be assigned to agents
    CONSTRAINT valid_manager_assignment CHECK (
        (role = 'agent' AND manager_id IS NOT NULL) OR
        (role != 'agent')
    )
);

-- =====================================================
-- SET SUPER ADMIN - wwiseiv@icloud.com
-- =====================================================
-- Run this after user creation or update existing user
UPDATE users 
SET role = 'super_admin' 
WHERE email = 'wwiseiv@icloud.com';

-- If user doesn't exist, insert them (adjust password as needed)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('wwiseiv@icloud.com', 'PLACEHOLDER_HASH', 'William', 'Wise', 'super_admin')
ON CONFLICT (email) DO UPDATE SET role = 'super_admin';

-- =====================================================
-- IMPERSONATION SESSIONS TABLE
-- =====================================================
CREATE TABLE impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id UUID NOT NULL REFERENCES users(id),
    impersonated_user_id UUID NOT NULL REFERENCES users(id),
    session_token VARCHAR(500) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    
    -- Prevent self-impersonation
    CONSTRAINT no_self_impersonation CHECK (original_user_id != impersonated_user_id)
);

-- =====================================================
-- IMPERSONATION AUDIT LOG TABLE
-- =====================================================
CREATE TABLE impersonation_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES impersonation_sessions(id),
    original_user_id UUID NOT NULL REFERENCES users(id),
    impersonated_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- 'start', 'end', 'action_performed'
    action_details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- MANAGER-AGENT ASSIGNMENTS TABLE
-- =====================================================
CREATE TABLE manager_agent_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    manager_id UUID NOT NULL REFERENCES users(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    
    UNIQUE(manager_id, agent_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_manager ON users(manager_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_impersonation_sessions_active ON impersonation_sessions(is_active) WHERE is_active = true;
CREATE INDEX idx_impersonation_audit_created ON impersonation_audit_log(created_at);
CREATE INDEX idx_manager_assignments_manager ON manager_agent_assignments(manager_id);
CREATE INDEX idx_manager_assignments_agent ON manager_agent_assignments(agent_id);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Users with their managers
CREATE OR REPLACE VIEW users_with_managers AS
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.created_at,
    m.id AS manager_id,
    m.email AS manager_email,
    m.first_name AS manager_first_name,
    m.last_name AS manager_last_name
FROM users u
LEFT JOIN users m ON u.manager_id = m.id;

-- View: Managers with their agent counts
CREATE OR REPLACE VIEW managers_with_agent_counts AS
SELECT 
    m.id,
    m.email,
    m.first_name,
    m.last_name,
    m.role,
    COUNT(a.id) AS agent_count
FROM users m
LEFT JOIN manager_agent_assignments maa ON m.id = maa.manager_id AND maa.is_active = true
LEFT JOIN users a ON maa.agent_id = a.id AND a.is_active = true
WHERE m.role IN ('manager', 'admin', 'super_admin')
GROUP BY m.id, m.email, m.first_name, m.last_name, m.role;

-- View: Active impersonation sessions
CREATE OR REPLACE VIEW active_impersonations AS
SELECT 
    ims.id AS session_id,
    ims.started_at,
    ou.email AS original_user_email,
    ou.first_name AS original_user_first_name,
    ou.last_name AS original_user_last_name,
    ou.role AS original_user_role,
    iu.email AS impersonated_user_email,
    iu.first_name AS impersonated_user_first_name,
    iu.last_name AS impersonated_user_last_name,
    iu.role AS impersonated_user_role
FROM impersonation_sessions ims
JOIN users ou ON ims.original_user_id = ou.id
JOIN users iu ON ims.impersonated_user_id = iu.id
WHERE ims.is_active = true;

-- =====================================================
-- FUNCTIONS FOR IMPERSONATION LOGIC
-- =====================================================

-- Function: Check if user can impersonate another user
CREATE OR REPLACE FUNCTION can_impersonate(
    impersonator_id UUID,
    target_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    impersonator_role user_role;
    target_role user_role;
    is_assigned BOOLEAN;
BEGIN
    -- Get roles
    SELECT role INTO impersonator_role FROM users WHERE id = impersonator_id;
    SELECT role INTO target_role FROM users WHERE id = target_id;
    
    -- Super admin can impersonate anyone except themselves
    IF impersonator_role = 'super_admin' THEN
        RETURN impersonator_id != target_id;
    END IF;
    
    -- Admin can impersonate managers and agents (not super_admin or other admins)
    IF impersonator_role = 'admin' THEN
        RETURN target_role IN ('manager', 'agent');
    END IF;
    
    -- Manager can only impersonate their assigned agents
    IF impersonator_role = 'manager' THEN
        IF target_role != 'agent' THEN
            RETURN false;
        END IF;
        
        -- Check if agent is assigned to this manager
        SELECT EXISTS(
            SELECT 1 FROM manager_agent_assignments
            WHERE manager_id = impersonator_id
            AND agent_id = target_id
            AND is_active = true
        ) INTO is_assigned;
        
        RETURN is_assigned;
    END IF;
    
    -- Agents cannot impersonate anyone
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Function: Get users that can be impersonated by a given user
CREATE OR REPLACE FUNCTION get_impersonatable_users(requesting_user_id UUID)
RETURNS TABLE (
    id UUID,
    email VARCHAR,
    first_name VARCHAR,
    last_name VARCHAR,
    role user_role,
    is_active BOOLEAN
) AS $$
DECLARE
    requesting_user_role user_role;
BEGIN
    SELECT u.role INTO requesting_user_role FROM users u WHERE u.id = requesting_user_id;
    
    -- Super admin: all users except self
    IF requesting_user_role = 'super_admin' THEN
        RETURN QUERY
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
        FROM users u
        WHERE u.id != requesting_user_id AND u.is_active = true
        ORDER BY u.role, u.last_name, u.first_name;
    
    -- Admin: managers and agents only
    ELSIF requesting_user_role = 'admin' THEN
        RETURN QUERY
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
        FROM users u
        WHERE u.role IN ('manager', 'agent') AND u.is_active = true
        ORDER BY u.role, u.last_name, u.first_name;
    
    -- Manager: only their assigned agents
    ELSIF requesting_user_role = 'manager' THEN
        RETURN QUERY
        SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.is_active
        FROM users u
        JOIN manager_agent_assignments maa ON u.id = maa.agent_id
        WHERE maa.manager_id = requesting_user_id 
        AND maa.is_active = true 
        AND u.is_active = true
        ORDER BY u.last_name, u.first_name;
    END IF;
    
    -- Agents return nothing
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger: Auto-log impersonation actions
CREATE OR REPLACE FUNCTION log_impersonation_session()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO impersonation_audit_log (
            session_id, original_user_id, impersonated_user_id, 
            action, ip_address, user_agent
        ) VALUES (
            NEW.id, NEW.original_user_id, NEW.impersonated_user_id,
            'start', NEW.ip_address, NEW.user_agent
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.is_active = true AND NEW.is_active = false THEN
        INSERT INTO impersonation_audit_log (
            session_id, original_user_id, impersonated_user_id,
            action, ip_address, user_agent
        ) VALUES (
            NEW.id, NEW.original_user_id, NEW.impersonated_user_id,
            'end', NEW.ip_address, NEW.user_agent
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_impersonation
    AFTER INSERT OR UPDATE ON impersonation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION log_impersonation_session();
