# Phase 5: Scoring - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin reviews published attempts for each project, approves or rejects them via a modal interface. Approving an attempt auto-closes the project and awards the project's configured reward amount to the submitter. Users see their accumulated balance in the site header. Rejected attempts unlock the user's canvas so they can revise and resubmit.

No new routes. No leaderboard. No real-time notifications. Scoring is approval-triggered only.

</domain>

<decisions>
## Implementation Decisions

### Variable Reward System (replaces flat 1-point model)
- **D-01:** Each project has a configurable **reward amount** set by admin at creation time. This requires a `reward INTEGER NOT NULL DEFAULT 1` column on the `projects` table (schema migration needed).
- **D-02:** The `reward` field is entered in the **New Project form** on ProjectsPage, alongside name and description. Input type: number, minimum 1.
- **D-03:** When an attempt is approved, the user receives `project.reward` points (not a flat 1). The `scores` table already has a `points` column — use `project.reward` as the value instead of hardcoded 1. Also increment `users.score` by `project.reward`.

### Attempt Review Modal (canvas preview)
- **D-04:** When admin clicks an attempt row, the modal renders a **full read-only Konva canvas** showing the user's submitted fragment arrangement. Reuse the existing `ProjectCanvas` component with `draggable={false}` / `readOnly` prop — same pattern used for the closed project canvas view (COLLAB-05).
- **D-05:** The canvas loads the **project's actual fragment images** from `server/data/uploads/{projectId}/` and positions them according to the attempt's `layout` JSON. Admin sees the real reconstruction, not placeholders.
- **D-06:** The attempt's `layout` JSON is already returned by `GET /api/projects/:id` in the `attempts` array. No new backend read endpoint needed — the data is already there.

### Approve Confirmation
- **D-07:** Clicking the Approve button in the AttemptRow modal spawns a **separate confirmation modal** (a second overlay). The confirmation shows: "Approve this attempt? This will close the project and award $X to [submitter email]." Buttons: **Confirm Approve** / **Cancel**.
- **D-08:** Reject does NOT require a confirmation — rejection is reversible (canvas unlocks). Clicking Reject acts immediately and closes the modal.

### Rejected Attempt Resubmission
- **D-09:** Rejection is **not terminal**. When admin rejects a published attempt:
  - Backend: set `attempts.status = 'rejected'` and set `reviewed_at`.
  - The attempt status transitions to `rejected` — which the frontend treats as editable (canvas controls re-enable, Save Attempt and Publish Attempt buttons reappear).
  - No backend `rejected→draft` transition needed: the frontend re-enables editing whenever `attempt.status === 'rejected'`. Save/Publish actions use the existing upsert/publish routes.
- **D-10:** No extra messaging beyond the **status badge**. The `attempt-status--rejected` badge (already styled from Phase 4) is sufficient feedback. No inline warning, no toast.

### Balance Display (header chip)
- **D-11:** A balance chip displays in the site header for **role=user only**. Admins do not see it (they don't earn points). Format: `★ $12` or similar — exact wording/icon is Claude's discretion.
- **D-12:** The balance is fetched from the authenticated user's data. Two options to supply it: (a) add `score` to the JWT payload (would require re-login on score change) or (b) fetch from a lightweight `GET /api/users/me` endpoint on app boot (recommended — always fresh). Claude's discretion on implementation approach, but the balance must be live (not stale after approval).

### Auto-Close on Approval
- **D-13:** Approving an attempt simultaneously: sets `attempts.status = 'approved'`, sets `projects.status = 'closed'`, inserts a row in `scores`, and increments `users.score`. All four writes must happen in a single `db.transaction()` (same pattern as existing layout PATCH).
- **D-14:** The existing manual "Close Project" button on `/projects/:id` remains intact (D-09 from Phase 3). Auto-close via approval is additive — both paths lead to `status = 'closed'`.

### Claude's Discretion
- Exact header chip icon/label (star, coin, "$", "pts" — any legible symbol that fits the dark industrial aesthetic)
- Whether to fetch user score via JWT re-issue or a dedicated `/api/users/me` endpoint
- Exact CSS class names for the confirmation modal (match existing `.attempt-modal` pattern)
- Attempt modal canvas dimensions within the modal — fit within the existing modal width

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database Schema
- `server/schema.sql` — `attempts` (status enum: draft/published/approved/rejected), `scores` (user_id, attempt_id, project_id, points, awarded_at), `users.score` cumulative column. **Note: `projects` table needs `reward` column added.**

### Backend Routes
- `server/routes/attempts.js` — existing attempt routes (POST upsert draft, POST publish); approve/reject endpoints to be added here
- `server/routes/projects.js` — existing project routes; `GET /api/projects/:id` already returns `attempts` array with `layout`, `submitter_email`, `status`; POST create needs `reward` field
- `server/middleware/auth.js` — `requireAuth`, `requireRole('admin')` — use for approve/reject endpoints
- `server/db.js` — better-sqlite3 (synchronous); use `db.transaction()` for the 4-write approve operation

### Frontend
- `puzzle-fragments/src/pages/ProjectDetailPage.jsx` — `AttemptRow` component (lines ~617–680): has `btn-approve`, `btn-reject` stubs and `[Canvas preview will be shown here in Phase 5]` placeholder; `ProjectCanvas` (inline, ~line 121) with `readOnly` prop pattern from COLLAB-05
- `puzzle-fragments/src/pages/ProjectsPage.jsx` — New Project form (name + description); needs `reward` number input added
- `puzzle-fragments/src/store/useProjectStore.js` — add `approveAttempt(attemptId)` and `rejectAttempt(attemptId)` actions following authHeaders() pattern
- `puzzle-fragments/src/store/authStore.js` — `authHeaders()` for API calls; user object shape for score field
- `puzzle-fragments/src/hooks/useRole.js` — role gating (role==='admin' pattern)

### Requirements
- `.planning/REQUIREMENTS.md` — SCORE-01 through SCORE-05 acceptance criteria
- `.planning/ROADMAP.md` — Phase 5 success criteria

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AttemptRow` (ProjectDetailPage.jsx ~617): Modal skeleton already built with `btn-approve`, `btn-reject`, and canvas placeholder — Phase 5 fills in the stubs
- `ProjectCanvas` (ProjectDetailPage.jsx ~121): Read-only canvas pattern already established for closed projects (COLLAB-05); reuse with `readOnly` prop for the review modal canvas
- `toCanvasFragment()` helper (ProjectDetailPage.jsx ~24): Converts server fragment row to canvas shape — reuse for loading attempt layout in review modal
- `authHeaders()` (authStore.js): Reuse for all new API calls (approve, reject, fetch score)
- `useRole()` hook: Already imported in ProjectDetailPage; use to gate Approve/Reject visibility to admin only

### Established Patterns
- **db.transaction() for multi-write operations**: existing layout PATCH uses this — approval (4 writes) must follow same pattern
- **Role-conditional rendering**: `{role === 'admin' && <AdminControl />}` — use for approve/reject buttons, hide from users
- **Status badge CSS**: `.attempt-status--{status}` classes already styled — `attempt-status--rejected` already exists from Phase 4
- **Plain CSS, dark industrial aesthetic**: match `.attempt-modal`, `.btn-approve`, `.btn-reject` classes already defined

### Integration Points
- `AttemptRow` modal: replace console.log stubs with real approveAttempt/rejectAttempt store actions + confirmation modal
- `ProjectsPage.jsx` New Project form: add `reward` number input, include in POST /api/projects body
- App header (in `App.jsx`): add score chip conditionally for `role === 'user'`
- `server/routes/projects.js` POST /api/projects: accept and store `reward` field
- `server/routes/attempts.js` or new `server/routes/scoring.js`: add POST /api/attempts/:id/approve and POST /api/attempts/:id/reject

</code_context>

<specifics>
## Specific Ideas

- Confirmation modal text: "Approve this attempt? This will close the project and award $[reward] to [submitter_email]." with **Confirm Approve** and **Cancel** buttons.
- The review modal canvas should be read-only — no drag, no rotate, no Transformer. Same readOnly mechanism used for closed project canvas (COLLAB-05).
- `db.transaction()` for approve: (1) UPDATE attempts SET status='approved', reviewed_at=NOW(); (2) UPDATE projects SET status='closed', closed_at=NOW(); (3) INSERT INTO scores (user_id, attempt_id, project_id, points) VALUES (attempt.user_id, attempt.id, attempt.project_id, project.reward); (4) UPDATE users SET score = score + project.reward WHERE id = attempt.user_id.
- Rejected attempt frontend re-enable: if `attempt.status === 'rejected'`, treat canvas as editable — same branch as `draft` status. The status badge already shows 'rejected' so no further UI change needed.

</specifics>

<deferred>
## Deferred Ideas

- Leaderboard (ranked by score) — explicitly in REQUIREMENTS.md v2 scope (LEAD-01, LEAD-02)
- Notifications (user notified when attempt approved/rejected) — REQUIREMENTS.md v2 scope (NOTF-01, NOTF-02)
- Admin seeing attempt history per user (across all projects) — v2
- Multiple approval levels or partial scoring — out of scope for v1.1
- Dollar/currency formatting beyond display symbol — no actual payment processing, purely a points metaphor

</deferred>

---

*Phase: 05-scoring*
*Context gathered: 2026-04-29*
