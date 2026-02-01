# BrochureTracker QA Checklist

## Pre-Flight Checks (5 minutes)

### 1. Application Startup
- [ ] Application starts without errors
- [ ] Express server binds to port 5000
- [ ] No console errors on startup
- [ ] All plugins registered (field-validation, web-scraper, interchange-calculator, proposal-generator)
- [ ] Email Digest Cron starts

### 2. Authentication
- [ ] Landing page loads for unauthenticated users
- [ ] "Get Started Free" button works
- [ ] Login redirects to Replit Auth
- [ ] Successful login redirects to dashboard

## Core Navigation (10 minutes)

### Desktop (1280x720)
- [ ] Dashboard loads
- [ ] Bottom navigation visible and fixed
- [ ] All nav items clickable
- [ ] Active state shows on current page

### Mobile (390x844)
- [ ] Dashboard loads
- [ ] Bottom navigation visible and fixed
- [ ] Touch targets >= 48px
- [ ] No content overlap with bottom nav

## Page-by-Page Verification (15 minutes)

### Dashboard (/)
- [ ] Page loads without stuck loader
- [ ] Stats cards display
- [ ] Quick action buttons work

### History (/history)
- [ ] Page loads
- [ ] Drop list displays or empty state
- [ ] Search/filter works

### Merchants (/merchants)
- [ ] Page loads
- [ ] Merchant list displays or empty state
- [ ] Add merchant flow works

### Profile (/profile)
- [ ] Page loads
- [ ] User info displays
- [ ] Email digest settings visible
- [ ] Test email button works

### AI Coach (/coach)
- [ ] Page loads
- [ ] Chat interface visible
- [ ] Microphone button visible (if supported)
- [ ] Voice responses work

### Proposal Generator (/proposal-generator)
- [ ] Page loads
- [ ] Form fields display
- [ ] Dictation button visible on Rep Notes
- [ ] File upload works

### Statement Analyzer (/statement-analyzer)
- [ ] Page loads
- [ ] Upload interface visible
- [ ] Analysis results have ListenButton
- [ ] Copy buttons work

### EquipIQ (/equipiq)
- [ ] Page loads
- [ ] Product recommendations display
- [ ] AI chat responses have ListenButton

### Today (/today)
- [ ] Page loads
- [ ] Action items display or empty state
- [ ] Follow-up reminders visible

### Prospect Pipeline (/prospects/pipeline)
- [ ] Page loads
- [ ] Pipeline stages visible
- [ ] Drag and drop works (if populated)

### Prospect Finder (/prospects/search)
- [ ] Page loads
- [ ] Search form visible
- [ ] Search execution works

### Marketing Materials (/marketing)
- [ ] Page loads
- [ ] Template gallery visible
- [ ] 2-column grid on mobile
- [ ] 4-column grid on desktop
- [ ] Back button tooltip works
- [ ] Filter by industry works
- [ ] Search works

### E-Sign (/esign)
- [ ] Page loads
- [ ] Document list visible or empty state
- [ ] Create new request flow works

### Help (/help)
- [ ] Page loads
- [ ] Search box works
- [ ] Quick links visible
- [ ] Marketing Materials section has "New" badge
- [ ] All sections expandable

### Email Drafter (/email)
- [ ] Page loads
- [ ] Dictation button visible on draft field
- [ ] Polish email works
- [ ] ListenButton on polished output
- [ ] Copy button works

## Feature-Specific Tests (10 minutes)

### Dictation (Microphone)
Test on pages with major text inputs:
- [ ] Email Drafter: Draft email field
- [ ] Proposal Generator: Rep Notes field
- [ ] New Drop: Notes field
- [ ] Microphone icon visible
- [ ] Clicking starts recording (permission prompt)
- [ ] Transcribed text appears in field

### ElevenLabs TTS (ListenButton)
Test on pages with AI responses:
- [ ] Email Drafter: Polished email output
- [ ] Statement Analyzer: Sales scripts
- [ ] EquipIQ: AI recommendations
- [ ] Coach: AI responses
- [ ] Presentation Training: Script sections
- [ ] Click plays audio
- [ ] Loading state shows
- [ ] Can stop playback

### Tooltips
- [ ] Marketing Materials back button: "Back to dashboard"
- [ ] Marketing Materials delete button: "Delete flyer"
- [ ] Help page icons have tooltips

## Error Handling (5 minutes)
- [ ] 404 page displays for invalid routes
- [ ] Access Denied page shows for unauthorized features
- [ ] API errors show toast notifications
- [ ] Offline mode shows appropriate messaging

## How to Run

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```

### Run TypeScript Check
```bash
npm run check
```

### Required Environment Variables
See Secrets tab for:
- DATABASE_URL
- SESSION_SECRET
- AI_INTEGRATIONS_ANTHROPIC_API_KEY
- AI_INTEGRATIONS_GEMINI_API_KEY
- RESEND_API_KEY
- SIGNNOW_USERNAME (optional)
- GROK_API_KEY (optional)

## Troubleshooting

### App won't start
1. Check DATABASE_URL is set
2. Run `npm run db:push` to sync database
3. Check for TypeScript errors with `npm run check`

### Audio playback not working
1. Check ElevenLabs API key is configured
2. Check browser supports Web Audio API
3. Check console for TTS errors

### Dictation not working
1. Check browser supports SpeechRecognition
2. Grant microphone permissions
3. Check console for speech recognition errors

### Pages show blank
1. Check browser console for errors
2. Verify authentication
3. Check API endpoints are responding
