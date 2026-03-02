# AI Agency OS – Claude Code Instructions

## What This Project Is
AI Agency OS is a SaaS platform ("Business-in-a-Box") for aspiring AI entrepreneurs.
Users find potential clients via Google Maps, generate professional websites with AI, and manage the entire sales process from one dashboard.

**Core user flow:**
1. User searches for local businesses via Google Maps
2. AI scores and filters prospects (no website, bad reviews, outdated presence)
3. One-click AI website generation (Claude API) tailored to the business
4. User edits and previews the site
5. Platform generates a sales proposal PDF
6. Domain is connected and site is deployed to Vercel/Netlify
7. Client management via built-in CRM

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Neon (cloud-hosted) |
| ORM | Prisma |
| Auth | NextAuth.js |
| AI / LLM | Anthropic Claude API (primary), OpenAI fallback |
| Prospecting | Google Maps Platform API |
| Payments | Stripe |
| Deployment | Vercel |
| Email | SendGrid |
| State management | Zustand |
| Forms | React Hook Form + Zod validation |

---

## Project Structure

```
ai-agency-os/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Auth pages (login, register)
│   ├── (dashboard)/            # Protected dashboard routes
│   │   ├── prospects/          # Google Maps prospecting
│   │   ├── websites/           # AI website generator
│   │   ├── clients/            # CRM
│   │   └── settings/           # User settings & billing
│   ├── api/                    # API routes
│   │   ├── auth/               # NextAuth endpoints
│   │   ├── prospects/          # Google Maps API calls
│   │   ├── websites/           # AI generation endpoints
│   │   ├── stripe/             # Payment webhooks
│   │   └── deploy/             # Vercel/Netlify deployment
│   └── layout.tsx
├── components/
│   ├── ui/                     # Reusable UI components (shadcn/ui)
│   ├── dashboard/              # Dashboard-specific components
│   ├── prospects/              # Prospecting components
│   └── websites/               # Website builder components
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── auth.ts                 # NextAuth config
│   ├── claude.ts               # Anthropic Claude API client
│   ├── gemini.ts               # Google Gemini/Imagen API (logo + hero images)
│   ├── maps.ts                 # Google Maps API client
│   ├── stripe.ts               # Stripe client
│   └── validations/            # Zod schemas
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # DB migrations
├── hooks/                      # Custom React hooks
├── types/                      # TypeScript type definitions
└── middleware.ts               # Auth middleware (protect dashboard routes)
```

---

## Database Schema (Prisma)

Key models to always be aware of:

- **User** – platform subscriber (the entrepreneur using AI Agency OS)
- **Project** – a workspace/campaign a user is running
- **Prospect** – a business found via Google Maps search
- **Website** – an AI-generated website linked to a Prospect
- **Client** – a Prospect that has converted to a paying customer
- **Subscription** – Stripe subscription data per User

---

## Environment Variables

Always expect these in `.env.local`. Never hardcode secrets.

```
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# APIs
ANTHROPIC_API_KEY=
GOOGLE_MAPS_API_KEY=
GOOGLE_GEMINI_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
SENDGRID_API_KEY=

# OAuth (for NextAuth social login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Deployment
VERCEL_TOKEN=
NEXT_PUBLIC_APP_URL=
```

---

## Business Logic & Rules

### Subscription Tiers
- **Free**: 10 prospect searches/month, 1 AI website (preview only, no publish)
- **Basic** (NOK 299/mnd): 100 searches, 10 websites, 3 live deployments
- **Pro** (NOK 799/mnd): Unlimited everything + white-label + API access

### API Usage Limits
- Always check user's subscription tier before calling Google Maps or Claude API
- Log all AI generation calls to the `AiUsageLog` table for cost tracking
- Fail gracefully with a clear upgrade prompt if limits are exceeded

### Website Generation
- Always generate websites based on the prospect's business category
- Claude prompt must include: business name, category, location, services (from Maps data)
- Generated HTML must be valid, responsive, and deployable as-is
- Store the raw HTML in the `Website` model, not in file storage

---

## Code Standards

- **TypeScript strictly** – no `any` types, ever
- **Server Components by default** – only use `'use client'` when necessary (event handlers, hooks, browser APIs)
- **API routes** validate input with Zod before touching the database
- **Error handling** – always return structured JSON errors: `{ error: string, code: string }`
- **Loading states** – every async action needs a loading state in the UI
- **Prisma** – always use the singleton from `lib/prisma.ts`, never instantiate directly
- **No inline styles** – Tailwind only

---

## Current Development Phase

**PHASE 1 – MVP** (in progress)

Completed:
- [ ] Next.js project scaffolding
- [ ] Neon PostgreSQL connection
- [ ] Prisma setup
- [ ] NextAuth.js – email/password + Google OAuth
- [ ] Dashboard layout & navigation
- [ ] Prisma schema – define all models

Up next (in priority order):
1. Google Maps prospecting feature
2. Claude AI website generator
4. Stripe subscriptions

---

## Key Decisions & Why

- **Neon over local Postgres** – zero-config, free tier, scales to Vercel seamlessly
- **App Router over Pages Router** – modern standard, better for server components and layouts
- **Prisma over raw SQL** – type safety, migrations, great DX
- **shadcn/ui over a component library** – copy-paste components, full control, no version conflicts
- **Anthropic Claude as primary LLM** – superior instruction-following for structured HTML generation

---

## When In Doubt

- Ask before deleting or restructuring existing files
- Prefer small, focused changes over large rewrites
- Always run `npx prisma generate` after changing `schema.prisma`
- Always run `npx prisma migrate dev` to apply schema changes locally
- Check subscription tier limits before implementing any new AI-powered feature