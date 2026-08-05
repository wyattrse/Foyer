# Foyer — Technical Handoff Spec

**Purpose of this document:** a complete reference for rebuilding Foyer's frontend (currently a self-contained React prototype using browser storage) on a real backend. Everything here reflects what's actually built and working in the prototype — the goal is a 1:1 migration of behavior, not a redesign.

---

## 1. Product summary

Foyer is a lead capture and follow-up CRM for a solo real estate agent, designed to scale later into a multi-agent brokerage tool. Core loop: capture a lead (open house kiosk, quick add, referral) → auto-score it → track it through a pipeline → get nudged to follow up on a cadence → eventually log a commission when it closes.

---

## 2. Recommended stack

- **Database + Auth:** Supabase (Postgres + built-in auth + row-level security). Row-level security is important from day one — even as a solo user now, it's the mechanism that will isolate each agent's data when this becomes multi-agent.
- **Hosting:** Vercel or Netlify for the frontend; Supabase hosts the backend.
- **Frontend:** the existing React component structure can largely be reused — swap `window.storage` calls for Supabase client calls (`supabase.from('leads').select()`, `.insert()`, `.update()`, `.delete()`).
- **Mobile:** ship as a hosted web app first, add a `manifest.json` + service worker to make it installable (Add to Home Screen) as a PWA. Hold off on React Native/Expo until the web version is proven.

---

## 3. Data model

### `agents` (was: Settings tab)
| column | type | notes |
|---|---|---|
| id | uuid, PK | matches Supabase auth user id |
| name | text | |
| brokerage | text | nullable |
| commission_split | numeric | default 70 |
| created_at | timestamptz | |

### `leads`
| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| agent_id | uuid, FK → agents.id | **critical for row-level security** |
| name | text | required |
| phone | text | nullable |
| email | text | nullable |
| source | text | enum: `Open House`, `Referral`, `Inquiry`, `Business Card`, `Other` |
| timeline | text | enum: `immediate`, `1-3`, `3-6`, `6plus`, `browsing` |
| has_agent | text | enum: `no`, `unsure`, `yes` |
| notes | text | nullable |
| stage | text | enum: `New`, `Contacted`, `Nurturing`, `Showing`, `Under Contract`, `Closed`, `Lost` — default `New` |
| auto_score | int | recomputed server-side (see §4) whenever scoring inputs change |
| manual_score | int | nullable — null means "use auto_score" |
| deal_value | numeric | nullable — gross commission, only meaningful once Under Contract/Closed |
| sort_order | int | used for manual drag-reorder within a stage or source group |
| deleted_at | timestamptz | nullable — soft delete for undo support, see §4 |
| possible_duplicate_of | uuid, FK → leads.id | nullable — set by server-side duplicate check on kiosk inserts, see §4 |
| created_at | timestamptz | |

### `interactions` (was: per-lead interaction log)
| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| lead_id | uuid, FK → leads.id | |
| text | text | |
| created_at | timestamptz | this is also what cadence math uses as "last touch" |

### `tasks`
| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| agent_id | uuid, FK | |
| text | text | |
| done | boolean | default false |
| created_at | timestamptz | |

### `templates`
| column | type | notes |
|---|---|---|
| id | uuid, PK | |
| agent_id | uuid, FK | nullable if you want shared/system defaults |
| title | text | |
| body | text | supports `{name}` placeholder, replaced client-side on insert |

Seed three default templates per new agent on signup (see prototype's `DEFAULT_TEMPLATES` for exact copy).

---

## 4. Business logic to preserve

### Scoring (`computeAutoScore`)
Base score 10, plus:
- **Timeline:** immediate +40, 1-3mo +30, 3-6mo +15, 6+ +5, browsing +0
- **Has agent:** no +20, unsure +10, yes +0
- **Source:** Open House +15, Referral +20, Inquiry +15, Business Card +5, Other +5

Score is capped at 100. Bucket thresholds: **hot ≥65, warm ≥35–64, cold <35**.

`effective_score` = `manual_score` if set, otherwise `auto_score`. Recompute `auto_score` server-side any time timeline/has_agent/source change (currently done client-side on every lead update — move this to a DB trigger or API-layer function so it can't drift).

### Follow-up cadence (derived, not stored)
```
next_touch_due = (most recent interaction.created_at, or lead.created_at if none)
                 + cadence_days[bucket(effective_score)]
cadence_days = { hot: 1, warm: 7, cold: 30 }  (in days)
```
Status: `overdue` if due date is in the past, `today` if due within 24h, else `upcoming`. Excluded entirely once `stage` is `Closed` or `Lost`.

Recommend computing this in a query/view rather than storing it, exactly as the prototype does — it should always reflect current score + latest interaction with no sync risk.

### Manual reordering
`sort_order` is only meaningful *within* a (agent_id, stage) or (agent_id, source) group. On drag-drop, reassign sequential integers to every lead in the affected group — see prototype's `reorderAndMove()` for exact logic to port.

### Commission
`net = deal_value * (agent.commission_split / 100)`, summed separately for leads in `Under Contract` (pending) vs `Closed` (earned).

### Duplicate detection (agent-facing only)
Before inserting a lead from the **Quick Add** flow, check for an existing lead owned by the same agent with a matching `phone` or `email` (trimmed, case-insensitive, empty values never match). If found, the frontend shows "View existing" / "Add as new anyway" instead of silently creating a duplicate.

**This check must not run for kiosk sign-ins.** A client at the sign-in tablet should never see a "this might already exist" prompt — it's confusing and exposes backend data-quality mechanics to someone who isn't the agent. Recommended backend approach: still run the check server-side on kiosk inserts (cheap, useful data), but store the result as a nullable `possible_duplicate_of` FK on the new lead row for the agent to review later, rather than blocking or prompting at capture time.

Consider a real fuzzy-match strategy later (phone normalization stripping formatting, email lowercasing is already assumed above) rather than exact string match.

### Soft delete + undo
The frontend currently does an "optimistic hard delete with a 6-second undo window held in memory." That's fine for a single-browser prototype, but memory-held undo doesn't survive a page refresh or a second device. **Recommend implementing this as a real soft delete on the backend:** add a `deleted_at` timestamp column to `leads`; delete = set `deleted_at = now()`; all normal queries filter `WHERE deleted_at IS NULL`; undo = set `deleted_at = NULL` again. This also gives you a permanent recovery window (e.g., purge after 30 days) instead of losing the lead the moment the browser tab closes.

### CSV export
Currently a client-side-only export (browser generates and downloads the CSV directly from in-memory state — no backend involved). This can stay client-side against the API's list endpoint, or move to a dedicated `/export` endpoint later if lead volume grows large enough that client-side generation gets slow.

---

## 5. Auth & multi-tenancy

- Single Supabase auth user per agent for now.
- Every table with agent-owned data needs `agent_id` and a row-level security policy: `agent_id = auth.uid()`.
- Design the schema now assuming a future `brokerages` table and an `agents.brokerage_id` FK, plus a `role` column (`agent` | `admin`) — don't build the admin rollup UI yet, but don't paint the schema into a corner either.
- **Kiosk mode is a security boundary, not just a UI state.** The frontend previously had a bug where kiosk sign-ins navigated back to the authenticated dashboard after submission — this has been fixed client-side, but when this moves to a real backend with real auth, treat the kiosk route as fully unauthenticated (it should be able to INSERT a new lead via a restricted, write-only API path/policy, with zero read access to any other agent data) rather than relying on frontend state to keep it locked down.

---

## 6. Feature inventory (what must survive the migration)

- [ ] Open House kiosk: locked, no-nav client-facing sign-in, light theme, QR placeholder, "Thanks — you're all set!" confirmation on submit, resets for the next visitor without ever navigating to the agent dashboard
- [ ] Quick Add form (agent-facing), with duplicate detection ("View existing" / "Add as new anyway")
- [ ] Pipeline board (group by stage), drag to reorder/move, numbered stage columns
- [ ] By Type board (group by source)
- [ ] Follow-ups list (sorted by next_touch_due, overdue flagged)
- [ ] Overview stats (counts by bucket, overdue count, by-source breakdown, count-up animation, CSV export)
- [ ] Lead detail panel: view/edit all fields, score override + reset, stage change, interaction log, template insert, tap-to-call/text/email links, delete with confirm + undo toast
- [ ] Search (name/phone/email) + hot/warm/cold filter, shared across Pipeline/By Type/Follow-ups
- [ ] Tasks (simple todo, unrelated to leads)
- [ ] Templates (CRUD, `{name}` placeholder)
- [ ] Commission tab (pending vs earned, per-deal breakdown)
- [ ] Settings (name, brokerage, commission split)
- [ ] Toast system: brief "Saved" confirmation on deliberate saves (not on every micro-change), undo-capable delete toasts
- [ ] Loading skeletons on initial data fetch
- [ ] Splash screen, persistent brand mark, all current visual design (dark modernist theme, light kiosk theme)

---

## 7. Suggested build order in Claude Code

1. Supabase project + schema above (including `deleted_at` on `leads`) + RLS policies
2. Auth (even just email/password for one user to start)
3. Wire the existing React components to Supabase client instead of `window.storage` — component structure and styling should need minimal change
4. Move scoring/cadence calculation server-side (or into a shared query) so it's not duplicated client-side
5. Implement soft-delete + undo against the real `deleted_at` column, replacing the in-memory version
6. Implement server-side duplicate detection on kiosk inserts (flag-only, no client prompt) and keep the blocking client-side check for Quick Add
7. Deploy, add PWA manifest, test "Add to Home Screen" on your phone
8. Only after that's solid: revisit brokerage/multi-agent features
