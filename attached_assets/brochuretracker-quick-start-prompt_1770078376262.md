# QUICK-START: BrochureTracker System Fix Prompt

Copy and paste this directly into Replit AI:

---

```
You are auditing and fixing the BrochureTracker application. Complete these tasks in order:

## TASK 1: ROLE HIERARCHY AUDIT

Verify the role system works correctly:
- SUPER_ADMIN: wwiseiv@icloud.com (full access, can impersonate anyone)
- ADMIN: Can manage managers/agents, impersonate them
- MANAGER: Can only manage/impersonate their assigned agents
- AGENT: Basic user, controlled by permission toggles

CHECK:
1. Find where roles are defined in the codebase
2. Verify wwiseiv@icloud.com is set as super_admin in the database
3. Ensure all users have a valid role (default new users to 'agent')
4. Verify role-based access control protects admin pages

FIX any issues found. Show me before/after code.

## TASK 2: PERMISSION TOGGLES AUDIT

The User Permissions modal has these toggles:
- View Leaderboard
- AI Coach
- EquipIQ
- Daily Edge
- Export Data
- Record Meetings
- Manage Referrals
- Follow-up Sequences
- Proposal Generator

CHECK:
1. Find the permissions schema (database column or separate table)
2. Find the API endpoints for getting/updating permissions
3. Find the frontend toggle component
4. Verify each toggle actually enables/disables the feature

FIX:
- If toggles don't persist, fix the database update
- If toggles don't affect features, add permission checks to each feature
- Ensure admins can always access all features regardless of toggles

## TASK 3: FIX BROKEN AGENT ONBOARDING

New agents used to see an onboarding modal/form to enter their info (name, phone, logo, etc.) when they first signed up. This stopped working.

FIND:
1. Search for onboarding, welcome modal, first login, profile setup components
2. Find the condition that triggers the onboarding flow
3. Find the API endpoint that marks onboarding complete

DIAGNOSE:
- Is the component not rendering?
- Is the trigger condition broken?
- Is the API endpoint failing?
- Is the database field not being set correctly?

FIX the root cause. If code is too damaged, rebuild the onboarding flow:
- Modal appears on first login for new agents
- Collects: first name, last name, phone, company, territory, profile photo, company logo
- Saves to database
- Sets onboarding_complete = true
- Never shows again after completion

## TASK 4: IMPERSONATION INTEGRATION

Add "View As" functionality to Team Management:
1. Add impersonate button (eye icon) to each user row in the table
2. Only show button if current user can impersonate target user
3. When clicked, start impersonation session
4. Show red banner at top indicating impersonation is active
5. Log all impersonation actions for audit

Use the impersonation system files I provided earlier.

## TASK 5: FULL TEST

After all fixes, test:
- [ ] wwiseiv@icloud.com has super_admin access
- [ ] All permission toggles work and persist
- [ ] New agent signup triggers onboarding modal
- [ ] Onboarding saves data correctly
- [ ] Admin can impersonate agents
- [ ] Manager can only impersonate their assigned agents

Report what you found, what you fixed, and what still needs attention.
```

---

## FOLLOW-UP PROMPTS

After the main audit, use these as needed:

### If roles aren't working:
```
Focus on TASK 1 only. Show me:
1. The current role schema in the database
2. Where role checks happen in the code
3. Any users without valid roles
Fix them and confirm wwiseiv@icloud.com is super_admin.
```

### If toggles aren't persisting:
```
Focus on the permission toggles. Trace the full flow:
1. User clicks toggle in UI
2. Frontend sends API request (show me the code)
3. Backend receives request (show me the route)
4. Database is updated (show me the query)
5. Response sent back
Find where it's breaking and fix it.
```

### If onboarding won't show:
```
The agent onboarding modal isn't appearing for new users. Find:
1. The onboarding component file
2. Where it's supposed to render in App.jsx or layout
3. The condition that shows/hides it
4. The database field that tracks completion

Show me the code and tell me why it's not triggering.
```

### If onboarding needs rebuilding:
```
Rebuild the agent onboarding from scratch:
1. Create AgentOnboardingModal.jsx component
2. Add fields: first name, last name, phone, company, territory, photo upload, logo upload
3. Create POST /api/users/complete-onboarding endpoint
4. Add onboarding_complete column to users table if missing
5. Show modal in App.jsx when user.role === 'agent' && !user.onboardingComplete
6. After submit, set onboarding_complete = true
```

### To verify everything works:
```
Run a complete test of the user management system:
1. Create a test agent account
2. Verify onboarding modal appears
3. Complete onboarding
4. Log in as admin, find the test agent
5. Toggle permissions on/off, verify they take effect
6. Impersonate the test agent
7. Verify you see their data
8. Exit impersonation
9. Clean up test account
Report results.
```
