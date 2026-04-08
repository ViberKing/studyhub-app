# StudyHub Migration Plan

> **Phase 0 deliverable** — Read this fully before approving Phase 1.
> Generated from `studyhub-complete (1).html` (5,481 lines).

---

## 1. Complete Page Inventory

The prototype is a single-page app with two "shells" (user app + admin console) and a login screen. Pages are toggled via `display:none/block`.

### Login Screen
| Element | What it does |
|---|---|
| **Sign In tab** | Email + password login. Validates against localStorage accounts. |
| **Create Account tab** | Name, email, password, confirm password. Creates a localStorage account with a 7-day trial. |
| **"Try the live demo" button** | Enters demo mode with pre-loaded sample data. No account needed. |
| **"View pricing" link** | Enters demo mode and navigates to the pricing page. |
| **"Forgot password?" link** | Shows an `alert()` saying this would email a reset link in production. |

### User App Pages (13 pages)

| # | Page ID | Title | What it does |
|---|---------|-------|--------------|
| 1 | `dashboard` | Dashboard | Hero greeting (time-of-day aware), 4 bento stat tiles (assignments due, study minutes today, research projects, flashcard decks), upcoming deadlines list, mood tracker (5 buttons), quick action tiles linking to other pages. |
| 2 | `analytics` | Analytics | 4 stat cards (total hours, sessions, assignments done, avg session), 7-day bar chart of study minutes, minutes-per-module progress bars, text insight. |
| 3 | `research` | Research Assistant | Gated behind an academic integrity agreement modal (5 checkboxes). Step 1: essay brief (module + question). Step 2: add sources manually (or stub AI buttons). Step 3: process sources (hard summary, soft summary, flashcards, key pages — all return placeholder text). Save project button. List of saved projects. |
| 4 | `essay` | Essay Structure Builder | Dropdown for essay type (7 templates: argumentative, lit review, compare & contrast, case study, reflective, research paper, general). Word count input. Renders sections with word allocations. "Drafted" checkboxes per section. Print and copy-to-clipboard buttons. |
| 5 | `flashcards` | Flashcards | Create deck (name + module). Deck list with progress bars. **Deck detail view** with 5 mode tabs: **Flashcards** (3D flip card, shuffle, star, rate "still learning" / "got it"), **Learn** (adaptive MC then typed answer, feedback, progress stats), **Match** (timed tile-matching game, 4x grid), **Test** (mixed MC + written, auto-graded, score screen), **Cards** (list view, add/delete cards, bulk import modal). Star system, hint pills, `answerMatches` helper with typo tolerance. |
| 6 | `notes` | Notes | Add note (title, module, content). Filter by module. List with delete. |
| 7 | `assignments` | Assignments | Add assignment (title, module, due date, type, priority, weight%). Filter: all/active/done. Status dropdown (Not Started / In Progress / Completed). Colour-coded urgency badges. Delete with confirm. |
| 8 | `modules` | Modules | Add module (name, code, lecturer, credits). List with linked assignment count. Delete with confirm. Essential plan limited to 5 modules. |
| 9 | `grades` | Grade Calculator | Add component (name, weight%, score 0-20 or blank). Target grade selector (First/2:1/2:2/Third). Calculates weighted average and required score on remaining work. St Andrews 20-point scale reference. |
| 10 | `timer` | Study Timer | Pomodoro timer (25/50/90 min presets). Start/pause/reset. Module + notes fields. Stats: sessions today, minutes today, minutes this week. Session history list. Auto-logs on completion. |
| 11 | `citations` | Citation Generator | Format selector (APA/MLA/Harvard). Source type (Book/Journal/Website) — fields change dynamically. Generate, copy, save. Saved citation library with delete. |
| 12 | `settings` | Settings | Profile (name edit, email read-only). Plan & billing status (trial countdown, active plan display, change plan, cancel subscription). Security (change password). Data (export JSON, delete account). Hidden in demo mode. |
| 13 | `pricing` | Pricing | Monthly/annual toggle. 3 tiers: Essential (£9.99/mo, £99/yr), Plus (£14.99/mo, £149/yr), Pro (£19.99/mo, £199/yr). Feature lists per tier. "Most popular" badge on Plus. "Start free trial" buttons. |

### Admin Console (5 pages — accessed by typing "admin" as email on login)

| # | Page ID | Title | What it does |
|---|---------|-------|--------------|
| 1 | `overview` | Overview | Bento stats (total users, MRR, active trials, churn rate). Recent signups list. Plan distribution chart. Revenue bar chart (last 6 months). |
| 2 | `users` | Users | Search + filter (tier, status). Data table with avatar, name, email, tier pill, status pill, MRR, signup date, last active. |
| 3 | `revenue` | Revenue | MRR, ARR, ARPU, trial-to-paid conversion rate. Revenue-by-tier table. |
| 4 | `support` | Support Tickets | List of ticket cards with avatar, name, email, subject, preview, status pill. |
| 5 | `activity` | Activity Feed | Chronological event list: signups, cancellations, churns, ticket openings. |

> **Note:** The admin console uses randomly generated fake data (`generateAdminData()`). In production, this would query real Supabase data. We should discuss whether to build a real admin console in Phase 4 or defer it.

### Modals (4)

| Modal | Trigger |
|---|---|
| **Academic Integrity Agreement** | Clicking Research in the sidebar (if not yet agreed). 5 checkboxes required. |
| **Tutorial** | "How it works" button in header. Auto-playing step-by-step walkthrough per page. Progress bar segments, keyboard shortcuts (arrows, space, escape). |
| **Confirm** | Delete actions throughout the app. Generic confirm with customisable message and button label. |
| **Bulk Import** | "Bulk import" button in flashcard Cards tab. Textarea for pasting tab/comma/semicolon-separated term-definition pairs. |

---

## 2. Data Model

### Current localStorage Shape

The prototype stores two things in localStorage:

**1. Accounts registry** (`studyhub-accounts` key):
```json
{
  "user@example.com": {
    "name": "string",
    "email": "string",
    "passwordHash": "string (base64 obfuscation, not real crypto)",
    "createdAt": "ISO date string",
    "plan": "trial | essential | plus | pro | cancelled",
    "trialEndsAt": "ISO date string",
    "billing": "monthly | annual"
  }
}
```

**2. Per-user state** (`studyhub-{email}` key):
```json
{
  "assignments": [{ "id": number, "title": string, "module": string, "due": "YYYY-MM-DD", "type": string, "priority": string, "weight": number, "status": string, "done": boolean }],
  "sessions": [{ "id": number, "min": number, "module": string, "notes": string, "at": "ISO string" }],
  "decks": [{
    "id": number,
    "name": string,
    "module": string,
    "cards": [{
      "id": number, "q": string, "a": string, "hint": string,
      "starred": boolean, "status": "new | learning | known"
    }]
  }],
  "grades": [{ "id": number, "name": string, "weight": number, "score": number | null }],
  "citations": [{ "id": number, "text": string }],
  "notes": [{ "id": number, "title": string, "content": string, "module": string, "at": "ISO string" }],
  "modules": [{ "id": number, "name": string, "code": string, "lecturer": string, "credits": number }],
  "projects": [{
    "id": number, "module": string, "brief": string,
    "sources": [{ "id": number, "title": string, "author": string, "results": { "hard"?: string, "soft"?: string, "cards"?: string, "pages"?: string } }],
    "at": "ISO string"
  }],
  "mood": "string | null",
  "integrityAgreed": boolean,
  "sources": [same shape as projects[].sources],
  "essayChecks": { "templateName+index": boolean }
}
```

### Proposed Postgres Schema (Supabase)

```sql
-- Users table is handled by Supabase Auth (auth.users)
-- We add a profiles table for app-specific user data

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'trial'
    CHECK (plan IN ('trial', 'essential', 'plus', 'pro', 'cancelled')),
  billing TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing IN ('monthly', 'annual')),
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  mood TEXT,
  integrity_agreed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE modules (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  lecturer TEXT NOT NULL DEFAULT '',
  credits INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE assignments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT '',
  due DATE NOT NULL,
  type TEXT NOT NULL DEFAULT 'Essay',
  priority TEXT NOT NULL DEFAULT 'Medium',
  weight NUMERIC(5,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Not Started',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE study_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  minutes INTEGER NOT NULL,
  module TEXT NOT NULL DEFAULT 'General',
  notes TEXT NOT NULL DEFAULT '',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE decks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  deck_id BIGINT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  term TEXT NOT NULL,
  definition TEXT NOT NULL,
  hint TEXT NOT NULL DEFAULT '',
  starred BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'learning', 'known')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE grades (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  score NUMERIC(4,1),  -- NULL means pending
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE citations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  module TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE research_projects (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  brief TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE research_sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT REFERENCES research_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  author TEXT NOT NULL DEFAULT '',
  result_hard TEXT,
  result_soft TEXT,
  result_cards TEXT,
  result_pages TEXT,
  is_unsaved BOOLEAN NOT NULL DEFAULT FALSE,
  -- is_unsaved = TRUE for sources in the "working" list (not yet saved to a project)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE essay_checks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,  -- e.g. "argumentative0", "litreview2"
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, check_key)
);

-- Row Level Security: every table gets a policy so users can only
-- read/write their own rows
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE essay_checks ENABLE ROW LEVEL SECURITY;

-- Example RLS policy (repeat pattern for all tables):
CREATE POLICY "Users can manage their own profiles"
  ON profiles FOR ALL
  USING (id = auth.uid());
```

### Key Mapping Notes

| Prototype field | Postgres column | Notes |
|---|---|---|
| `id: Date.now()` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Auto-incrementing, no client-generated IDs |
| `cards` nested inside `decks` | Separate `cards` table with `deck_id` FK | Normalised for efficiency |
| `projects[].sources` | `research_sources` with `project_id` FK | Normalised |
| `state.sources` (unsaved working list) | `research_sources` with `is_unsaved = TRUE, project_id = NULL` | Becomes part of a project on save |
| `state.essayChecks` | `essay_checks` table with composite key | Simple key-value per user |
| `passwordHash` (base64 obfuscation) | Supabase Auth handles this properly | bcrypt under the hood |
| `studyhub-current-user` | Supabase session cookie | Auto-managed |

---

## 3. localStorage Function → Supabase Call Mapping

### Auth Functions

| Prototype Function | What it does now | Supabase replacement |
|---|---|---|
| `getAccounts()` | Reads `studyhub-accounts` from localStorage | Not needed — Supabase Auth manages users |
| `saveAccounts(accounts)` | Writes accounts to localStorage | Not needed |
| `hashPassword(p)` | Base64 obfuscation | Not needed — Supabase Auth uses bcrypt |
| `doSignIn()` | Validates email/password against localStorage | `supabase.auth.signInWithPassword({ email, password })` |
| `doCreateAccount()` | Creates account object in localStorage, sets trial | `supabase.auth.signUp({ email, password, options: { data: { name } } })` + insert into `profiles` table with trial dates |
| `loginAsAccount(account)` | Sets `user` global, stores current email, calls `enterApp()` | `supabase.auth.getUser()` to populate user state, then `enterApp()` |
| `forgotPassword()` | Shows an alert | `supabase.auth.resetPasswordForEmail(email)` — sends real email via Supabase |
| `doSignOut()` | Clears localStorage current-user, resets state | `supabase.auth.signOut()` |
| Auto-login on `DOMContentLoaded` | Reads `studyhub-current-user` from localStorage | `supabase.auth.getSession()` — Supabase persists the session automatically |

### State Persistence Functions

| Prototype Function | What it does now | Supabase replacement |
|---|---|---|
| `saveState()` | `localStorage.setItem(userKey(), JSON.stringify(state))` | Individual table writes (see below) |
| `loadState()` | `localStorage.getItem(userKey())` and merge into `state` | Fetch all user data from Supabase tables on login |

### Per-Feature CRUD Functions → Supabase Calls

**Assignments:**
| Function | Supabase call |
|---|---|
| `addAssignment()` | `supabase.from('assignments').insert({...})` |
| `updateStatus(id, status)` | `supabase.from('assignments').update({ status, done }).eq('id', id)` |
| `delAssignment(id)` | `supabase.from('assignments').delete().eq('id', id)` |

**Study Sessions:**
| Function | Supabase call |
|---|---|
| `logSession(min)` | `supabase.from('study_sessions').insert({...})` |

**Flashcards:**
| Function | Supabase call |
|---|---|
| `addDeck()` | `supabase.from('decks').insert({...})` — returns new deck ID |
| `delDeck(id)` | `supabase.from('decks').delete().eq('id', id)` — cascades to cards |
| `saveNewCard(deckId)` | `supabase.from('cards').insert({...})` |
| `delCardById(deckId, cardId)` | `supabase.from('cards').delete().eq('id', cardId)` |
| `doBulkImport()` | `supabase.from('cards').insert([...array of cards])` |
| `rateCard(id, ok)` | `supabase.from('cards').update({ status }).eq('id', cardId)` |
| `toggleStar(deckId, cardId)` | `supabase.from('cards').update({ starred: !current }).eq('id', cardId)` |

**Grades:**
| Function | Supabase call |
|---|---|
| `addGrade()` | `supabase.from('grades').insert({...})` |
| `delGrade(id)` | `supabase.from('grades').delete().eq('id', id)` |

**Citations:**
| Function | Supabase call |
|---|---|
| `saveCitation(c)` | `supabase.from('citations').insert({ text: c })` |
| `delCit(id)` | `supabase.from('citations').delete().eq('id', id)` |

**Notes:**
| Function | Supabase call |
|---|---|
| `addNote()` | `supabase.from('notes').insert({...})` |
| `delNote(id)` | `supabase.from('notes').delete().eq('id', id)` |

**Modules:**
| Function | Supabase call |
|---|---|
| `addModule()` | `supabase.from('modules').insert({...})` — check count first for Essential plan limit |
| `delModule(id)` | `supabase.from('modules').delete().eq('id', id)` |

**Research:**
| Function | Supabase call |
|---|---|
| `addSourceManual()` | `supabase.from('research_sources').insert({ is_unsaved: true, ... })` |
| `processSource(id, kind)` | `supabase.from('research_sources').update({ result_[kind]: placeholder })` |
| `delSource(id)` | `supabase.from('research_sources').delete().eq('id', id)` |
| `saveResearchProject()` | Insert into `research_projects`, then update all unsaved sources to link to the new project ID |

**Profile / Settings:**
| Function | Supabase call |
|---|---|
| `saveProfile()` | `supabase.from('profiles').update({ name }).eq('id', userId)` |
| `changePassword()` | `supabase.auth.updateUser({ password: newPwd })` |
| `confirmDeleteAccount()` | `supabase.from('profiles').delete().eq('id', userId)` + `supabase.auth.admin.deleteUser(userId)` (or server-side function) |
| `cancelSubscription()` | Redirect to Stripe Customer Portal (Phase 5) |

**Mood:**
| Function | Supabase call |
|---|---|
| `setMood(m)` | `supabase.from('profiles').update({ mood: m }).eq('id', userId)` |

**Integrity:**
| Function | Supabase call |
|---|---|
| `agreeIntegrity()` | `supabase.from('profiles').update({ integrity_agreed: true }).eq('id', userId)` |

**Essay Checks:**
| Function | Supabase call |
|---|---|
| `toggleEssay(type, i)` | `supabase.from('essay_checks').upsert({ check_key, checked })` |

**Pricing / Billing:**
| Function | Supabase call |
|---|---|
| `startTrial(tier)` | Redirect to Stripe Checkout (Phase 5). On webhook, update `profiles.plan`. |
| `setBilling(b)` | UI-only toggle — actual billing handled by Stripe |

**Export:**
| Function | Supabase call |
|---|---|
| `exportData()` | Fetch all tables for user, assemble JSON client-side, trigger download |

---

## 4. alert(), confirm(), and Stub Features

### alert() Calls (24 occurrences)

| Location | Message | Recommendation |
|---|---|---|
| `doSignIn()` | "Please enter your email and password." | Replace with inline error message below the form |
| `doSignIn()` | "No account found with that email." | Inline error |
| `doSignIn()` | "Incorrect password." | Inline error |
| `doCreateAccount()` | "Please fill in all fields." | Inline error |
| `doCreateAccount()` | "Please enter a valid email address." | Inline error |
| `doCreateAccount()` | "Password must be at least 6 characters." | Inline error |
| `doCreateAccount()` | "Passwords don't match." | Inline error |
| `doCreateAccount()` | "An account with this email already exists." | Inline error |
| `forgotPassword()` | "In a live version, this would email you a reset link..." | Replace with real Supabase password reset |
| `goPage('settings')` in demo | "Settings is unavailable in demo mode." | Keep as alert or inline banner — **ask King** |
| `agreeIntegrity()` | "Please tick all five boxes." | Inline error inside modal |
| `addAssignment()` | "Title and due date required." | Inline error |
| `addDeck()` | "Deck name required." | Inline error |
| `saveNewCard()` | "Term and definition are required." | Inline error |
| `doBulkImport()` | "Paste some content first." / "Could not parse any cards." | Inline error inside modal |
| `doBulkImport()` | "Added N cards to your deck." | Replace with toast notification |
| `addGrade()` | "Name and weight required." | Inline error |
| `addNote()` | "Title and content required." | Inline error |
| `addModule()` | "Name required." / "5-module limit" | Inline error |
| `timer completion` | "Session complete. Great work!" | Replace with toast or in-page notification |
| `saveResearchProject()` | "Enter module and brief first." / "Project saved." | Inline error / toast |
| `saveProfile()` | "Name is required." / "Profile updated." | Inline error / toast |
| `changePassword()` | Various validation messages | Inline errors |
| `startTrial()` (demo mode) | "You're in demo mode..." | Keep as alert or banner |
| `startTrial()` (success) | "You're now on StudyHub [tier]." | Toast |
| `exportData()` (demo) | "Demo data can't be exported." | Inline message |
| `cancelSubscription()` | "Subscription cancelled." | Toast |
| `confirmDeleteAccount()` | "Your account has been deleted." | Redirect to login with message |
| `submitLearnWritten()` | "Please type an answer." | Inline error |
| `copyEssayStructure()` | "Copied!" | Toast |

> **Decision needed:** Should I replace all `alert()` calls with styled inline error messages / toast notifications that match the existing UI? Or keep some as browser alerts for simplicity in v1? My recommendation: replace with inline errors for form validation and a simple toast component for success messages, styled to match the prototype's colour scheme.

### confirm() / confirmAction() Calls

The prototype uses a custom `confirmAction()` function that opens a styled modal — not the browser's native `confirm()`. This is already good UI. We'll keep this pattern and just port the modal to a React component.

Used by: `delAssignment`, `delDeck`, `delCardById`, `delGrade`, `delCit`, `delNote`, `delModule`, `delSource`, `confirmDeleteAccount`, `cancelSubscription`, `startTrial`.

### Stub / Fake Features

| Feature | Where | What it does now | Recommendation |
|---|---|---|---|
| **AI Research Assistant — Google Scholar search** | Research page, "Search Google Scholar" button | Calls `aiNotice()` which shows an alert about needing the Anthropic API | Flag as `TODO_REAL_AI.md` — stub with same alert for now |
| **AI Research Assistant — PDF upload** | Research page, "Upload PDF" button | Same `aiNotice()` alert | Flag as `TODO_REAL_AI.md` |
| **AI Source Processing** (hard summary, soft summary, flashcards, key pages) | Research page, per-source buttons | Returns hardcoded placeholder text strings | Flag as `TODO_REAL_AI.md` — keep placeholder text |
| **Admin Console** | Accessed via "admin" email | Uses randomly generated fake data, not real metrics | Keep as-is for v1. Build real admin in a future phase. Flag in `TODO_REAL_AI.md`. |
| **Demo Mode** | Login screen "Try the live demo" button | Loads hardcoded sample data into state | Keep for marketing/onboarding. Data stays client-side. |
| **Stripe Checkout** | `startTrial()` function | Uses `confirmAction()` to fake the upgrade | Replace with real Stripe Checkout in Phase 5 |
| **Password reset** | `forgotPassword()` | Shows alert | Replace with Supabase `resetPasswordForEmail()` |

---

## 5. External CDN Dependencies

The prototype loads **zero** external resources. Everything is self-contained:

- **No CDN links** — no external CSS frameworks, no icon libraries, no JS libraries
- **Fonts**: Uses system font stacks only (`-apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif` for body; `'Iowan Old Style', 'Palatino', Georgia, serif` for headings)
- **Icons**: All icons are inline SVGs embedded directly in the HTML
- **No external JavaScript**: Everything is vanilla JS in a single `<script>` block

This is actually great news for the port — there are no CDN dependencies to manage or replace. The only thing to note:

- **`'Inter'` font**: Listed in the font stack but never loaded from a CDN. It's a fallback — if the user happens to have Inter installed locally, it'll be used; otherwise it falls through to `system-ui`. We should consider whether to load Inter from Google Fonts for consistency across devices. **Decision needed from King.**
- **`'Iowan Old Style'` font**: This is an Apple-only font. On Windows/Android/Linux, it falls through to `Palatino` then `Georgia`. This is the intended behaviour — we should NOT change it.

---

## 6. Risk List — Things That May Be Tricky

### HIGH RISK

| # | Risk | Why it matters | Mitigation |
|---|------|----------------|------------|
| 1 | **Flashcard study modes are complex client-side state machines** | The Learn, Match, and Test modes maintain ephemeral state (`learnState`, `matchState`, `testState`) that drives multi-step interactive flows. This state is intentionally NOT persisted — it resets when you leave the deck. | Port these as client-side React state (useState/useReducer). Only persist card-level changes (starred, status) to Supabase. The ephemeral game state stays in React. |
| 2 | **Match mode uses `setInterval` for a live timer** | The match timer runs at 250ms intervals and updates the DOM directly. React's rendering model could cause flicker or stale closures. | Use `useRef` for the interval and `requestAnimationFrame` or a custom hook. Test thoroughly. |
| 3 | **3D card flip animation uses CSS `transform: rotateX(180deg)` with `backface-visibility`** | This is a subtle CSS animation that depends on exact structure (two `qz-face` elements inside a `qz-card` wrapper with `preserve-3d`). React re-renders could break the flip if the DOM structure changes. | Port the HTML structure exactly. Use React state for `flipped` class toggle. Avoid re-rendering the card DOM on flip — use `className` toggle only. |
| 4 | **Tutorial auto-play uses `requestAnimationFrame` + CSS transitions for progress bars** | The tutorial progress bars animate via CSS `transition: width Xs linear`, kicked off by a reflow hack (`void active.offsetWidth`). React's virtual DOM may not trigger the reflow correctly. | Use `useEffect` with refs to manually trigger the reflow after render. Test across browsers. |
| 5 | **`renderAll()` is called on every page change** | The prototype calls every render function on every navigation. In React, we'd use per-page components that only render when active. But we need to make sure dashboard stats, etc., stay in sync. | Use React Query or SWR to cache and invalidate data. Each page fetches its own data on mount. |

### MEDIUM RISK

| # | Risk | Why it matters | Mitigation |
|---|------|----------------|------------|
| 6 | **Global `user` and `state` variables** | The entire prototype relies on two global vars. React needs to manage this as context or a store. | Use React Context for `user` (auth state) and per-page data fetching from Supabase. |
| 7 | **Keyboard shortcuts are global** | Arrow keys for flashcard navigation, Space to flip, Escape to close modals. These are attached to `window.addEventListener('keydown')`. | Attach keyboard handlers via `useEffect` in the relevant components. Clean up on unmount. Make sure they don't fire when typing in inputs (the prototype already checks for this). |
| 8 | **`innerHTML` assignments with template literals** | The prototype builds HTML strings with `innerHTML`. React uses JSX. Every `renderX()` function needs to be converted to a React component. | This is the bulk of the work but is straightforward — it's a mechanical translation. |
| 9 | **Sidebar responsive breakpoint changes layout** | At 820px the sidebar collapses to icon-only (68px). At 600px tutorial trigger hides text. These are pure CSS. | Port the media queries as-is. No code changes needed. |
| 10 | **`confirm()` modal uses global onclick handlers** | `confirmYes.onclick` and `confirmNo.onclick` are reassigned on every call. In React this would be done with state. | Create a `ConfirmModal` React component with callback props. |
| 11 | **Essay builder `print()` opens a new window** | `printEssayStructure()` creates a new `window.open()` and writes HTML to it. This may be blocked by popup blockers. | Keep the same approach for now — it works in most browsers. Flag for potential improvement later. |
| 12 | **Module limit (5 on Essential plan) is enforced client-side** | The prototype checks `state.modules.length >= 5` before allowing add. With Supabase, we should enforce this server-side too. | Add a Supabase RLS policy or database function that checks the count. Also keep the client-side check for UX. |

### LOW RISK

| # | Risk | Why it matters | Mitigation |
|---|------|----------------|------------|
| 13 | **Demo mode loads hardcoded data** | This doesn't touch the database — it's all in-memory. | Keep demo mode as client-side only. No Supabase calls in demo mode. |
| 14 | **The admin console is entirely fake** | All admin data is generated client-side by `generateAdminData()`. | Keep as-is for v1. Mark for future real admin dashboard. |
| 15 | **`answerMatches()` helper has complex fuzzy matching** | Uses Levenshtein distance, word overlap, and stop-word filtering. Pure JS. | Port as-is — it's a pure function with no DOM or storage dependencies. |
| 16 | **Citation generator formats are hardcoded** | APA/MLA/Harvard templates are string interpolation. | Port as-is. These are pure functions. |
| 17 | **St Andrews-specific content** | Grade calculator uses the 20-point scale, modules default to 30 credits, integrity modal references St Andrews policies. | Keep all of it. This is part of the brand. We can make it configurable later if we expand beyond St Andrews. |

---

## 7. Phase Sequence Summary

| Phase | What happens | Gate |
|---|---|---|
| **0 (this document)** | Audit + plan | King reviews and approves |
| **1 — Skeleton** | Next.js 14 project, git, GitHub repo, Vercel deploy | King confirms URL works |
| **2 — CSS port** | Global stylesheet, login screen render test | King does pixel-comparison |
| **3 — Auth** | Supabase project, schema, auth flow | King tests cross-device login |
| **4 — Pages** | One page at a time in order: Dashboard, Settings, Modules, Assignments, Grades, Flashcards, Notes, Citations, Timer, Analytics, Research, Essay, Pricing | King signs off each page |
| **5 — Stripe** | Products, Checkout, webhooks, Customer Portal | King tests all scenarios in test mode |
| **6 — Production** | Custom domain, legal pages, error logging, pre-launch checklist | King goes live when ready |

---

## 8. Open Questions for King

Before I start Phase 1, please tell me your thoughts on these:

1. **`alert()` replacement strategy**: Should I build a toast notification component matching the prototype's colour scheme? Or keep browser alerts for v1?

2. **Inter font**: Should we load Inter from Google Fonts for cross-device consistency, or keep the current system-font fallback behaviour?

3. **Admin console**: Skip it entirely for v1 (just remove the admin login shortcut), or port it as-is with fake data? Building a real admin dashboard would be a significant Phase 7+ effort.

4. **Demo mode**: Keep it as a marketing tool? It currently loads fake data client-side, which is fine. But it means the pricing page "Start free trial" buttons in demo mode will need special handling.

5. **Email provider**: The prompt mentions Resend for transactional emails. Supabase has built-in email for auth (password reset, email verification). Do you want Resend for those too, or just for future marketing/notification emails?

6. **Module limit enforcement**: Should we enforce the 5-module limit on the Essential plan via Supabase RLS (server-side), or is client-side checking sufficient for now?

---

**This document is the Phase 0 deliverable. I will not write any code until you've read it and given the go-ahead for Phase 1.**
