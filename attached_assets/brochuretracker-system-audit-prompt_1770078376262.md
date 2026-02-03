# System Audit & Repair Prompt: BrochureTracker Role Hierarchy & Permissions

## CRITICAL MISSION

You are performing a comprehensive audit and repair of the BrochureTracker application's user management system. This includes the role hierarchy, permission toggles, user impersonation feature, and the broken agent onboarding flow.

---

## PHASE 1: ROLE HIERARCHY AUDIT & ENFORCEMENT

### 1.1 Verify Role Structure Exists

Search the entire codebase and verify these four roles are properly defined:

```
ROLE HIERARCHY (highest to lowest):
1. SUPER_ADMIN - Full system access, can impersonate anyone
2. ADMIN - Can manage managers and agents, view all data
3. MANAGER - Can manage assigned agents only
4. AGENT - Basic user, feature access controlled by permissions
```

**Tasks:**
- [ ] Find where roles are defined (database schema, constants file, enum)
- [ ] Verify `wwiseiv@icloud.com` is set as SUPER_ADMIN
- [ ] Ensure role field exists on all user records
- [ ] Check that role comparison/hierarchy logic exists

**If roles are not properly defined, create/fix:**

```javascript
// constants/roles.js
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  MANAGER: 'manager',
  AGENT: 'agent'
};

export const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  manager: 2,
  agent: 1
};

export const SUPER_ADMIN_EMAIL = 'wwiseiv@icloud.com';
```

### 1.2 Audit User Records

Run this check against the database:

```sql
-- Check all users have valid roles
SELECT id, email, role, 
  CASE 
    WHEN role IS NULL THEN 'MISSING ROLE'
    WHEN role NOT IN ('super_admin', 'admin', 'manager', 'agent') THEN 'INVALID ROLE'
    ELSE 'OK'
  END as status
FROM users;

-- Ensure super admin is set
SELECT * FROM users WHERE email = 'wwiseiv@icloud.com';

-- Count users by role
SELECT role, COUNT(*) as count FROM users GROUP BY role;
```

**Fix any issues found:**
- Users with NULL roles → Set to 'agent' (default)
- Users with invalid roles → Set to 'agent'
- If wwiseiv@icloud.com doesn't have super_admin → UPDATE to super_admin

### 1.3 Verify Role-Based Access Control (RBAC)

Check that protected routes/components enforce roles:

```javascript
// Look for patterns like:
requireRole('admin')
hasPermission('manage_users')
user.role === 'admin'
canAccess(user, 'feature')
```

**Ensure these pages are protected:**
- Team Management page → Admin+ only
- User Permissions modal → Admin+ only  
- Impersonation feature → Admin+ (Managers can only impersonate their agents)
- System Settings → Super Admin only

---

## PHASE 2: PERMISSION TOGGLE SYSTEM AUDIT

### 2.1 Inventory All Permission Toggles

Based on the screenshot, these permissions exist in the User Permissions modal:

| Permission Key | Display Name | Description |
|---------------|--------------|-------------|
| `view_leaderboard` | View Leaderboard | Can see team leaderboard rankings |
| `ai_coach` | AI Coach | Access AI role-play coaching |
| `equip_iq` | EquipIQ | Access equipment advisor |
| `daily_edge` | Daily Edge | Access motivation system |
| `export_data` | Export Data | Can export data to CSV/Excel |
| `record_meetings` | Record Meetings | Can record and analyze meetings |
| `manage_referrals` | Manage Referrals | Can create and manage referrals |
| `follow_up_sequences` | Follow-up Sequences | Access automated sequences |
| `proposal_generator` | Proposal Generator | Generate professional proposals |

### 2.2 Verify Permission Schema

Check that the database has a proper permissions structure:

```sql
-- Option A: JSON column on users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "view_leaderboard": true,
  "ai_coach": true,
  "equip_iq": true,
  "daily_edge": true,
  "export_data": false,
  "record_meetings": false,
  "manage_referrals": false,
  "follow_up_sequences": false,
  "proposal_generator": false
}';

-- Option B: Separate permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  permission_key VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(user_id, permission_key)
);
```

### 2.3 Verify Toggle API Endpoints

Find and test these endpoints:

```javascript
// GET user permissions
GET /api/users/:userId/permissions
// Response: { permissions: { view_leaderboard: true, ai_coach: true, ... } }

// UPDATE single permission (toggle)
PATCH /api/users/:userId/permissions
// Body: { permission: "ai_coach", enabled: false }

// UPDATE bulk permissions
PUT /api/users/:userId/permissions  
// Body: { permissions: { ai_coach: false, export_data: true } }
```

**If endpoints don't exist or are broken, create/fix them:**

```javascript
// routes/permissions.js
router.get('/users/:userId/permissions', requireRole('admin'), async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  res.json({ permissions: user.permissions });
});

router.patch('/users/:userId/permissions', requireRole('admin'), async (req, res) => {
  const { userId } = req.params;
  const { permission, enabled } = req.body;
  
  await pool.query(`
    UPDATE users 
    SET permissions = jsonb_set(permissions, $1, $2)
    WHERE id = $3
  `, [[permission], JSON.stringify(enabled), userId]);
  
  res.json({ success: true, permission, enabled });
});
```

### 2.4 Verify Frontend Toggle Component

Check the User Permissions modal component:

```jsx
// Find the modal component - likely named:
// UserPermissionsModal.jsx
// PermissionsDialog.jsx
// UserSettings.jsx

// Verify it:
// 1. Fetches current permissions on open
// 2. Renders toggle for each permission
// 3. Calls API on toggle change
// 4. Shows loading/success state
// 5. Handles errors gracefully
```

**Test each toggle:**
- [ ] Toggle ON → API called → Database updated → UI reflects change
- [ ] Toggle OFF → API called → Database updated → UI reflects change
- [ ] Refresh page → Permissions persist correctly
- [ ] Different user → Shows their specific permissions

### 2.5 Verify Permission Enforcement

For EACH permission, find where it's checked in the app:

```javascript
// Example checks to find:
if (user.permissions.ai_coach) { /* show AI Coach feature */ }
if (hasPermission(user, 'export_data')) { /* allow export */ }
user.can('record_meetings')
```

**Create enforcement if missing:**

```javascript
// hooks/usePermission.js
export function usePermission(permissionKey) {
  const { user } = useAuth();
  
  // Super admins and admins always have all permissions
  if (['super_admin', 'admin'].includes(user?.role)) {
    return true;
  }
  
  return user?.permissions?.[permissionKey] ?? false;
}

// Usage in components:
function AICoachButton() {
  const canUseAICoach = usePermission('ai_coach');
  
  if (!canUseAICoach) {
    return null; // or disabled button with tooltip
  }
  
  return <button>Start AI Coach</button>;
}
```

---

## PHASE 3: FIX BROKEN AGENT SIGNUP ONBOARDING

### 3.1 Identify the Broken Feature

The agent signup flow previously had a "logo box" modal/form that collected new agent information. This has stopped working.

**Search the codebase for:**
```
// File names to look for:
Onboarding*.jsx
SignupFlow*.jsx
NewAgentForm*.jsx
WelcomeModal*.jsx
AgentSetup*.jsx
ProfileSetup*.jsx

// Code patterns to find:
onboarding
welcome modal
first login
profile setup
new user
initial setup
logo upload
agent info
signup complete
```

### 3.2 Common Causes of Breakage

Check for these issues:

**A) Conditional Rendering Broken:**
```javascript
// Find code like this:
if (user.isFirstLogin || !user.profileComplete) {
  return <OnboardingModal />;
}

// Check that these fields exist and are set correctly:
// - user.isFirstLogin (should be true for new signups)
// - user.profileComplete (should be false until onboarding done)
// - user.onboardingCompleted
// - user.setupComplete
```

**B) API Endpoint Broken:**
```javascript
// Find the endpoint that marks onboarding complete:
POST /api/users/complete-onboarding
POST /api/onboarding/complete
PATCH /api/users/:id/profile

// Check it:
// - Exists
// - Has correct route
// - Database update works
// - Returns proper response
```

**C) State Management Issue:**
```javascript
// If using context/redux, check:
// - Onboarding state is initialized
// - State updates when user completes steps
// - State persists across page refreshes
```

**D) Modal/Component Not Mounting:**
```javascript
// Check the App.jsx or layout:
// - OnboardingModal is imported
// - OnboardingModal is rendered
// - Condition to show it is correct
```

### 3.3 Reconstruct the Onboarding Flow

If code is too broken to repair, rebuild it:

```jsx
// components/AgentOnboardingModal.jsx
import React, { useState } from 'react';

const ONBOARDING_FIELDS = [
  { key: 'firstName', label: 'First Name', type: 'text', required: true },
  { key: 'lastName', label: 'Last Name', type: 'text', required: true },
  { key: 'phone', label: 'Phone Number', type: 'tel', required: true },
  { key: 'company', label: 'Company Name', type: 'text', required: false },
  { key: 'territory', label: 'Sales Territory', type: 'text', required: false },
  { key: 'profilePhoto', label: 'Profile Photo', type: 'file', required: false },
  { key: 'logo', label: 'Company Logo', type: 'file', required: false }
];

export function AgentOnboardingModal({ user, onComplete }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/users/complete-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          ...formData
        })
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      onComplete();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if onboarding already complete
  if (user.onboardingComplete) return null;

  return (
    <div className="modal-overlay">
      <div className="modal onboarding-modal">
        <div className="modal-header">
          <h2>Welcome to BrochureTracker!</h2>
          <p>Let's set up your profile</p>
        </div>
        
        <div className="modal-body">
          {ONBOARDING_FIELDS.map(field => (
            <div key={field.key} className="form-group">
              <label>{field.label}</label>
              {field.type === 'file' ? (
                <input 
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(field.key, e.target.files[0])}
                />
              ) : (
                <input
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({...formData, [field.key]: e.target.value})}
                  required={field.required}
                />
              )}
            </div>
          ))}
          
          {error && <div className="error">{error}</div>}
        </div>
        
        <div className="modal-footer">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3.4 Backend Endpoint for Onboarding

```javascript
// routes/onboarding.js
router.post('/users/complete-onboarding', async (req, res) => {
  try {
    const { userId, firstName, lastName, phone, company, territory } = req.body;
    
    await pool.query(`
      UPDATE users SET
        first_name = $1,
        last_name = $2,
        phone = $3,
        company = $4,
        territory = $5,
        onboarding_complete = true,
        updated_at = NOW()
      WHERE id = $6
    `, [firstName, lastName, phone, company, territory, userId]);
    
    // Handle file uploads separately if present
    // ...
    
    res.json({ success: true });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to complete onboarding' });
  }
});
```

### 3.5 Integrate Onboarding Check

```jsx
// App.jsx or Layout.jsx
import { AgentOnboardingModal } from './components/AgentOnboardingModal';

function App() {
  const { user, refreshUser } = useAuth();
  
  return (
    <>
      {/* Show onboarding modal for new agents */}
      {user && user.role === 'agent' && !user.onboardingComplete && (
        <AgentOnboardingModal 
          user={user} 
          onComplete={() => refreshUser()} 
        />
      )}
      
      {/* Rest of app */}
      <Router>
        {/* ... */}
      </Router>
    </>
  );
}
```

---

## PHASE 4: USER IMPERSONATION INTEGRATION

### 4.1 Add Impersonation to Team Management

In the Team Management page, add "View As" buttons:

```jsx
// In the Actions column of the user table
<td className="actions">
  <button onClick={() => openSettings(user)}>⚙️</button>
  <button onClick={() => editUser(user)}>✏️</button>
  
  {/* Add impersonation button */}
  {canImpersonate(currentUser, user) && (
    <button 
      onClick={() => startImpersonation(user.id)}
      title={`View as ${user.firstName}`}
    >
      👁️
    </button>
  )}
  
  <button onClick={() => deleteUser(user)}>🗑️</button>
</td>
```

### 4.2 Permission Check for Impersonation

```javascript
function canImpersonate(currentUser, targetUser) {
  // Super admin can impersonate anyone except other super admins
  if (currentUser.role === 'super_admin') {
    return targetUser.role !== 'super_admin';
  }
  
  // Admin can impersonate managers and agents
  if (currentUser.role === 'admin') {
    return ['manager', 'agent'].includes(targetUser.role);
  }
  
  // Manager can only impersonate their assigned agents
  if (currentUser.role === 'manager') {
    return targetUser.role === 'agent' && 
           targetUser.managerId === currentUser.id;
  }
  
  return false;
}
```

---

## PHASE 5: COMPREHENSIVE TESTING CHECKLIST

### Role Hierarchy Tests
- [ ] Super Admin (wwiseiv@icloud.com) can access all pages
- [ ] Super Admin can see all users in Team Management
- [ ] Super Admin can impersonate Admins, Managers, and Agents
- [ ] Admin can access Team Management
- [ ] Admin can see Managers and Agents (not Super Admins)
- [ ] Admin can impersonate Managers and Agents
- [ ] Manager can only see their assigned Agents
- [ ] Manager can only impersonate their assigned Agents
- [ ] Agent cannot access Team Management
- [ ] Agent cannot impersonate anyone

### Permission Toggle Tests
- [ ] Toggle View Leaderboard ON → Agent can see leaderboard
- [ ] Toggle View Leaderboard OFF → Agent cannot see leaderboard
- [ ] Toggle AI Coach ON → Agent can access AI Coach
- [ ] Toggle AI Coach OFF → AI Coach button hidden/disabled
- [ ] Toggle Export Data ON → Export buttons appear
- [ ] Toggle Export Data OFF → Export buttons hidden
- [ ] All 9 toggles work correctly
- [ ] Permission changes persist after page refresh
- [ ] Permission changes persist after logout/login

### Agent Onboarding Tests
- [ ] New agent signs up → Onboarding modal appears
- [ ] Modal displays all required fields
- [ ] Logo/photo upload works
- [ ] Submit saves data to database
- [ ] After completion, modal doesn't show again
- [ ] User profile shows entered information
- [ ] Existing agents don't see onboarding modal

### Impersonation Tests
- [ ] "View As" button appears for valid targets
- [ ] Clicking "View As" shows confirmation modal
- [ ] Confirming starts impersonation session
- [ ] Red banner appears at top of screen
- [ ] App shows impersonated user's data
- [ ] "Exit" button returns to original user
- [ ] Actions during impersonation are logged
- [ ] Certain actions blocked during impersonation

---

## PHASE 6: REPORTING

After completing all phases, generate a report:

```markdown
# BrochureTracker System Audit Report

## Date: [DATE]
## Auditor: Claude AI

### Role Hierarchy Status
- Super Admin configured: ✅/❌
- Role field on all users: ✅/❌
- RBAC enforcement: ✅/❌
- Issues found: [LIST]
- Issues fixed: [LIST]

### Permission System Status
- All 9 permissions defined: ✅/❌
- Toggle API working: ✅/❌
- Frontend toggles working: ✅/❌
- Permission enforcement: ✅/❌
- Issues found: [LIST]
- Issues fixed: [LIST]

### Agent Onboarding Status
- Onboarding flow found: ✅/❌
- Root cause of breakage: [DESCRIPTION]
- Fix applied: [DESCRIPTION]
- Testing passed: ✅/❌

### Impersonation System Status
- Integration complete: ✅/❌
- Role restrictions enforced: ✅/❌
- Audit logging active: ✅/❌

### Remaining Issues
[LIST ANY UNRESOLVED ISSUES]

### Recommendations
[LIST RECOMMENDED IMPROVEMENTS]
```

---

## EXECUTION INSTRUCTIONS

Run these phases in order:
1. **Phase 1** - Fix role hierarchy first (foundation)
2. **Phase 2** - Fix permission toggles (depends on roles)
3. **Phase 3** - Fix onboarding (independent but important)
4. **Phase 4** - Add impersonation (enhancement)
5. **Phase 5** - Test everything
6. **Phase 6** - Generate report

**For each fix:**
1. Show the broken code
2. Explain what's wrong
3. Show the fixed code
4. Confirm the fix works

**Do not skip any checks. Do not assume anything works without verification.**
