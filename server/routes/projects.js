'use strict'

const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')

const db = require('../db')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

// All routes require auth + admin role (D-19)
router.use(requireAuth, requireRole('admin'))

// ── Storage engine: disk, per-project subdirectory (D-12) ────────────────────
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const dir = path.join(__dirname, '../data/uploads', String(req.params.id))
    fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename(_req, file, cb) {
    // Prefix with timestamp to avoid collisions on re-uploads of same filename
    const unique = Date.now() + '-' + file.originalname.replace(/\s+/g, '_')
    cb(null, unique)
  },
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

// ── POST /api/projects — create project (D-18, PROJ-01) ─────────────────────
router.post('/', (req, res) => {
  const { name, description = '' } = req.body
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required.' })
  }
  const result = db.prepare(
    'INSERT INTO projects (owner_id, name, description) VALUES (?, ?, ?)'
  ).run(req.user.id, name.trim(), description.trim())

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json(project)
})

// ── GET /api/projects — list all projects with fragment count (D-18, PROJ-04) ─
router.get('/', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.*, COUNT(f.id) AS fragment_count
    FROM projects p
    LEFT JOIN fragments f ON f.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `).all()
  return res.json(projects)
})

// ── GET /api/projects/:id — project + its fragments (D-18, PROJ-04) ─────────
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found.' })

  const fragments = db.prepare(
    'SELECT * FROM fragments WHERE project_id = ? ORDER BY created_at ASC'
  ).all(req.params.id)

  // Parse metadata JSON for each fragment
  const fragsWithMeta = fragments.map(f => ({
    ...f,
    metadata: (() => { try { return JSON.parse(f.metadata) } catch { return {} } })(),
  }))

  // Fetch published attempts with submitter username for Phase 3 attempts list (D-07)
  const attempts = db.prepare(`
    SELECT a.id, a.status, a.submitted_at, u.email AS submitter_email
    FROM attempts a
    JOIN users u ON u.id = a.user_id
    WHERE a.project_id = ? AND a.status IN ('published', 'approved', 'rejected')
    ORDER BY a.submitted_at DESC
  `).all(req.params.id)

  return res.json({ ...project, fragments: fragsWithMeta, attempts })
})

// ── POST /api/projects/:id/fragments — upload fragment (D-18, PROJ-02) ──────
router.post('/:id/fragments', upload.single('file'), (req, res) => {
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  if (project.status === 'closed') {
    return res.status(409).json({ error: 'Cannot upload fragments to a closed project.' })
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' })

  // storage_path relative to server root for serving later
  const storagePath = path.relative(
    path.join(__dirname, '..'),
    req.file.path
  ).replace(/\\/g, '/')

  const result = db.prepare(
    'INSERT INTO fragments (project_id, filename, storage_path) VALUES (?, ?, ?)'
  ).run(Number(req.params.id), req.file.originalname, storagePath)

  const fragment = db.prepare('SELECT * FROM fragments WHERE id = ?').get(result.lastInsertRowid)
  return res.status(201).json({
    ...fragment,
    metadata: {},
  })
})

// ── PATCH /api/projects/:id/layout — save fragment positions (D-18, PROJ-03) ─
router.patch('/:id/layout', (req, res) => {
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  if (project.status === 'closed') {
    return res.status(409).json({ error: 'Cannot update layout of a closed project.' })
  }

  const { fragments } = req.body
  if (!Array.isArray(fragments)) {
    return res.status(400).json({ error: 'fragments must be an array.' })
  }

  // Update each fragment's metadata in a transaction (synchronous better-sqlite3)
  const updateStmt = db.prepare(
    'UPDATE fragments SET metadata = ? WHERE id = ? AND project_id = ?'
  )
  const updateAll = db.transaction((items) => {
    for (const item of items) {
      if (!item.id || !item.metadata) continue
      updateStmt.run(JSON.stringify(item.metadata), item.id, Number(req.params.id))
    }
  })
  updateAll(fragments)

  return res.json({ ok: true })
})

// ── POST /api/projects/:id/close — close project (D-18, D-09, PROJ-05) ─────
router.post('/:id/close', (req, res) => {
  const project = db.prepare('SELECT id, status FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found.' })
  if (project.status === 'closed') {
    return res.status(409).json({ error: 'Project is already closed.' })
  }

  const closedAt = new Date().toISOString()
  db.prepare(
    "UPDATE projects SET status = 'closed', closed_at = ? WHERE id = ?"
  ).run(closedAt, Number(req.params.id))

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  return res.json(updated)
})

module.exports = router
