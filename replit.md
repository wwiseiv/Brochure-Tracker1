# BrochureDrop

## Overview

BrochureDrop is a mobile-first Progressive Web App (PWA) for field sales representatives to track video brochure deployments. When reps leave physical video brochures at merchant locations, the app captures the brochure ID (via QR code scanning), GPS location, business details, voice notes with AI transcription, and scheduled follow-up reminders. The app then notifies reps when it's time to return for pickup conversations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, built with Vite
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens for a Material Design 3-inspired mobile-first interface
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Authentication**: Replit Auth integration with OpenID Connect, Passport.js, and session management via connect-pg-simple
- **File Uploads**: Presigned URL flow using Google Cloud Storage with Uppy on the client

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit with `drizzle-kit push` for schema synchronization

### Key Data Models
- **Brochures**: Track individual video brochures with status (available, deployed, returned, lost)
- **Drops**: Log each brochure deployment with location, business info, voice notes, and pickup scheduling
- **Reminders**: Follow-up notifications linked to drops
- **Users/Sessions**: Authentication tables managed by Replit Auth integration

### Build System
- **Development**: Vite dev server with HMR, proxied through Express
- **Production**: Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Scripts**: `npm run dev` for development, `npm run build` for production, `npm run db:push` for database migrations

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable

### Authentication
- **Replit Auth**: OpenID Connect provider at `https://replit.com/oidc`
- **Session Secret**: `SESSION_SECRET` environment variable required

### Cloud Storage
- **Google Cloud Storage**: File uploads via presigned URLs through Replit's sidecar endpoint at `http://127.0.0.1:1106`

### Client Libraries
- **html5-qrcode**: QR code scanning via device camera
- **date-fns**: Date manipulation and formatting
- **Uppy**: File upload management with AWS S3-compatible presigned URL support

### UI Dependencies
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management