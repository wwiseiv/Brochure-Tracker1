# BrochureTracker Runbook

## Overview
This runbook provides operational guidance for the BrochureTracker platform.

## Quick Start

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type check
npm run check

# Push database schema
npm run db:push
```

### Production Deployment
1. Ensure all environment variables are set (see below)
2. Run `npm run build` to compile
3. Use Replit's Deploy (Publish) feature

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| SESSION_SECRET | Express session secret |
| AI_INTEGRATIONS_ANTHROPIC_API_KEY | Claude API key |
| AI_INTEGRATIONS_GEMINI_API_KEY | Gemini API key |

### Optional
| Variable | Description |
|----------|-------------|
| RESEND_API_KEY | Email sending via Resend |
| SIGNNOW_USERNAME | SignNow e-signature |
| GROK_API_KEY | xAI Grok for prospect finder |
| ELEVENLABS_API_KEY | TTS voice playback |
| VAPID_PUBLIC_KEY | Push notifications |
| VAPID_PRIVATE_KEY | Push notifications |

## Key Routes

### Public Routes
- `/` - Landing page
- `/help` - Help documentation

### Authenticated Routes
- `/prospects/pipeline` - Deal Pipeline (CRM)
- `/prospects/search` - AI Prospect Finder
- `/marketing` - Marketing Materials
- `/coach` - AI Sales Coach
- `/statement-analyzer` - Statement Analysis
- `/proposal-generator` - Proposal Generation
- `/email` - Email Drafter

## Monitoring

### Health Checks
- Application: Access the landing page at `http://localhost:5000/`
- Authentication: Verify `/api/user` returns user data when logged in
- Database: Verify `/api/drops` or `/api/merchants` returns data

### Logs
- Server logs available in Replit console
- Browser console for client-side errors

## Common Operations

### Database
```bash
# Push schema changes
npm run db:push

# Generate migrations (if needed)
npm run db:generate
```

### Troubleshooting

#### App won't start
1. Verify DATABASE_URL is set
2. Check for TypeScript errors: `npm run check`
3. Check for missing dependencies: `npm install`

#### AI features not working
1. Verify AI API keys are set
2. Check Replit AI Integrations status
3. Review server logs for API errors

#### Push notifications not working
1. Verify VAPID keys are set
2. Check browser supports Push API
3. Ensure HTTPS is used in production

## Performance Notes

### Bundle Sizes
- Client bundle: ~2.26 MB (compressed: 613 KB)
- Server bundle: ~3.2 MB

### Optimization Recommendations
1. Consider code-splitting for large pages
2. Lazy-load AI components
3. Implement skeleton loaders

## Security Checklist
- [ ] All API keys stored as secrets
- [ ] HTTPS enforced in production
- [ ] Session secrets rotated regularly
- [ ] CORS configured appropriately
- [ ] Rate limiting enabled on AI endpoints

## Contact
For issues, use Replit support or check repository issues.
