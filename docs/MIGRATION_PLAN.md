# StudyHub Migration Plan

> **Phase 0 deliverable** — Read this fully before approving Phase 1.
> Generated from `studyhub-complete (1).html` (5,481 lines, ~100 JS functions).

---

## 1. Complete Page Inventory

### Login Screen

| Element | What it does |
|---|---|
| **Sign In tab** | Email + password login. Validates against localStorage accounts. |
| **Create Account tab** | Name, email, password, confirm password. Creates a localStorage account with a 7-day trial. |
| **"Try the live demo" button** | Enters demo mode with pre-loaded sample data. No account needed. |
| **"View pricing" link** | Enters demo mode and navigates to the pricing page. |
| **"Forgot password?" link** | Shows an `alert()` saying this would email a reset link in production. |

### User App Pages (13 in prototype)

| # | Page ID | Title | What it does |
|---|---------|-------|--------------|
| 1 | `dashboard` | Dashboard | Hero greeting (time-of-day aware), 4 bento stat tiles (assignments due, study minutes today, research projects, flashcard decks), upcoming deadlines list, mood tracker (5 buttons), quick action tiles. |
| 2 | `analytics` | Analytics | 4 stat cards (total hours, sessions, assignments done, avg session), 7-day bar chart of study minutes, minutes-per-module progress bars, text insight. |
| 3 | `research` | Research Assistant | Gated behind academic integrity agreement modal (5 checkboxes). Step 1: essay brief (module + question). Step 2: add sources manually (or stub AI buttons). Step 3: process sources (hard/soft summary, flashcards, key pages — all placeholder text). Save project. List saved projects. |
| 4 | `essay` | Essay Structure Builder | 7 essay type templates. Word count input scales section allocations. "Drafted" checkboxes. Print + copy to clipboard. |
| 5 | `flashcards` | Flashcards | Create deck. Deck list with progress bars. **Deck detail** with 5 mode tabs: **Flashcards** (3D flip card, shuffle, star, rate), **Learn** (adaptive MC→typed answer, feedback, progress), **Match** (timed tile-matching, 4×grid), **Test** (mixed MC + written, auto-graded, score screen), **Cards** (list view, add/delete, bulk import). Star system, hint pills, `answerMatches` with typo tolerance. |
| 6 | `notes` | Notes | Add note (title, module, content). Filter by module. List with delete. |
| 7 | `assignments` | Assignments | Add assignment (title, module, due date, type, priority, weight%). Filter: all/active/done. Status dropdown. Colour-coded urgency badges. Delete with confirm. |
| 8 | `modules` | Modules | Add module (name, code, lecturer, credits). Linked assignment count. Delete. Essential plan limited to 5 modules. |
| 9 | `grades` | Grade Calculator | Add component (name, weight%, score 0–20 or blank). Target grade selector. Calculates weighted average and required remaining score. St Andrews 20-point scale. |
| 10 | `timer` | Study Timer | Pomodoro (25/50/90 min presets). Start/pause/reset. Module + notes fields. Stats (today/week). Session history. Auto-logs on completion. |
| 11 | `citations` | Citation Generator | Format (APA/MLA/Harvard). Source type (Book/Journal/Website) — fields change dynamically. Generate, copy, save. Citation library with delete. |
| 12 | `settings` | Settings | Profile (name edit, email read-only). Plan & billing status. Security (change password). Data (export JSON, delete account). Hidden in demo mode. |
| 13 | `pricing` | Pricing | Monthly/annual toggle. 3 tiers (Essential/Plus/Pro). Feature lists. "Most popular" badge on Plus. "Start free trial" buttons. |

### Community Pages (NEW — not in prototype)

These pages are specified in the requirements but **do not exist in the prototype HTML/CSS**. They will need UI design during Phase 4.

| # | Page ID | Title | What it does |
|---|---------|-------|--------------|
| 14 | `feed` | Uni Feed | University-wide social feed for St Andrews students. Posts + replies. |
| 15 | `groups` | Groups | Public/private study groups. Group chat. Members list. |
| 16 | `messages` | Messages | Direct messages between users who share a group ("shared group required" gate). |

### Calendar Page (NEW — not in prototype)

| # | Page ID | Title | What it does |
|---|---------|-------|--------------|
| 17 | `calendar` | Calendar | Calendar view with events. Types include assignments, study sessions, custom events. |

### Admin Console (5 pages — **REMOVED for v1**)

Per requirements: "Admin console: removed for v1. Delete the `enterAdminMode` shortcut and the admin pages from the port."

The prototype has 5 admin pages (Overview, Users, Revenue, Support, Activity) using randomly generated fake data. These will NOT be ported. The `enterAdminMode()` function, the "admin" email shortcut in `doSignIn()`, and all admin HTML/CSS will be deleted.

### Modals (4)

| Modal | Trigger |
|---|---|
| **Academic Integrity Agreement** | Clicking Research in sidebar (if not yet agreed). 5 checkboxes required. |
| **Tutorial** | "How it works" button in header. Auto-playing step-by-step walkthrough per page. |
| **Confirm** | Delete actions throughout the app. Generic confirm with customisable message/button. |
| **Bulk Import** | "Bulk import" button in flashcard Cards tab. Paste tab/comma/semicolon-separated pairs. |

---

## 2. Data Model

### Current localStorage Shape

**Accounts registry** (`studyhub-accounts` key):
```json
{
  "user@example.com": {
    "name": "string",
    "email": "string",
    "passwordHash": "string (base64 obfuscation)",
    "createdAt": "ISO date",
    "plan": "trial | essential | plus | pro | cancelled",
    "trialEndsAt": "ISO date",
    "billing": "monthly | annual"
  }
}
```

**Per-user state** (`studyhub-{email}` key):
```json
{
  "assignments": [{ "id", "title", "module", "due", "type", "priority", "weight", "status", "done" }],
  "sessions": [{ "id", "min", "module", "notes", "at" }],
  "decks": [{ "id", "name", "module", "cards": [{ "id", "q", "a", "hint", "starred", "status" }] }],
  "grades": [{ "id", "name", "weight", "score" }],
  "citations": [{ "id", "text" }],
  "notes": [{ "id", "title", "content", "module", "at" }],
  "modules": [{ "id", "name", "code", "lecturer", "credits" }],
  "projects": [{ "id", "module", "brief", "sources": [...], "at" }],
  "mood": "string | null",
  "integrityAgreed": boolean,
  "sources": [{ "id", "title", "author", "results": {} }],
  "essayChecks": { "templateName+index": boolean }
}
```

### Proposed Postgres Schema

```sql
-- ============================================================
-- PROFILES (extends Supabase Auth)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  university TEXT NOT NULL DEFAULT 'st-andrews',
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

-- ============================================================
-- CORE STUDY TABLES
-- ============================================================
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
  score NUMERIC(4,1),  -- NULL = pending
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE essay_checks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id, check_key)
);

-- ============================================================
-- CALENDAR (new feature — not in prototype)
-- ============================================================
CREATE TABLE calendar_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL DEFAULT 'custom'
    CHECK (event_type IN ('assignment', 'study', 'custom', 'exam', 'social')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  module TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- COMMUNITY (new feature — not in prototype)
-- ============================================================
CREATE TABLE groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  university TEXT NOT NULL DEFAULT 'st-andrews',
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE TABLE group_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE direct_messages (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feed_posts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  university TEXT NOT NULL DEFAULT 'st-andrews',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feed_replies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  post_id BIGINT NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL
    CHECK (content_type IN ('post', 'reply', 'group_message', 'dm')),
  content_id BIGINT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'actioned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE blocked_users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
```

### Key Mapping Notes

| Prototype field | Postgres column | Notes |
|---|---|---|
| `id: Date.now()` | `BIGINT GENERATED ALWAYS AS IDENTITY` | Auto-incrementing, no client-generated IDs |
| `cards` nested in `decks` | Separate `cards` table with `deck_id` FK | Normalised |
| `projects[].sources` | `research_sources` with `project_id` FK | Normalised |
| `state.sources` (unsaved) | `research_sources` with `is_unsaved = TRUE` | Links to project on save |
| `state.essayChecks` | `essay_checks` with composite key | Simple key-value per user |
| `passwordHash` (base64) | Supabase Auth bcrypt | Proper crypto |
| `studyhub-current-user` | Supabase session cookie | Auto-managed |

---

## 3. Function → Supabase Call Mapping

### Auth Functions

| Prototype Function | Supabase Replacement |
|---|---|
| `getAccounts()` | Not needed — Supabase Auth manages users |
| `saveAccounts(accounts)` | Not needed |
| `hashPassword(p)` | Not needed — Supabase Auth uses bcrypt |
| `doSignIn()` | `supabase.auth.signInWithPassword({ email, password })` + `.ac.uk` email validation |
| `doCreateAccount()` | `supabase.auth.signUp({ email, password, options: { data: { name } } })` + insert `profiles` row + `.ac.uk` + `@st-andrews.ac.uk` checks |
| `loginAsAccount(account)` | `supabase.auth.getUser()` → populate user state → `enterApp()` |
| `forgotPassword()` | `supabase.auth.resetPasswordForEmail(email)` — sends real email |
| `doSignOut()` | `supabase.auth.signOut()` |
| `enterAdminMode()` | **DELETED** — no admin console in v1 |
| Auto-login on `DOMContentLoaded` | `supabase.auth.getSession()` |

### State Persistence

| Prototype Function | Supabase Replacement |
|---|---|
| `saveState()` | Individual table writes per mutation |
| `loadState()` | Fetch all user data from Supabase tables on login |

### Per-Feature CRUD

**Assignments:**

| Function | Supabase call |
|---|---|
| `addAssignment()` | `supabase.from('assignments').insert({...})` |
| `updateStatus(id, status)` | `supabase.from('assignments').update({ status, done }).eq('id', id)` |
| `delAssignment(id)` | `supabase.from('assignments').delete().eq('id', id)` |
| `filterAssign(f)` | Client-side filter on fetched data (same as prototype) |

**Study Sessions:**

| Function | Supabase call |
|---|---|
| `logSession(min)` | `supabase.from('study_sessions').insert({...})` |

**Flashcards:**

| Function | Supabase call |
|---|---|
| `addDeck()` | `supabase.from('decks').insert({...})` |
| `delDeck(id)` | `supabase.from('decks').delete().eq('id', id)` — cascades to cards |
| `saveNewCard(deckId)` | `supabase.from('cards').insert({...})` |
| `delCardById(deckId, cardId)` | `supabase.from('cards').delete().eq('id', cardId)` |
| `doBulkImport()` | `supabase.from('cards').insert([...array])` |
| `rateCard(id, ok)` | `supabase.from('cards').update({ status }).eq('id', cardId)` |
| `toggleStar(deckId, cardId)` | `supabase.from('cards').update({ starred: !current }).eq('id', cardId)` |

Note: `reviewState`, `learnState`, `matchState`, `testState`, `starredOnly` are **ephemeral client-side state only** — they are never persisted. They stay as React state (useState/useReducer). Only `card.status` and `card.starred` are persisted to Supabase.

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
| `addModule()` | `supabase.from('modules').insert({...})` — check count for Essential limit |
| `delModule(id)` | `supabase.from('modules').delete().eq('id', id)` |

**Research:**

| Function | Supabase call |
|---|---|
| `addSourceManual()` | `supabase.from('research_sources').insert({ is_unsaved: true, ... })` |
| `processSource(id, kind)` | `supabase.from('research_sources').update({ result_[kind]: placeholder })` |
| `delSource(id)` | `supabase.from('research_sources').delete().eq('id', id)` |
| `saveResearchProject()` | Insert into `research_projects`, update sources to link to project |

**Profile / Settings:**

| Function | Supabase call |
|---|---|
| `saveProfile()` | `supabase.from('profiles').update({ name }).eq('id', userId)` |
| `changePassword()` | `supabase.auth.updateUser({ password: newPwd })` |
| `confirmDeleteAccount()` | Server-side function to delete user + cascade |
| `cancelSubscription()` | Redirect to Stripe Customer Portal (Phase 5) |

**Mood / Integrity / Essay Checks:**

| Function | Supabase call |
|---|---|
| `setMood(m)` | `supabase.from('profiles').update({ mood: m })` |
| `agreeIntegrity()` | `supabase.from('profiles').update({ integrity_agreed: true })` |
| `toggleEssay(type, i)` | `supabase.from('essay_checks').upsert({ check_key, checked })` |

**Pricing / Billing:**

| Function | Supabase call |
|---|---|
| `startTrial(tier)` | Redirect to Stripe Checkout (Phase 5) |
| `setBilling(b)` | UI-only toggle — Stripe handles billing |

**Export:**

| Function | Supabase call |
|---|---|
| `exportData()` | Fetch all user tables, assemble JSON, trigger download |

**Pure client-side functions (no Supabase needed):**

These are stateless helpers that port directly as TypeScript functions:
- `answerMatches()`, `similarity()`, `editDistance()` — fuzzy matching
- `esc()` — HTML escaping (React handles this via JSX)
- `daysUntil()` — date helper
- `essayTemplates` object — essay type definitions
- `renderEssay()`, `calcGrades()`, `generateCitation()`, `renderCitationFields()` — pure computation
- `formatMatchTime()` — timer formatting
- All tutorial data (`tutorials` object) — static content
- All admin functions — **DELETED**

---

## 4. Stub Features → TODO_REAL_AI.md

| Feature | Location | Current Behaviour | TODO |
|---|---|---|---|
| **Google Scholar search** | Research page, "Search Google Scholar" button | `aiNotice()` alert | Wire Anthropic API for academic search |
| **PDF upload** | Research page, "Upload PDF" button | `aiNotice()` alert | File upload + Anthropic API extraction |
| **Hard summary** | Research page, per-source button | Returns placeholder text | Anthropic API summarisation |
| **Soft summary** | Research page, per-source button | Returns placeholder text | Anthropic API summarisation |
| **Flashcard generation** | Research page, per-source button | Returns placeholder text | Anthropic API card generation |
| **Key pages identification** | Research page, per-source button | Returns placeholder text | Anthropic API analysis |
| **AI email drafter** | Not in prototype | Not implemented | "Can't attend" and "extension request" email templates via Anthropic API |
| **Document reader** | Not in prototype | Not implemented | Upload + parse academic documents |
| **.ics import** | Not in prototype | Not implemented | Calendar import from .ics files |

---

## 5. Risk List

### HIGH RISK

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Flashcard study modes are complex client-side state machines** — `learnState`, `matchState`, `testState` maintain multi-step interactive flows with ephemeral state that resets on leaving the deck. | Port as client-side React state (useState/useReducer). Only persist `card.status` and `card.starred` to Supabase. The game state stays in React. |
| 2 | **Match mode uses `setInterval` for a 250ms live timer** — React's rendering model causes stale closures and flicker with naive intervals. | Use `useRef` for the interval ID and a custom `useMatchTimer` hook. Store `startTime` in a ref, update display via `requestAnimationFrame` or `setInterval` with ref-based state reads. |
| 3 | **3D card flip animation depends on exact DOM structure** — `preserve-3d`, `backface-visibility`, two `qz-face` elements inside a `qz-card` wrapper. React re-renders could break the flip. | Port HTML structure exactly. Toggle `flipped` class via React state. Use `key` prop carefully to avoid unnecessary DOM recreation. |
| 4 | **Tutorial auto-play uses reflow hack** — `void active.offsetWidth` forces CSS transition restart. React's virtual DOM may not trigger reflows correctly. | Use `useEffect` + `useRef` to access the DOM element directly and force reflow after render. |
| 5 | **Community pages have no prototype spec** — UI feed, groups, and messages are mentioned in requirements but don't exist in the HTML. | Need design decisions before building. See Open Questions below. |
| 6 | **Supabase Realtime for community chat** — Group messages and DMs need real-time updates via Supabase Realtime subscriptions. | Use `supabase.channel().on('postgres_changes', ...)` for group_messages and direct_messages tables. Handle subscription cleanup on unmount. Test with two browser windows. |
| 7 | **Calendar page has no prototype spec** — The calendar page is mentioned in requirements but doesn't exist in the HTML. | Need design decisions. See Open Questions. |

### MEDIUM RISK

| # | Risk | Mitigation |
|---|------|------------|
| 8 | **Global `user` and `state` variables** → React Context | Use an AuthContext for `user` and per-page data fetching from Supabase. |
| 9 | **Keyboard shortcuts are global** | Attach via `useEffect` in relevant components. Clean up on unmount. Check for input focus (prototype already does this). |
| 10 | **`innerHTML` with template literals** → JSX | Mechanical translation — every `renderX()` function becomes a React component. Bulk of Phase 4 work. |
| 11 | **`confirmAction()` uses global onclick reassignment** | Create a `ConfirmModal` component with callback props. |
| 12 | **Module limit (5 on Essential) is client-side only** | Keep client-side check. Also enforce via Supabase RLS or database function. |
| 13 | **Pricing discrepancy** — Prototype says £9.99/£14.99/£19.99 but requirements say £7.99/£14.99/£19.99 for Essential. | Use the requirements prices (£7.99/£14.99/£19.99). Update the CSS/HTML during port. |
| 14 | **DM "shared group required" gate** — DMs only allowed between users who share a group. | Enforce in RLS policy: a function checks `group_members` for both users sharing at least one group. |

### LOW RISK

| # | Risk | Mitigation |
|---|------|------------|
| 15 | **Demo mode loads hardcoded data** | Keep as client-side only. No Supabase calls in demo mode. |
| 16 | **`answerMatches()` fuzzy matching** | Port as-is — pure function, no DOM/storage deps. |
| 17 | **Citation generator templates** | Port as-is — pure string interpolation. |
| 18 | **St Andrews-specific content** | Keep. 20-point scale, 30-credit modules, integrity policy references. |
| 19 | **Responsive breakpoints** (820px sidebar collapse, 600px tutorial text) | Port media queries verbatim. |
| 20 | **Essay builder `print()` opens new window** | Keep — works in most browsers. |

---

## 6. alert() → Inline Error / Toast Replacement Plan

The prototype has ~24 `alert()` calls. These break into three categories:

### Form validation → Inline error messages
Show a red error message below the relevant form field, styled with the existing `--red` / `--rose-50` colours. Disappear on next valid submit.

Affected: `doSignIn()` (3), `doCreateAccount()` (4), `agreeIntegrity()` (1), `addAssignment()` (1), `addDeck()` (1), `saveNewCard()` (1), `doBulkImport()` (1), `addGrade()` (1), `addNote()` (1), `addModule()` (2), `generateCitation()` (1), `saveProfile()` (1), `changePassword()` (3), `submitLearnWritten()` (1), `saveResearchProject()` (1)

### Success / info → Toast notification
A small, temporary toast component (bottom-right, auto-dismiss after 3s) with the prototype's gradient/rose styling.

Affected: `doBulkImport()` success (1), timer completion (1), `saveResearchProject()` success (1), `saveProfile()` success (1), `changePassword()` success (1), `startTrial()` success (1), `cancelSubscription()` success (1), `copyEssayStructure()` (1), `confirmDeleteAccount()` (1)

### Demo mode alerts → Keep as alerts or inline banners
`goPage('settings')` in demo, `startTrial()` in demo, `exportData()` in demo — keep as styled inline banners.

---

## 7. Polish Fixes Applied During Port

These are applied as each page is ported, not as a separate pass:

| Fix | Details |
|---|---|
| **8 buttons: `btn` → `btn-grad`** | "Add assignment", "Create deck", "Add component", "Save note", "Add module", "Save changes", "Update password", + Research "Save research project" (already btn-grad, but verify all 8) |
| **`:focus-visible` styles** | Global rule: `button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--red); outline-offset: 2px; border-radius: 4px; }` |
| **Touch targets** | `.btn-sm` and `.icon-btn` → minimum 44px inside `@media (max-width: 600px)` |
| **11 `aria-label` attributes** | All icon-only buttons (×, ★, ⚑) get descriptive labels |
| **`essayWords` min/max bounds** | `min="500" max="20000"` |
| **`mCredits` min/max bounds** | `min="0" max="120"` |
| **10 textarea `maxlength`** | Match JS validation limits for each field |
| **Emoji → SVG icons** | Calendar event types and dashboard quick actions: replace ●, ◷, ★, ▤, ✓ with stroked SVG icons for cross-platform consistency |
| **Pricing: £9.99 → £7.99** | Essential monthly price updated per requirements. Annual: £99 → £79. |
| **Annual savings text** | "Save up to £40" updated to match new pricing |

---

## 8. Phase Sequence Summary

| Phase | What happens | Gate |
|---|---|---|
| **0 (this document)** | Audit + plan | You review and approve |
| **1 — Skeleton** | Next.js 14 + TypeScript, git, GitHub repo, Vercel deploy | You confirm URL works |
| **2 — CSS port** | Global stylesheet from prototype, login screen render | You do pixel comparison |
| **3 — Auth** | Supabase project, schema, RLS_POLICIES.sql review, auth flow with `.ac.uk` check | You test cross-device login |
| **4 — Pages** | One at a time: Dashboard → Settings → Modules → Assignments → Grades → Flashcards → Notes → Citations → Timer → Analytics → Calendar → Research → Essay → Pricing → Community (Feed → Groups → Messages) | You sign off each page |
| **5 — Stripe** | 3 products × 2 billing = 6 prices. Checkout, webhooks, Customer Portal | You test all scenarios |
| **6 — Production** | Custom domain, ToS/Privacy placeholders, ICO reminder, Sentry, checklist | You go live |

---

## 9. Open Questions

Before I start Phase 1, I need your input on these:

### Must-answer before Phase 1

1. **Community pages (Feed, Groups, Messages) have no prototype UI.** The prototype doesn't include these pages at all — no HTML, no CSS, no JavaScript. How should I handle them?
   - **Option A:** I design a simple UI matching the prototype's existing design language (same cards, fonts, colours) during Phase 4.
   - **Option B:** You provide mockups or a description of what you want.
   - **Option C:** Defer community features to a later phase entirely.

2. **Calendar page has no prototype UI either.** Same question — should I design one in the prototype's style, or defer it?

3. **Pricing discrepancy.** The prototype says Essential is £9.99/mo (£99/yr). Your requirements say £7.99/mo (£79/yr). Which is correct? I'll use **your requirements** (£7.99) unless you say otherwise.

### Nice-to-answer before Phase 1

4. **`alert()` replacement.** I plan to replace form validation alerts with inline error messages and success alerts with a toast component, both styled to match the prototype. OK?

5. **Inter font.** The prototype lists Inter in the font stack but never loads it. Should I add a Google Fonts import for cross-device consistency, or keep the system font fallback?

6. **`.ac.uk` email validation on signup.** The requirements say `.ac.uk` required + St Andrews-specific check for `@st-andrews.ac.uk`. Should I:
   - Block ALL non-`.ac.uk` emails at signup?
   - Allow signup with any email but show a warning?
   - Something else?

7. **Module limit enforcement.** Client-side only (like prototype), or also enforce server-side via Supabase?

8. **University dropdown on signup.** Do you want a university selector on the signup form (launch with only St Andrews active, others as "waitlist" placeholders)?

---

**This document is the Phase 0 deliverable. I will not write any code until you've read it and said "ok next phase".**
