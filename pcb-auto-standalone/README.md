# PCB Auto - Standalone Shop Management App

Complete auto repair shop management system with 133+ features including repair orders, estimates, DVIs, scheduling, payments, technician time tracking, customer communication, and automated follow-up campaigns.

## Quick Setup on Replit

1. **Create a new Replit project** using the **Node.js** template
2. **Upload all files** from this folder into the new project (drag and drop, or use the file upload)
3. **Provision a PostgreSQL database** using Replit's built-in database tool
4. **Set up Object Storage** using Replit's Object Storage tool (needed for shop logo uploads)
5. **Install dependencies**: Run `npm install` in the shell
6. **Push the database schema**: Run `npm run db:push` in the shell
7. **Start the app**: Run `npm run dev` or click the Run button

## Environment Variables / Secrets

The following secrets should be configured in Replit's Secrets tab:

| Secret | Purpose | Required? |
|--------|---------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Replit DB |
| `JWT_SECRET` | Token signing for authentication | Yes - set any random string |
| `ELEVENLABS_API_KEY` | AI assistant voice (text-to-speech) | Optional |
| `ANTHROPIC_API_KEY` | AI chat assistant (Claude) | Optional |
| `RESEND_API_KEY` | Email sending (invoices, estimates, follow-ups) | Optional |
| `DOUGH_SANDBOX_API_KEY` | Payment processing (Dough Gateway) | Optional |
| `DOUGH_SANDBOX_PUBLIC_KEY` | Payment processing public key | Optional |
| `DOUGH_SANDBOX_PROCESSOR_ID` | Payment processor ID | Optional |

## Demo Account

On first startup, a demo shop and account are automatically created:
- **Email**: owner@demo.com
- **Password**: demo123

## Project Structure

```
pcb-auto-standalone/
├── client/                    # Frontend (React + TypeScript)
│   ├── index.html
│   └── src/
│       ├── App.tsx            # Root component
│       ├── main.tsx           # Entry point
│       ├── index.css          # Styles + theme
│       ├── pages/             # All page components
│       ├── components/
│       │   ├── ui/            # Shadcn UI components
│       │   ├── auto/          # Auto-specific components
│       │   └── ai-help/       # AI assistant navigation
│       ├── hooks/             # React hooks
│       └── lib/               # Utilities
├── server/                    # Backend (Express + TypeScript)
│   ├── index.ts               # Server entry point
│   ├── routes.ts              # All 147 API routes
│   ├── auth.ts                # JWT authentication
│   ├── db.ts                  # Database connection
│   ├── email.ts               # Email service (Resend)
│   ├── pdf.ts                 # PDF generation
│   ├── seed-demo.ts           # Demo data seeder
│   ├── vite.ts                # Vite dev server
│   ├── static.ts              # Production static files
│   ├── replit_integrations/   # Object storage
│   └── services/
│       └── dough-gateway/     # Payment processing
├── shared/
│   └── schema.ts              # Database schema (37 tables)
├── script/
│   └── build.ts               # Production build
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
└── postcss.config.mjs
```

## Key URLs

| Path | Description |
|------|-------------|
| `/login` | Login page |
| `/register` | Registration (via invitation link) |
| `/dashboard` | Main dashboard |
| `/repair-orders` | Repair orders & estimates |
| `/customers` | Customer management |
| `/schedule` | Appointment calendar |
| `/inspections` | Digital vehicle inspections |
| `/reports` | Reports & analytics |
| `/reports-v2` | Advanced reports (V2) |
| `/tech-portal` | Technician portal |
| `/settings` | Shop settings |
| `/staff` | Staff management |
| `/processor` | Payment processor config |
| `/quickbooks` | QuickBooks integration |

## API Routes

All API routes are under `/api/`. Key route groups:
- `/api/auth/*` - Authentication
- `/api/customers/*` - Customer CRUD
- `/api/vehicles/*` - Vehicle management
- `/api/repair-orders/*` - Repair order lifecycle
- `/api/estimates/*` - Estimate management
- `/api/dvi/*` - Digital vehicle inspections
- `/api/appointments/*` - Scheduling
- `/api/tech-sessions/*` - Technician time tracking
- `/api/reports/*` - Analytics & reporting
- `/api/dough/*` - Payment processing
- `/api/campaign-settings` - Follow-up campaigns
- `/api/declined-services/*` - Declined service tracking
- `/api/assistant/*` - AI chat assistant
- `/api/public/*` - Public customer-facing pages

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn UI, Wouter, TanStack Query
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT (email/password)
- **AI**: Anthropic Claude, ElevenLabs TTS
- **Email**: Resend
- **Payments**: Dough Gateway
- **PDF**: PDFKit, jsPDF
