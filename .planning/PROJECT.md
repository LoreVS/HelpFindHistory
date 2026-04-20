# Puzzle Forge

**What This Is:** A React + Vite web app that lets users drag-and-drop photos of physical puzzle fragments, automatically removes their backgrounds, and displays them on an interactive canvas where matching edges are highlighted.

**Core Value:** Help users digitally organize and match physical puzzle pieces by visually identifying compatible edges.

**Who It's For:** Puzzle enthusiasts who want to digitally catalog and match physical puzzle fragments.

## Tech Stack

- React + Vite (frontend)
- react-konva (interactive canvas)
- Zustand (state management)
- Canvas API (background removal via flood-fill)
- `@imgly/background-removal` (installed but not used)

## Current Milestone: v1.1 Auth & Collaboration

**Goal:** Transform Puzzle Forge into a multi-user platform where archaeologists manage fragment reconstruction projects and collaborators attempt to reconstruct objects, earning points for correct submissions.

**Target features:**
- Email + password auth; app fully locked behind login
- Role system — Admin (archaeologist) vs User (contributor)
- Project management — Admin creates/saves projects with fragment photos
- Collaboration — Users join projects, attempt reconstruction on canvas, publish attempts
- Approval + scoring — Admin approves correct attempts; users earn points

## Active Requirements

*(Being defined — see REQUIREMENTS.md)*

## Validated Requirements

- CORE-01: User can upload puzzle fragment photos via drag-and-drop
- CORE-02: App removes image background automatically
- CORE-03: User can drag, scale, and rotate fragments on canvas
- CORE-04: Selecting a fragment highlights matching edges on other fragments
- CORE-05: Contour segments extracted and normalized for shape comparison

## Out of Scope

- AI/ML-based background removal (using canvas flood-fill instead)
- Server-side storage (client-only for now)

## Key Decisions

- Used canvas flood-fill over `@imgly/background-removal` to avoid slow pre-bundling
- Contour coordinates stored in original pixels; scaled at render time
- Adaptive match threshold: globalBest × 2.2, max 0.55

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
_Last updated: 2026-04-20_
