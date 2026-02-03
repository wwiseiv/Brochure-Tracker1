# Integration Guide: User Impersonation System

This guide walks you through integrating the user impersonation system into your existing Replit application.

---

## Prerequisites

- Node.js application with Express backend
- PostgreSQL database
- React frontend
- Existing user authentication system

---

## Step 1: Database Setup

### 1.1 Run the Schema Migration

Execute the SQL schema in your PostgreSQL database:

```bash
# Using psql
psql $DATABASE_URL -f database/schema.sql

# Or in your Replit shell
node -e "require('pg').Pool({connectionString: process.env.DATABASE_URL}).query(require('fs').readFileSync('./database/schema.sql', 'utf8'))"
```

### 1.2 Set William as Super Admin

The schema automatically sets `wwiseiv@icloud.com` as Super Admin. Verify:

```sql
SELECT id, email, role FROM users WHERE email = 'wwiseiv@icloud.com';
```

If the user doesn't exist yet, they'll be promoted to Super Admin upon account creation.

---

## Step 2: Backend Integration

### 2.1 Install Dependencies

```bash
npm install jsonwebtoken pg bcrypt
```

### 2.2 Add Environment Variables

In your Replit Secrets (or `.env`):

```env
JWT_SECRET=your-secure-jwt-secret-key
IMPERSONATION_SECRET=your-secure-impersonation-secret-key
DATABASE_URL=your-postgresql-connection-string
```

### 2.3 Register the Middleware

In your main server file (e.g., `server.js` or `index.js`):

```javascript
const express = require('express');
const { impersonationMiddleware } = require('./backend/middleware/impersonation');
const impersonationRoutes = require('./backend/routes/impersonation');

const app = express();

// Add JSON parsing
app.use(express.json());

// Add impersonation middleware AFTER your auth middleware
// This allows it to read the authenticated user and check for impersonation
app.use(impersonationMiddleware);

// Register impersonation routes
app.use('/api/impersonation', impersonationRoutes);
```

### 2.4 Update Your Auth Middleware

Modify your existing authentication middleware to work with impersonation:

```javascript
// Example: auth.js middleware
const jwt = require('jsonwebtoken');
const User = require('./models/User');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Set user on request
    // Note: impersonation middleware may override this
    req.user = user;
    
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
```

### 2.5 Protect Sensitive Routes

Use the provided middleware to protect routes:

```javascript
const { 
  requireRole, 
  blockDuringImpersonation 
} = require('./backend/middleware/impersonation');

// Only super admins can access
app.get('/api/admin/settings', requireRole('super_admin'), (req, res) => {
  // ...
});

// Block password changes during impersonation
app.post('/api/user/change-password', blockDuringImpersonation, (req, res) => {
  // ...
});

// Multiple roles allowed
app.get('/api/reports', requireRole('super_admin', 'admin', 'manager'), (req, res) => {
  // ...
});
```

---

## Step 3: Frontend Integration

### 3.1 Install Dependencies (if needed)

The frontend uses vanilla React with no additional dependencies.

### 3.2 Add the Provider

Wrap your app with the `ImpersonationProvider`:

```jsx
// App.jsx or index.jsx
import React from 'react';
import { ImpersonationProvider } from './hooks/useImpersonation';
import { ImpersonationBanner } from './components/ImpersonationBanner';

function App() {
  return (
    <ImpersonationProvider>
      {/* Banner shows when impersonating */}
      <ImpersonationBanner />
      
      {/* Your existing app content */}
      <Router>
        <Routes>
          {/* ... your routes */}
        </Routes>
      </Router>
    </ImpersonationProvider>
  );
}
```

### 3.3 Add the Admin Panel

Create an admin route for user management:

```jsx
// pages/AdminUsers.jsx
import React from 'react';
import { UserManagementPanel } from '../components/UserManagementPanel';
import { useAuth } from '../hooks/useAuth'; // Your existing auth hook

function AdminUsers() {
  const { user } = useAuth();
  
  // Only render for admins/managers
  if (!['super_admin', 'admin', 'manager'].includes(user?.role)) {
    return <div>Access denied</div>;
  }
  
  return <UserManagementPanel currentUser={user} />;
}
```

### 3.4 Add Impersonate Buttons Throughout Your App

Use the `ImpersonateButton` component anywhere you display user info:

```jsx
import { ImpersonateButton } from '../components/ImpersonateButton';

function UserRow({ user }) {
  return (
    <tr>
      <td>{user.email}</td>
      <td>{user.role}</td>
      <td>
        <ImpersonateButton 
          targetUser={user}
          size="small"
          variant="ghost"
        />
      </td>
    </tr>
  );
}
```

### 3.5 Update Your API Calls

Use the hook's `fetchWithImpersonation` for all API calls:

```jsx
import { useImpersonation } from '../hooks/useImpersonation';

function Dashboard() {
  const { fetchWithImpersonation, isImpersonating } = useImpersonation();
  const [data, setData] = useState(null);
  
  useEffect(() => {
    async function loadData() {
      // This automatically includes the impersonation token
      const response = await fetchWithImpersonation('/api/dashboard');
      const result = await response.json();
      setData(result);
    }
    loadData();
  }, [fetchWithImpersonation]);
  
  return (
    <div>
      {isImpersonating && (
        <div className="impersonation-notice">
          Viewing dashboard as impersonated user
        </div>
      )}
      {/* Dashboard content */}
    </div>
  );
}
```

---

## Step 4: Set Up Role Hierarchy

### 4.1 Assign Managers to Agents

In the admin panel or via API:

```javascript
// API call to assign agent to manager
await fetch('/api/impersonation/assign-agent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    managerId: 'manager-uuid',
    agentId: 'agent-uuid'
  })
});
```

### 4.2 Update User Roles

Super Admins can change roles via API:

```javascript
await fetch('/api/impersonation/update-role', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    newRole: 'manager' // or 'admin', 'agent'
  })
});
```

---

## Step 5: Audit & Monitoring

### 5.1 View Audit Logs

Super Admins and Admins can view all impersonation activity:

```javascript
const response = await fetch('/api/impersonation/audit-log?limit=100');
const { logs } = await response.json();

// logs contains:
// - Who impersonated whom
// - When it started/ended
// - Actions performed during impersonation
```

### 5.2 View Active Sessions

See who is currently impersonating:

```javascript
const response = await fetch('/api/impersonation/active-sessions');
const { sessions } = await response.json();
```

---

## Role Permissions Reference

| Action | Super Admin | Admin | Manager | Agent |
|--------|-------------|-------|---------|-------|
| Impersonate Admins | ❌ | ❌ | ❌ | ❌ |
| Impersonate Managers | ✅ | ✅ | ❌ | ❌ |
| Impersonate Agents | ✅ | ✅ | ✅* | ❌ |
| View All Users | ✅ | ✅ | ❌ | ❌ |
| View Assigned Agents | ✅ | ✅ | ✅ | ❌ |
| Change User Roles | ✅ | ❌ | ❌ | ❌ |
| View Audit Logs | ✅ | ✅ | ❌ | ❌ |
| Assign Agents | ✅ | ✅ | ❌ | ❌ |

*Managers can only impersonate agents assigned to them

---

## Security Considerations

1. **Token Expiry**: Impersonation tokens expire after 4 hours
2. **Audit Trail**: All impersonation sessions and actions are logged
3. **No Privilege Escalation**: Users cannot impersonate anyone with equal or higher privileges
4. **Blocked Actions**: Password changes and other sensitive actions are blocked during impersonation
5. **Clear Indicator**: Impersonation banner is always visible and cannot be hidden
6. **Easy Exit**: Users can exit impersonation at any time

---

## Troubleshooting

### "Permission denied" when impersonating

- Check the user's role matches the hierarchy rules
- Ensure the target user is active
- For managers: verify the agent is assigned to them

### Banner not showing

- Ensure `ImpersonationProvider` wraps your entire app
- Check that `ImpersonationBanner` is rendered at the top level
- Verify localStorage has the impersonation tokens

### API calls not working as impersonated user

- Use `fetchWithImpersonation` instead of regular `fetch`
- Or manually add the header: `'X-Impersonation-Token': token`

### Database errors

- Ensure all migrations have been run
- Check that the `can_impersonate` function exists
- Verify foreign key relationships are intact

---

## Quick Test Checklist

- [ ] Super Admin (wwiseiv@icloud.com) can see all users
- [ ] Super Admin can impersonate managers and agents
- [ ] Admins can impersonate managers and agents
- [ ] Managers can only see their assigned agents
- [ ] Managers can only impersonate their assigned agents
- [ ] Agents cannot access the impersonation panel
- [ ] Red banner appears when impersonating
- [ ] Exit impersonation works correctly
- [ ] Audit log captures all impersonation events
