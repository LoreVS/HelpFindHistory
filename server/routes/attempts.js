'use strict'

const express = require('express')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// All attempt routes require authentication — no admin role needed
router.use(requireAuth)

// ── GET /api/projects/:id/attempts/me — fetch current user's attempt (any status) ──
router.get('/projects/:id/attempts/me', (req, res) => {
  const attempt = db.prepare(
    'SELECT * FROM attempts WHERE project_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1'
  ).get(Number(req.params.id), req.user.id)
  if (!attempt) return res.status(404).json({ error: 'No attempt found.' })
  return res.json({
    ...attempt,
    layout: (() => { try { return JSON.parse(attempt.layout) } catch { return [] } })(),
  })
})

// ── POST /api/projects/:id/attempts — upsert draft layout ────────────────────
// T-04-03: scoped by project_id AND user_id to prevent cross-project injection
router.post('/projects/:id/attempts', (req, res) => {
  const projectId = Number(req.params.id)
  const userId = req.user.id
  const { layout } = req.body

  if (!layout || (typeof layout !== 'object' && !Array.isArray(layout))) {
    return res.status(400).json({ error: 'layout is required and must be an array or object.' })
  }

  // Validate project exists and is open
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(projectId)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  if (project.status === 'closed') {
    return res.status(409).json({ error: 'Cannot save attempt on a closed project.' })
  }

  const upsert = db.transaction(() => {
    // Block new drafts if user already has a published/approved attempt
    const locked = db.prepare(
      "SELECT id FROM attempts WHERE project_id = ? AND user_id = ? AND status IN ('published', 'approved')"
    ).get(projectId, userId)
    if (locked) return null

    const existing = db.prepare(
      "SELECT id FROM attempts WHERE project_id = ? AND user_id = ? AND status = 'draft'"
    ).get(projectId, userId)

    if (existing) {
      db.prepare("UPDATE attempts SET layout = ? WHERE id = ?")
        .run(JSON.stringify(layout), existing.id)
      return db.prepare('SELECT * FROM attempts WHERE id = ?').get(existing.id)
    } else {
      const result = db.prepare(
        'INSERT INTO attempts (project_id, user_id, layout, status) VALUES (?, ?, ?, ?)'
      ).run(projectId, userId, JSON.stringify(layout), 'draft')
      return db.prepare('SELECT * FROM attempts WHERE id = ?').get(result.lastInsertRowid)
    }
  })

  const attempt = upsert()
  if (!attempt) return res.status(409).json({ error: 'You have already published an attempt for this project.' })
  return res.json(attempt)
})

// ── POST /api/attempts/:id/publish — lock attempt as published ───────────────
// T-04-01: IDOR guard — verifies attempt.user_id === req.user.id before transition
router.post('/attempts/:id/publish', (req, res) => {
  const attempt = db.prepare('SELECT * FROM attempts WHERE id = ?').get(Number(req.params.id))
  if (!attempt) return res.status(404).json({ error: 'Attempt not found.' })
  if (attempt.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden.' })
  if (attempt.status !== 'draft') return res.status(409).json({ error: 'Only draft attempts can be published.' })

  const submittedAt = new Date().toISOString()
  db.prepare("UPDATE attempts SET status = 'published', submitted_at = ? WHERE id = ?")
    .run(submittedAt, Number(req.params.id))

  const updated = db.prepare('SELECT * FROM attempts WHERE id = ?').get(Number(req.params.id))
  return res.json(updated)
})

module.exports = router
