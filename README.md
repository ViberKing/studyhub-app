# StudyHub

**AI-powered academic companion platform for university students.**

StudyHub is a full-stack SaaS application that brings together everything students need to manage their academic life — assignment tracking, Pomodoro study timers, intelligent flashcards, grade calculators, citation generators, research tools, and a university-wide community — all in one platform.

Built with Next.js 14, TypeScript, Supabase, and Stripe. Helped designed by a university student, built for students.

---

## Features

### Personal Productivity

| Feature | Description |
|---------|-------------|
| **Dashboard** | Personalised overview with upcoming deadlines, study stats, mood tracker, and quick-action tiles |
| **Assignment Tracker** | Create, prioritise, and track assignments with due dates, module links, weight percentages, and status filters |
| **Pomodoro Timer** | Focus sessions (25/50/90 min) with per-module logging, pause/resume, and daily/weekly statistics |
| **Flashcards** | Full study system with 5 modes — classic flip cards, adaptive learn mode, timed match game, auto-graded tests, and bulk card management |
| **Grade Calculator** | Weighted grade tracking per module with target-grade projections and required-score calculations |
| **Notes** | Quick-capture notes linked to modules with instant filtering |
| **Citations** | Generate APA, MLA, and Harvard citations for books, journals, and websites with a saved library |
| **Essay Structure** | 7 essay templates (argumentative, literature review, case study, etc.) with dynamic word-count allocation |
| **Research Assistant** | Guided research project creation with source management and academic integrity safeguards |
| **Analytics** | Study hours, session counts, completion rates, 7-day trend charts, and per-module breakdowns |

### Community

| Feature | Description |
|---------|-------------|
| **University Feed** | Campus-wide social posts with threaded replies and timestamps |
| **Study Groups** | Public/private groups with member roles (owner, admin, member), group chat, and join/create flows |
| **Direct Messages** | Private messaging between group members |

### Platform

| Feature | Description |
|---------|-------------|
| **Authentication** | Supabase Auth with email/password, password reset, and session management |
| **Subscription Billing** | Three-tier pricing (Essential / Plus / Pro) with Stripe Checkout, webhook-driven plan management, and annual discounts |
| **Settings** | Profile management, plan/billing overview, data export (JSON), and account deletion |
| **Demo Mode** | Try the full app without signing up |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL + Row Level Security) |
| **Payments** | [Stripe](https://stripe.com/) (Checkout Sessions + Webhooks) |
| **Styling** | [Tailwind CSS 3](https://tailwindcss.com/) |
| **Deployment** | [Vercel](https://vercel.com/) |

---

## Architecture

```
src/
  app/
    api/
      checkout/route.ts          # Stripe checkout session creation
      webhooks/stripe/route.ts   # Stripe webhook handler
    dashboard/page.tsx           # Main dashboard
    assignments/page.tsx         # Assignment tracker
    timer/page.tsx               # Pomodoro timer
    flashcards/page.tsx          # Flashcard system (5 study modes)
    grades/page.tsx              # Grade calculator
    notes/page.tsx               # Quick notes
    citations/page.tsx           # Citation generator
    essay/page.tsx               # Essay structure builder
    research/page.tsx            # Research assistant
    analytics/page.tsx           # Study analytics
    feed/page.tsx                # University social feed
    groups/page.tsx              # Study groups
    messages/page.tsx            # Direct messaging
    pricing/page.tsx             # Subscription plans
    settings/page.tsx            # User settings
    modules/page.tsx             # Course modules
    page.tsx                     # Auth / landing
    layout.tsx                   # Root layout
    globals.css                  # Global styles
  components/
    AppShell.tsx                 # Navigation wrapper
    Sidebar.tsx                  # Side navigation
    Header.tsx                   # Top bar
  lib/
    supabase.ts                  # Supabase client factory
docs/
  SCHEMA.sql                     # Database schema (20+ tables)
  RLS_POLICIES.sql               # Row Level Security policies
  MIGRATION_PLAN.md              # Phased delivery plan
  MIGRATION_GIFTED.sql           # Gifted accounts migration
```

---

## Database Design

The PostgreSQL schema includes 20+ tables with full Row Level Security:

- **Core** — `profiles`, `modules`, `assignments`, `study_sessions`, `decks`, `cards`, `grades`, `citations`, `notes`
- **Community** — `groups`, `group_members`, `group_messages`, `direct_messages`, `feed_posts`, `feed_replies`
- **Trust & Safety** — `reports`, `blocked_users`, `essay_checks`
- **Billing** — Stripe customer/subscription IDs stored on `profiles`, webhook-driven plan updates

Every table enforces user-level data isolation through RLS policies. Profile creation is triggered automatically on signup with a 7-day free trial.

Full schema: [`docs/SCHEMA.sql`](docs/SCHEMA.sql) | RLS policies: [`docs/RLS_POLICIES.sql`](docs/RLS_POLICIES.sql)

---

## Live Demo

**[studyhub-app-three.vercel.app](https://studyhub-app-three.vercel.app)**

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A [Stripe](https://stripe.com/) account

### Setup

```bash
# Clone the repository
git clone https://github.com/ViberKing/StudyHub.git
cd StudyHub

# Install dependencies
npm install

# Configure environment variables
cp .env.local.example .env.local
# Fill in your Supabase and Stripe keys

# Run the database schema
# Execute docs/SCHEMA.sql and docs/RLS_POLICIES.sql in your Supabase SQL editor

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Roadmap

- [ ] AI Research Assistant — Claude API integration for summarisation, flashcard generation, and source analysis
- [ ] Admin Dashboard — Real-time user management, revenue metrics, and support tickets
- [ ] Dark Mode
- [ ] Mobile PWA
- [ ] Email notifications via Resend

See [`ROADMAP.md`](ROADMAP.md) for the full feature backlog.

---

## License

[MIT](LICENSE)
