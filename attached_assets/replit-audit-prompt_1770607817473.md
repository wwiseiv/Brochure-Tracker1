Scan the entire PCB Auto codebase — frontend, backend, database, and all integrations — and identify every error, bug, broken feature, missing dependency, and problem. Fix everything you find.

## WHAT TO CHECK

### Frontend (React/TypeScript)
- TypeScript compilation errors and type mismatches
- Broken imports and missing modules
- Components that reference routes or API endpoints that don't exist
- Broken or dead links in navigation
- UI elements that render incorrectly or throw console errors
- State management issues (stale data, race conditions, missing error handling)
- Forms that don't validate or submit properly
- Responsive/mobile layout issues
- Missing loading states and error states on API calls
- Any hardcoded URLs, API keys, or credentials that shouldn't be there

### Backend (Node.js/Express)
- Routes that are defined but broken or return errors
- API endpoints with missing or incorrect request validation
- Database queries that could fail silently or throw unhandled errors
- Missing error handling on async operations (try/catch, .catch())
- Authentication/authorization gaps — routes that should be protected but aren't
- CORS, middleware, or header configuration issues
- Environment variables that are referenced but not set or not in .env
- Memory leaks or unclosed connections

### Database (PostgreSQL/Drizzle ORM)
- Schema mismatches between Drizzle schema definitions and actual database tables
- Missing migrations or migrations that haven't been applied
- Foreign key relationships that are broken or missing
- Indexes that should exist for performance but don't
- Queries that could cause N+1 problems
- Nullable fields that should be required or vice versa

### Integrations
- Twilio (SMS): Verify the integration works, messages send, webhook handlers exist
- Resend (Email): Verify email sending works, templates render
- PartsTech: Verify parts ordering API calls are correct
- QuickBooks Online: Verify sync works and handles errors
- Claude AI: Verify API calls have proper error handling and fallbacks
- Stripe/Payments: Verify payment processing is secure and handles failures
- Any other third-party integrations in the codebase

### Security
- SQL injection vulnerabilities
- XSS vulnerabilities in rendered content
- Missing input sanitization on user-submitted data
- API endpoints that expose sensitive data without auth checks
- Secrets or API keys committed in code instead of environment variables
- CSRF protection gaps

### General Code Quality
- Dead code that's never called
- Duplicate logic that should be abstracted
- Console.log statements that should be removed from production
- TODO/FIXME comments that indicate unfinished work
- Package.json dependencies that are outdated or have known vulnerabilities
- Build configuration issues

## HOW TO PROCEED

1. Start by reading the project structure and understanding the architecture
2. Check for TypeScript/build errors first — run the build and fix compilation failures
3. Walk through every route on the backend and verify each one works
4. Walk through every page/component on the frontend and verify rendering
5. Check every database query and schema definition
6. Test every integration point
7. Fix each issue as you find it
8. After fixing, verify the fix doesn't break anything else
9. Give me a summary of everything you found and fixed when done

Do NOT skip anything. Do NOT just report issues — fix them. If something can't be fixed without my input (like missing API keys or business logic decisions), flag it clearly and move on to the next issue.
