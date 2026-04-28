---
status: partial
phase: 04-collaboration
source: [04-VERIFICATION.md]
started: 2026-04-28T00:00:00Z
updated: 2026-04-28T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. COLLAB-01 — User sees only open projects in the list
expected: Logged-in user sees only open projects on /projects; no closed projects in card grid; no "New Project" button visible

result: [pending]

### 2. COLLAB-02 — User opens project, sees draggable canvas, admin controls absent
expected: User clicks open project card → fragment canvas is visible with all fragments, draggable and rotatable; no upload sidebar; no Save Layout / Close Project buttons; Save Attempt and Publish Attempt buttons visible in toolbar

result: [pending]

### 3. COLLAB-03 — Save → navigate away → return → draft layout preserved
expected: User drags fragments, clicks Save Attempt → "Attempt saved." feedback; navigate away and return → fragments appear at saved positions (not default)

result: [pending]

### 4. COLLAB-04 — Two-click publish flow; Publish button removed from DOM after success
expected: Clicking Publish Attempt opens confirmation modal with "Publish now" / "Keep editing" buttons; "Keep editing" closes modal with no action; confirming shows "Attempt published." and removes Publish Attempt button from toolbar

result: [pending]

### 5. COLLAB-05 — Closed project shows approved layout, solver attribution, read-only canvas
expected: User views a closed project → canvas shows approved arrangement; "SOLVED BY: {email}" appears below canvas; "READ-ONLY · Approved Solution" label in toolbar; fragments cannot be dragged or rotated; Transformer does not appear

result: [pending]

### 6. Admin view unchanged
expected: Admin views open project → upload sidebar visible; Save Layout and Close Project buttons present; Submitted Attempts table visible; no Save Attempt / Publish Attempt buttons

result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
