# Phase 5: Scoring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 5-scoring
**Areas discussed:** Canvas preview in review modal, Rejected attempt resubmission, Score display location, Approve confirmation UX

---

## Canvas preview in review modal

| Option | Description | Selected |
|--------|-------------|----------|
| Full Konva canvas | Load and render attempt layout JSON as a live react-konva canvas (read-only) | ✓ |
| Static image/thumbnail only | Flattened screenshot or simplified visual without live canvas | |
| No visual preview | Modal shows metadata only — no canvas rendering | |

**User's choice:** Full Konva canvas (read-only)
**Notes:** Renders project's actual fragment images positioned per the attempt's layout JSON. Admin sees the real reconstruction.

### Fragment source

| Option | Description | Selected |
|--------|-------------|----------|
| Project's original fragment images | Load actual photos from server/data/uploads/ and position per layout JSON | ✓ |
| Placeholder shapes only | Colored rectangles without images | |

**User's choice:** Project's original fragment images

---

## Rejected attempt resubmission

| Option | Description | Selected |
|--------|-------------|----------|
| Rejection is terminal | Locked read-only, no retry | |
| Canvas unlocks — user can resubmit | Rejected attempt returns to editable state | ✓ |

**User's choice:** Canvas unlocks — user can resubmit

### Rejection feedback messaging

| Option | Description | Selected |
|--------|-------------|----------|
| Status badge + inline message on canvas toolbar | Message above Save/Publish buttons | |
| Redirect with toast | Toast/banner on project page | |
| Just the status badge | Existing rejection badge is sufficient | ✓ |

**User's choice:** Just the status badge
**Notes:** No additional messaging beyond the existing `attempt-status--rejected` badge.

---

## Score display location

| Option | Description | Selected |
|--------|-------------|----------|
| Nav/header chip | Small score chip in header visible on every page | |
| My Finished Projects section only | Score alongside existing finished projects list | |
| Both nav chip + finished projects section | Score in header everywhere + repeated on projects list | |

**User's choice:** (Custom) — User introduced a different model: admin sets reward ($) per project at creation time; user receives that reward amount on approval; balance shown in header for role=user only.

**Notes:** This changes from flat 1-point scoring to variable reward-per-project. Requires `reward` column on `projects` table. New Project form gets a reward number input. Header shows balance chip (e.g., "★ $12") for regular users only — admin does not see it.

---

## Approve confirmation UX

| Option | Description | Selected |
|--------|-------------|----------|
| Inline confirmation inside modal | Confirmation state change within existing modal | |
| Approve immediately — no confirmation | One click approves, no guard | |
| Separate confirmation modal | Approve button spawns a second dialog | ✓ |

**User's choice:** Separate confirmation modal
**Notes:** Confirmation shows submitter email and reward amount. Reject acts immediately without confirmation (reversible action).

---

## Claude's Discretion

- Exact header chip icon/label (star, coin, "$", "pts")
- Whether to fetch user score via JWT re-issue or dedicated `/api/users/me` endpoint
- CSS class names for confirmation modal (match existing `.attempt-modal` pattern)
- Attempt modal canvas dimensions

## Deferred Ideas

- Leaderboard (LEAD-01, LEAD-02) — v2
- Notifications on approval/rejection (NOTF-01, NOTF-02) — v2
- Attempt history per user across all projects — v2
- Partial scoring / multiple approval levels — out of scope
