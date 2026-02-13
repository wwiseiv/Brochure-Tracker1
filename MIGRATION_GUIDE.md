# PCBancard Sales Intelligence Suite - Migration Guide

## What This Is
This guide helps you recreate this project as a Web App (instead of Automation) so you can use custom domain management for PCBISV.com.

## Step 1: Create New Replit Project
1. Go to replit.com and click "Create Repl"
2. Choose **"Web App"** as the project type (NOT automation)
3. Select **Node.js** as the language
4. Name it something like "PCBancard-WebApp"

## Step 2: Give Agent This Prompt
Once the new project is created, paste this prompt to the Agent:

---

I need to migrate my PCBancard Sales Intelligence Suite from another Replit project. This is a full-stack web app with:

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS 3 + shadcn/ui components
- Backend: Express.js + TypeScript
- Database: PostgreSQL with Drizzle ORM
- Auth: Replit Auth (OpenID Connect)
- AI: xAI Grok, Anthropic Claude, Google Gemini, OpenAI, ElevenLabs TTS
- File storage: Google Cloud Storage with presigned URLs
- Email: Resend
- E-Signatures: SignNow

**The app has 14 major feature areas:**
1. Brochure/Drop Management (tracking physical marketing assets in the field)
2. 14-Stage CRM Deal Pipeline (Prospect through Active Merchant)
3. AI Sales Coach with Role-Play (36 merchant personas)
4. Trust-Based Scoring System (hidden trust scores, mood indicators, deception toolkit)
5. Interactive AI Training Center (roleplay, objection gauntlet, scenario trainer, delivery analyzer)
6. Proposal Generator (PDF/Word output, AI data parsing)
7. Statement Analyzer (AI vision for processing statements)
8. Gamification System (XP, badges, skill scores, streaks, leaderboards, certificates)
9. EquipIQ (AI equipment recommendations, 63+ products)
10. E-Signature Document Library (SignNow integration)
11. Presentation Training (8 modules, 25 lessons)
12. Marketing Materials Generator (26+ templates, AI generation)
13. AI Prospecting & Business Card Scanner
14. Email Digest System

**User Roles:** Master Admin, Relationship Manager, Agent (3-tier RBAC)

I will be copying files from my existing project. Please set up:
1. A PostgreSQL database
2. The base project structure (React + Express + Vite + Tailwind + shadcn)
3. Replit Auth integration
4. All the necessary npm packages

Here is the package.json dependencies I need installed:
(Then paste the dependencies from package.json below)

---

## Step 3: Copy Files Over
After the new project is scaffolded, you'll need to copy these key directories/files:

### Critical Files (copy in this order):
1. `shared/schema.ts` - Database schema (3,598 lines)
2. `server/storage.ts` - Storage interface (3,101 lines)
3. `server/routes.ts` - All API routes (16,659 lines)
4. `server/index.ts` - Server entry point
5. `server/auth.ts` - Authentication setup
6. `server/vite.ts` - Vite dev server config
7. `client/src/App.tsx` - Main app component (286 lines)
8. `client/src/pages/` - All page components (38+ files)
9. `client/src/components/` - All shared components
10. `client/src/hooks/` - Custom hooks
11. `client/src/lib/` - Utility libraries

### Server Services (copy entire directory):
- `server/services/` - AI services, chatbot, digest scheduler
- `server/trust-engine.ts` - Trust scoring system
- `server/esign/` - E-signature integration
- `server/business-research.ts` - Business research service
- `server/proposal-intelligence/` - Proposal system

### Config Files:
- `drizzle.config.ts`
- `vite.config.ts`
- `tailwind.config.ts`
- `tsconfig.json`
- `postcss.config.js`
- `client/src/index.css` - Theme/styling

### Public Assets:
- `public/` - PWA manifest, service worker, icons
- `client/public/` - Static assets

## Step 4: Environment Variables / Secrets
You'll need to re-add these secrets in the new project:
- ELEVENLABS_API_KEY
- GROK_API_KEY
- SIGNNOW_USERNAME
- (Plus any others configured via Replit integrations)

## Step 5: Database Migration
After copying schema.ts, run: `npm run db:push`
This creates all the tables in the new database.

To migrate DATA from the old database, you'll need to export/import via SQL dumps.

## Step 6: Publish & Add Domain
1. Click Publish in the new project
2. It should now show as a Web App deployment
3. Go to the domain settings and link PCBISV.com
4. Add the DNS records at your domain registrar

## Dependencies List (for reference)
```json
{
  "@anthropic-ai/sdk": "^0.72.1",
  "@google-cloud/storage": "^7.18.0",
  "@google/genai": "^1.39.0",
  "@google/generative-ai": "^0.24.1",
  "@hookform/resolvers": "^3.10.0",
  "@radix-ui/react-accordion": "^1.2.4",
  "@radix-ui/react-alert-dialog": "^1.1.7",
  "@radix-ui/react-aspect-ratio": "^1.1.3",
  "@radix-ui/react-avatar": "^1.1.4",
  "@radix-ui/react-checkbox": "^1.1.5",
  "@radix-ui/react-collapsible": "^1.1.4",
  "@radix-ui/react-context-menu": "^2.2.7",
  "@radix-ui/react-dialog": "^1.1.7",
  "@radix-ui/react-dropdown-menu": "^2.1.7",
  "@radix-ui/react-hover-card": "^1.1.7",
  "@radix-ui/react-label": "^2.1.3",
  "@radix-ui/react-menubar": "^1.1.7",
  "@radix-ui/react-navigation-menu": "^1.2.6",
  "@radix-ui/react-popover": "^1.1.7",
  "@radix-ui/react-progress": "^1.1.3",
  "@radix-ui/react-radio-group": "^1.2.4",
  "@radix-ui/react-scroll-area": "^1.2.4",
  "@radix-ui/react-select": "^2.1.7",
  "@radix-ui/react-separator": "^1.1.3",
  "@radix-ui/react-slider": "^1.2.4",
  "@radix-ui/react-slot": "^1.2.0",
  "@radix-ui/react-switch": "^1.1.4",
  "@radix-ui/react-tabs": "^1.1.4",
  "@radix-ui/react-toast": "^1.2.7",
  "@radix-ui/react-toggle": "^1.1.3",
  "@radix-ui/react-toggle-group": "^1.1.3",
  "@radix-ui/react-tooltip": "^1.2.0",
  "@resvg/resvg-js": "^2.6.2",
  "@tanstack/react-query": "^5.60.5",
  "@uppy/aws-s3": "^5.1.0",
  "@uppy/core": "^5.2.0",
  "@uppy/dashboard": "^5.1.0",
  "@uppy/react": "^5.1.1",
  "bcryptjs": "^3.0.3",
  "cheerio": "^1.2.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "cmdk": "^1.1.1",
  "connect-pg-simple": "^10.0.0",
  "date-fns": "^3.6.0",
  "date-fns-tz": "^3.2.0",
  "docx": "^9.5.1",
  "drizzle-orm": "^0.39.3",
  "drizzle-zod": "^0.7.1",
  "elevenlabs": "^1.56.1",
  "embla-carousel-react": "^8.6.0",
  "exceljs": "^4.4.0",
  "express": "^4.21.2",
  "express-session": "^1.18.2",
  "framer-motion": "^11.13.1",
  "google-auth-library": "^10.5.0",
  "googleapis": "^148.0.0",
  "handlebars": "^4.7.8",
  "html-pdf-node": "^1.0.8",
  "html5-qrcode": "^2.3.8",
  "input-otp": "^1.4.2",
  "jsonwebtoken": "^9.0.3",
  "jspdf": "^4.1.0",
  "jspdf-autotable": "^5.0.7",
  "lucide-react": "^0.453.0",
  "mammoth": "^1.11.0",
  "memoizee": "^0.4.17",
  "memorystore": "^1.6.7",
  "multer": "^2.0.2",
  "next-themes": "^0.4.6",
  "openai": "^6.16.0",
  "openid-client": "^6.8.1",
  "p-limit": "^7.2.0",
  "p-retry": "^7.1.1",
  "passport": "^0.7.0",
  "passport-local": "^1.0.0",
  "pdf-lib": "^1.17.1",
  "pdf-parse": "^2.4.5",
  "pdfkit": "^0.17.2",
  "pg": "^8.16.3",
  "react": "^18.3.1",
  "react-day-picker": "^8.10.1",
  "react-dom": "^18.3.1",
  "react-hook-form": "^7.55.0",
  "react-icons": "^5.4.0",
  "react-markdown": "^10.1.0",
  "react-resizable-panels": "^2.1.7",
  "react-swipeable": "^7.0.2",
  "recharts": "^2.15.2",
  "resend": "^4.0.0",
  "sharp": "^0.34.5",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7",
  "tw-animate-css": "^1.2.5",
  "uuid": "^13.0.0",
  "vaul": "^1.1.2",
  "web-push": "^3.6.7",
  "wouter": "^3.3.5",
  "ws": "^8.18.0",
  "xlsx": "^0.18.5",
  "zod": "^3.25.76",
  "zod-validation-error": "^3.5.4"
}
```

## File Count Summary
- Total files: ~10,512
- Total code lines (key files): ~23,800+
- Pages: 38 routes
- API endpoints: 302
- Database tables: 50+
