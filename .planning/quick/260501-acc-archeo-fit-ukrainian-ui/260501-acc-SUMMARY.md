---
quick_id: 260501-acc
slug: archeo-fit-ukrainian-ui
completed: 2026-05-01
tasks_completed: 8
tasks_total: 8
files_modified: 8
key_files:
  modified:
    - puzzle-fragments/index.html
    - puzzle-fragments/src/App.jsx
    - puzzle-fragments/src/pages/LoginPage.jsx
    - puzzle-fragments/src/pages/RegisterPage.jsx
    - puzzle-fragments/src/pages/ProjectsPage.jsx
    - puzzle-fragments/src/pages/ProjectDetailPage.jsx
    - puzzle-fragments/src/components/ProjectDropzone.jsx
    - puzzle-fragments/src/components/FragmentCanvas.jsx
decisions:
  - Used uaPlural(n, one, few, many) helper in ProjectsPage and ProjectDetailPage for correct Ukrainian grammatical number agreement
  - Apostrophe in "обов'язкові" escaped with backslash inside JS single-quoted string
---

# Quick Task 260501-acc: Rename to Archeo-FIT + Ukrainian UI — Summary

**One-liner:** Renamed app from "PUZZLE FORGE" to "ARCHEO-FIT" and translated all user-visible English strings to Ukrainian across all 8 source files, including Ukrainian grammatical pluralization for fragment and attempt counts.

## Tasks Completed

| Task | File | Commit |
|------|------|--------|
| 1 | puzzle-fragments/index.html | 358771f |
| 2 | puzzle-fragments/src/App.jsx | 9060f6e |
| 3 | puzzle-fragments/src/pages/LoginPage.jsx | 87ec423 |
| 4 | puzzle-fragments/src/pages/RegisterPage.jsx | fed2085 |
| 5 | puzzle-fragments/src/pages/ProjectsPage.jsx | 73ee9cf |
| 6 | puzzle-fragments/src/pages/ProjectDetailPage.jsx | 3f63e21 |
| 7 | puzzle-fragments/src/components/ProjectDropzone.jsx | a52e6e6 |
| 8 | puzzle-fragments/src/components/FragmentCanvas.jsx | 3aab618 |

## Changes Summary

### Task 1 — index.html
- `<html lang="en">` → `<html lang="uk">`
- `<title>puzzle-fragments</title>` → `<title>Archeo-FIT</title>`

### Task 2 — App.jsx
- `"PUZZLE FORGE"` → `"ARCHEO-FIT"`
- `"END SESSION"` → `"ЗАВЕРШИТИ СЕСІЮ"`

### Task 3 — LoginPage.jsx
- Brand name, heading, labels, button states, nav link, and all error messages translated

### Task 4 — RegisterPage.jsx
- Brand name, heading, labels, button states, nav link, and all error messages translated

### Task 5 — ProjectsPage.jsx
- Added `uaPlural(n, one, few, many)` helper for Ukrainian grammatical number
- Brand name, header button, admin badge, titles, form labels, placeholders, button states, loading/empty messages, attempt status label, and finished section title translated
- Fragment/attempt counts use `uaPlural` (уламок/уламки/уламків, спроба/спроби/спроб)

### Task 6 — ProjectDetailPage.jsx
- Added `uaPlural` helper
- Back button, loading/error states, canvas toolbar title with uaPlural, hints toggle button and title, all save/close/publish button states, read-only label, empty canvas messages, solver attribution, attempts section title and empty state, table headers, row actions, modal titles and bodies, confirm/cancel buttons all translated
- `window.confirm` message translated
- `saveMsg` error prefix for publish failure translated

### Task 7 — ProjectDropzone.jsx
- `"Project closed — uploads disabled"` → `"Проєкт закрито — завантаження вимкнено"`

### Task 8 — FragmentCanvas.jsx
- Hints toggle button labels and title attributes translated to Ukrainian

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

All 8 files verified modified. All 8 commits present in git log.
