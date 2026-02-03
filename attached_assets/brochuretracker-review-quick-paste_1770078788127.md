# QUICK PASTE: System-Wide Review & Fix Prompt

Copy this directly into Replit AI:

---

```
# COMPREHENSIVE SYSTEM REVIEW - DO NOT REMOVE ANY FEATURES

You are performing a complete code review of this application. Your job is to FIX and RESTORE, never DELETE.

⚠️ CRITICAL RULES:
- DO NOT remove any features, even if they seem broken
- DO NOT simplify by deleting code
- DO NOT "clean up" code you don't understand
- DO fix broken features by repairing them
- DO restore accidentally removed/disabled features
- DO update outdated content

## TASK 1: INVENTORY ALL FEATURES

First, map every feature in the app:

1. List all frontend components and what they do
2. List all API routes and what they do  
3. List all database tables
4. Document every feature: Dashboard, Leaderboard, AI Coach, EquipIQ, Daily Edge, Export Data, Meeting Recording, Referrals, Follow-up Sequences, Proposal Generator, User Management, Permissions, etc.

## TASK 2: TEST EVERY FEATURE

For each feature found:
1. Navigate to it
2. Test basic functionality
3. Test edge cases
4. Note if it's: ✅ Working / ⚠️ Partially broken / ❌ Completely broken

## TASK 3: RESTORE BROKEN FEATURES

For anything broken:
1. Find the root cause (don't just delete it!)
2. Show me the broken code
3. Fix it while preserving ALL original functionality
4. Test that it works

Look specifically for:
- Commented out code that should be active
- Features that stopped working (like the agent onboarding logo box)
- API endpoints that return errors
- Components that don't render
- Conditions that always fail (if false && ...)
- Missing environment variables
- Broken imports

## TASK 4: UPDATE ALL TOOLTIPS

Find every tooltip in the app and:
1. Make sure it exists (add if missing)
2. Make sure text is helpful and specific (not just "Click here")
3. Use this format: "[Action] - [Benefit/Context]"

Example updates:
- "Edit" → "Edit user profile, permissions, and team assignments"
- "Delete" → "Permanently remove this item (cannot be undone)"  
- "Export" → "Download this data as CSV or Excel file"

## TASK 5: UPDATE HELP MENU

Review all help content:
1. Check every help article is accurate for current app
2. Update outdated instructions
3. Update or flag outdated screenshots
4. Add missing help topics
5. Make sure all links work

Structure should include:
- Getting Started guides
- Feature-specific guides (one for each major feature)
- FAQs
- Troubleshooting
- Contact Support

## TASK 6: UPDATE AI ASSISTANT

Find the AI assistant/chatbot and update:
1. Its knowledge about all app features
2. Common questions and answers
3. Troubleshooting guidance
4. How-to instructions
5. Proactive help triggers (when to pop up and offer help)

Make sure AI knows about:
- All features and how to use them
- User roles (Super Admin, Admin, Manager, Agent)
- Permission system
- Common errors and fixes
- Keyboard shortcuts

## TASK 7: FIX CODE ERRORS

Find and fix errors WITHOUT removing features:
1. Run lint/build and fix errors
2. Check browser console for errors
3. Fix each error minimally (smallest change possible)
4. Verify fix doesn't break anything else

❌ WRONG WAY: "This feature was buggy so I removed it"
✅ RIGHT WAY: "This feature had a null check missing, I added it"

## TASK 8: GENERATE REPORT

After completing everything, give me:
1. List of all features and their status
2. What was broken and how you fixed it
3. What tooltips you updated
4. What help content you updated
5. What AI assistant changes you made
6. Any errors you fixed
7. Any remaining issues

## START NOW

Begin with Task 1 - inventory all features. Show me what you find.
```

---

# FOLLOW-UP PROMPTS

Use these for specific issues:

## If a feature is broken:
```
The [feature name] is broken. 
DO NOT remove it.
1. Show me the code for this feature
2. Identify why it's not working
3. Fix it while keeping ALL functionality
4. Test it works
```

## If you need to restore deleted code:
```
Check git history for any code deleted in the last 30-60 days.
Look for:
- Deleted files
- Large code removals
- Reverted commits
- Commented out functions

Restore any deleted features by:
1. Finding the original code
2. Understanding what it did
3. Adding it back
4. Making it work with current code
```

## For tooltip review only:
```
Focus on tooltips only:
1. Search for all title=, tooltip, data-tip, aria-label attributes
2. List each one with current text
3. For each one:
   - Is text helpful and specific? 
   - Does it explain the action AND benefit?
   - Is it under 150 characters?
4. Update any that need improvement
5. Add tooltips to buttons/icons missing them
```

## For help menu only:
```
Focus on help system only:
1. Find all help/FAQ/documentation content
2. For each article:
   - Is information accurate?
   - Are steps correct for current UI?
   - Do screenshots match current design?
   - Do all links work?
3. Update anything outdated
4. Add help for features missing documentation
```

## For AI assistant only:
```
Focus on AI assistant only:
1. Find the AI assistant component and its configuration
2. Review what it knows about the app
3. Update its knowledge base with:
   - Current feature list and how each works
   - User roles and permissions
   - Common issues and solutions
   - Step-by-step guides for key tasks
4. Add proactive triggers for helping stuck users
5. Test that it answers questions correctly
```

## If something was "accidentally fixed" by removing it:
```
I suspect [feature] was removed instead of fixed.

1. Search codebase for any references to [feature]
2. Check git history for this feature
3. Find when it was removed/disabled
4. Restore the original code
5. Actually fix the bug that was causing problems
6. Verify it works correctly now
```

## Final verification:
```
Do a final check:
1. Click through every page of the app
2. Try every button and form
3. Verify all navigation works
4. Check console for errors
5. Test as different user roles
6. Confirm NOTHING was removed that existed before
7. List any remaining issues
```
