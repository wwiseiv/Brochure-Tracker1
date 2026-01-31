# Replit Prompt: Code Audit & Publish

## Task

Review all recent code changes, fix any issues found, and publish the updated application.

---

## Step 1: Code Audit

Scan the entire codebase for:

### Syntax & Type Errors
- Check all TypeScript files for type errors
- Verify all imports are valid and files exist
- Look for missing dependencies in package.json
- Check for unused imports or variables

### React Component Issues
- Verify all components have proper exports
- Check for missing key props in lists
- Ensure hooks are used correctly (not in conditionals)
- Verify all routes are properly configured

### API & Backend Issues
- Check all API routes are registered
- Verify database queries are correct
- Ensure error handling exists on all endpoints
- Check authentication middleware is applied where needed

### Build Verification
Run these commands and fix any errors:

```bash
# Type check
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build
```

---

## Step 2: Fix Any Issues Found

For each issue discovered:
1. Identify the root cause
2. Implement the fix
3. Verify the fix doesn't break other functionality
4. Document what was changed

Common fixes to look for:
- Missing imports → Add the import
- Type mismatches → Fix the type or add proper typing
- Missing routes → Register the route in the router
- Missing env variables → Add to .env or Replit Secrets
- Database schema mismatches → Update schema or queries

---

## Step 3: Test Critical Paths

Before publishing, verify these work:

### Authentication
- [ ] Login works
- [ ] Protected routes redirect to login
- [ ] User session persists

### Home Page
- [ ] All sections render
- [ ] All cards are clickable
- [ ] Navigation works

### New Prospecting Features (if implemented)
- [ ] Prospect Finder page loads
- [ ] Search form submits
- [ ] Pipeline page loads
- [ ] Cards link correctly

### Existing Features
- [ ] Scan & Drop works
- [ ] Statement analysis works
- [ ] Other core features functional

---

## Step 4: Publish

Once all checks pass:

1. **Commit changes** with a clear message:
```
feat: Add AI-Powered Prospecting section to home screen

- Added Prospect Finder card with AI-Powered badge
- Added My Pipeline card with active count badge
- New section positioned after Business Tools
- Routes configured for /prospects/search and /prospects/pipeline
```

2. **Deploy to production**:
```bash
# If using Replit Deployments
# Click "Deploy" button or run:
npm run build && npm run start
```

3. **Verify production**:
- Visit https://brochuretracker.com
- Confirm new section appears
- Test navigation to new pages
- Check mobile responsiveness

---

## Quick Commands Reference

```bash
# Full audit sequence
npm install                 # Ensure dependencies
npx tsc --noEmit           # Type check
npm run lint               # Lint check  
npm run build              # Build check
npm run dev                # Start dev server for testing

# If database changes were made
npm run db:push            # Push schema changes (if using Drizzle)
# or
npx prisma db push         # Push schema changes (if using Prisma)

# Deploy
npm run build && npm run start
```

---

## Expected Outcome

After running this prompt:
1. ✅ All code errors identified and fixed
2. ✅ Application builds without errors
3. ✅ All features tested and working
4. ✅ Changes deployed to production
5. ✅ https://brochuretracker.com shows updated home screen

---

## If Issues Are Found

Report back with:
- File name and line number
- Error message
- Proposed fix
- Whether fix was applied

Then continue with remaining checks and publish once all issues are resolved.
