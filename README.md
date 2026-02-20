# LaundryPing

A simple, low-friction web app for Philippine laundromats that sends "laundry done" SMS notifications to customers. Built to replace manual phone calls and paper logbooks with a tap-tap-done workflow that any staff member can operate without training.

## Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.6 | Full-stack React framework (App Router) |
| React | 19.2.3 | UI library with Server Components |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling (Oxide engine) |
| Supabase | 2.97.x | PostgreSQL database + Auth + RLS |
| shadcn/ui | latest | Accessible component primitives |
| Semaphore | API v4 | Philippine SMS gateway (PHP 0.50/SMS) |
| Vitest | latest | Unit testing framework |

## Prerequisites

- **Node.js** 22.x LTS
- **npm** 10.x+
- **Supabase** account (free tier works)
- **Semaphore** API key (for SMS sending; optional for development -- mock provider included)

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd LaundryPing
   ```

2. **Copy environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

3. **Fill in environment variables** in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL` -- Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` -- Your Supabase anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` -- Your Supabase service role key
   - `SEMAPHORE_API_KEY` -- Your Semaphore SMS API key
   - `SEMAPHORE_SENDER_NAME` -- SMS sender name (default: LaundryPing)
   - `PHONE_ENCRYPTION_KEY` -- Generate with: `openssl rand -hex 32`
   - `SMS_PROVIDER` -- Set to `mock` for development, `semaphore` for production

4. **Install dependencies**
   ```bash
   npm install
   ```

5. **Set up Supabase**
   - Create a new Supabase project (Singapore region recommended for PH users)
   - Run the migration SQL in `supabase/migrations/00001_initial_schema.sql` via the Supabase SQL Editor
   - Optionally run `supabase/seed.sql` for sample data

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Auth pages (login, signup)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/         # Protected dashboard pages
│   │   ├── layout.tsx       # Sidebar + topbar layout
│   │   ├── page.tsx         # Dashboard overview
│   │   ├── jobs/page.tsx    # Jobs management
│   │   ├── machines/page.tsx # Machine configuration
│   │   └── settings/page.tsx # Shop settings
│   ├── api/                 # API Route Handlers
│   │   ├── auth/            # signup, callback
│   │   ├── jobs/            # CRUD + mark complete
│   │   ├── machines/        # CRUD
│   │   ├── settings/        # GET/PUT shop profile
│   │   └── sms/usage/       # SMS quota status
│   ├── globals.css
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── ui/                  # shadcn/ui primitives
│   └── *.tsx                # App-specific components
├── lib/
│   ├── sms/                 # SMS provider, templates, quota
│   ├── supabase/            # Supabase client helpers
│   └── utils/               # Phone, encryption, sanitization
├── middleware.ts             # Auth middleware
└── types/                   # TypeScript type definitions

supabase/
├── migrations/
│   └── 00001_initial_schema.sql  # Full schema + RLS + triggers
└── seed.sql                      # Sample data
```

## Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch
```

Tests cover:
- Phone number validation, normalization, and masking
- AES-256-GCM phone encryption/decryption
- Input sanitization (HTML stripping, length limits)
- SMS template generation and segment counting
- SMS provider (mock + Semaphore with mocked fetch)

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/auth/signup` | POST | Register new laundromat account |
| `/api/auth/callback` | GET | Supabase auth callback |
| `/api/machines` | GET, POST | List/create machines |
| `/api/machines/[id]` | PUT, DELETE | Update/soft-delete machine |
| `/api/jobs` | GET, POST | List today's jobs / create job |
| `/api/jobs/[id]/complete` | POST | Mark job done + send SMS |
| `/api/settings` | GET, PUT | Get/update shop profile |
| `/api/sms/usage` | GET | Current month SMS quota |

## Key Features

- **PH-optimized SMS**: Bilingual Tagalog/English messages via Semaphore, PHP 0.50/SMS
- **Free tier**: 50 SMS/month per laundromat with lazy billing cycle reset
- **Phone privacy**: AES-256-GCM encryption at rest, masked display (`09xx-xxx-NNNN`)
- **Idempotent SMS**: Triple-layer protection against duplicate sends
- **Multi-tenant**: Row-Level Security on all tables from day 1
- **Mobile-first**: Designed for budget Android devices on PH 4G

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for Vercel deployment instructions.

## License

Copyright 2026 LaundryPing. All rights reserved.
