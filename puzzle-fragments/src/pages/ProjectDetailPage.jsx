import { useRef, useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Stage, Layer, Group,
  Image as KonvaImage, Line, Transformer,
} from 'react-konva'
import useProjectStore from '../store/useProjectStore'
import useAuthStore from '../store/authStore'
import { useRole } from '../hooks/useRole'
import { matchContourSegments } from '../utils/contourAnalysis'
import ProjectDropzone from '../components/ProjectDropzone'
import './ProjectDetailPage.css'

const SERVER = 'http://localhost:3001'

/** Convert DB storage_path to a servable URL */
function toSrc(storagePath) {
  // storage_path: "data/uploads/3/1714000000-photo.png"
  // served at:    "http://localhost:3001/uploads/3/1714000000-photo.png"
  return `${SERVER}/${storagePath.replace('data/uploads/', 'uploads/')}`
}

/** Map server fragment row to canvas fragment shape */
function toCanvasFragment(serverFrag, index) {
  const meta = serverFrag.metadata || {}
  const col = index % 4
  const row = Math.floor(index / 4)
  return {
    id: String(serverFrag.id),   // Konva IDs are strings
    dbId: serverFrag.id,         // numeric DB id for layout save
    src: toSrc(serverFrag.storage_path),
    name: serverFrag.filename,
    // Dimensions: no original stored — use display defaults; canvas will load image
    originalWidth: meta.originalWidth || 320,
    originalHeight: meta.originalHeight || 320,
    width:  meta.width  || 240,
    height: meta.height || 240,
    x:        meta.x        ?? (80 + col * 220),
    y:        meta.y        ?? (60 + row * 220),
    rotation: meta.rotation ?? 0,
    scaleX:   meta.scaleX   ?? 1,
    scaleY:   meta.scaleY   ?? 1,
    segments: [],   // no contour data for server-stored fragments yet
    centroid: null,
  }
}

// ─── ProjectCanvas: Fragment canvas reading from props, not useFragmentStore ──

function FragmentNode({ fragment, isSelected, ownSegments, matchSegments, onSelect, onUpdate, readOnly = false }) {
  const [img, setImg] = useState(null)
  const groupRef      = useRef()

  useEffect(() => {
    if (!fragment.src) return
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      setImg(image)
      // Correct display dimensions from actual image to preserve aspect ratio
      const MAX = 320
      const scale = Math.min(MAX / image.naturalWidth, MAX / image.naturalHeight, 1)
      const w = Math.round(image.naturalWidth * scale)
      const h = Math.round(image.naturalHeight * scale)
      if (w !== fragment.width || h !== fragment.height) {
        onUpdate(fragment.id, {
          width: w, height: h,
          originalWidth: image.naturalWidth,
          originalHeight: image.naturalHeight,
        })
      }
    }
    image.onerror = () => console.error('[ProjectCanvas] Failed to load:', fragment.src)
    image.src = fragment.src
  }, [fragment.src]) // eslint-disable-line react-hooks/exhaustive-deps

  // Derive display dimensions from loaded image to preserve aspect ratio before state syncs
  const MAX_DISPLAY = 320
  const displayW = img
    ? Math.round(img.naturalWidth  * Math.min(MAX_DISPLAY / img.naturalWidth,  MAX_DISPLAY / img.naturalHeight, 1))
    : fragment.width
  const displayH = img
    ? Math.round(img.naturalHeight * Math.min(MAX_DISPLAY / img.naturalWidth,  MAX_DISPLAY / img.naturalHeight, 1))
    : fragment.height

  const sx = fragment.originalWidth  ? displayW / fragment.originalWidth  : 1
  const sy = fragment.originalHeight ? displayH / fragment.originalHeight : 1
  const ox = displayW / 2
  const oy = displayH / 2

  const toLocal = (points) => points.flatMap(p => [p.x * sx - ox, p.y * sy - oy])
  const activeSegments = isSelected ? ownSegments : matchSegments

  return (
    <Group
      ref={groupRef}
      id={fragment.id}
      x={fragment.x}
      y={fragment.y}
      rotation={fragment.rotation}
      scaleX={fragment.scaleX}
      scaleY={fragment.scaleY}
      draggable={!readOnly}
      onClick={readOnly ? undefined : () => onSelect(fragment.id)}
      onTap={readOnly ? undefined : () => onSelect(fragment.id)}
      onDragEnd={readOnly ? undefined : (e) => onUpdate(fragment.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={readOnly ? undefined : () => {
        const node = groupRef.current
        if (!node) return
        onUpdate(fragment.id, {
          x: node.x(), y: node.y(),
          rotation: node.rotation(),
          scaleX: node.scaleX(), scaleY: node.scaleY(),
        })
      }}
    >
      {img && (
        <KonvaImage
          image={img}
          x={-ox} y={-oy}
          width={displayW} height={displayH}
          opacity={isSelected ? 0.82 : 1}
        />
      )}
      {activeSegments.map((seg) => {
        const pts = toLocal(seg.points)
        if (pts.length < 4) return null
        return (
          <Line
            key={seg.index}
            points={pts}
            stroke={seg.color}
            strokeWidth={isSelected ? 3 : 4.5}
            lineCap="round" lineJoin="round"
            shadowColor={seg.color} shadowBlur={isSelected ? 6 : 16}
            shadowOpacity={1} listening={false}
          />
        )
      })}
    </Group>
  )
}

function ProjectCanvas({ fragments, onFragmentUpdate, readOnly = false, emptyMessage = 'No fragments.' }) {
  const containerRef = useRef(null)
  const stageRef     = useRef(null)
  const trRef        = useRef(null)

  const [dimensions, setDimensions] = useState({ width: 800, height: 500 })
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!trRef.current || !stageRef.current) return
    if (selectedId) {
      const node = stageRef.current.findOne(`#${selectedId}`)
      if (node) { trRef.current.nodes([node]); trRef.current.getLayer().batchDraw() }
    } else {
      trRef.current.nodes([])
      trRef.current.getLayer()?.batchDraw()
    }
  }, [selectedId, fragments])

  const segmentMatches = useMemo(() => {
    if (!selectedId) return {}
    const sel = fragments.find(f => f.id === selectedId)
    if (!sel?.segments?.length) return {}
    return matchContourSegments(sel, fragments)
  }, [selectedId, fragments])

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) setSelectedId(null)
  }

  return (
    <div ref={containerRef} className="canvas-wrap">
      {fragments.length === 0 && (
        <div className="canvas-empty">
          <span>{emptyMessage}</span>
        </div>
      )}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleStageClick}
        onTouchStart={handleStageClick}
      >
        <Layer>
          {fragments.map((fragment) => {
            const isSelected = fragment.id === selectedId
            const ownSegments = isSelected ? (fragment.segments ?? []) : []
            const matchSegs = (!isSelected && selectedId)
              ? (segmentMatches[fragment.id] ?? []).map(m => {
                  const seg = fragment.segments?.find(s => s.index === m.otherSegIndex)
                  return seg ? { ...seg, color: m.color } : null
                }).filter(Boolean)
              : []
            return (
              <FragmentNode
                key={fragment.id}
                fragment={fragment}
                isSelected={isSelected}
                ownSegments={ownSegments}
                matchSegments={matchSegs}
                onSelect={readOnly ? () => {} : setSelectedId}
                onUpdate={onFragmentUpdate}
                readOnly={readOnly}
              />
            )
          })}
          {!readOnly && (
            <Transformer
              ref={trRef}
              rotateEnabled
              enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
              borderStroke="#e8b84b" borderStrokeWidth={1.5}
              anchorStroke="#e8b84b" anchorFill="#111111"
              anchorSize={9} anchorCornerRadius={2} rotateAnchorOffset={20}
            />
          )}
        </Layer>
      </Stage>
    </div>
  )
}

// ─── ProjectDetailPage ────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const role      = useRole()
  const logout    = useAuthStore((state) => state.logout)

  const { currentProject, loading, error, fetchProject, saveLayout, closeProject,
          fetchUserDraft, saveDraft, publishAttempt, approveAttempt, rejectAttempt, fetchUserScore } = useProjectStore()
  const user = useAuthStore((state) => state.user)

  // Local canvas fragment state — hydrated from server, updated on drag/rotate
  const [canvasFragments, setCanvasFragments] = useState([])

  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [closing, setClosing] = useState(false)

  // Phase 4: user attempt state
  const [currentAttemptId, setCurrentAttemptId] = useState(null)
  const [isPublished, setIsPublished]           = useState(false)
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [publishing, setPublishing]             = useState(false)

  useEffect(() => {
    fetchProject(Number(id))
  }, [id, fetchProject])

  // Three-way canvas hydration: closed → solution; user+open → draft or reference; admin → unchanged
  useEffect(() => {
    if (!currentProject) return

    if (currentProject.status === 'closed') {
      // COLLAB-05: load approved solution layout (read-only)
      const sol = currentProject.solution
      if (sol?.layout && Array.isArray(sol.layout) && currentProject.fragments.length) {
        const mapped = currentProject.fragments.map((f, i) => {
          const pos = sol.layout.find(l => l.id === f.id)
          const base = toCanvasFragment(f, i)
          return pos ? { ...base, ...pos } : base
        })
        setCanvasFragments(mapped)
      } else {
        setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
      }
      return
    }

    if (role !== 'admin') {
      // COLLAB-02/03: fetch user draft; hydrate from draft or reference layout
      fetchUserScore()
      fetchUserDraft(currentProject.id).then((draft) => {
        if (draft?.layout && Array.isArray(draft.layout)) {
          const mapped = currentProject.fragments.map((f, i) => {
            const pos = draft.layout.find(l => l.id === f.id)
            const base = toCanvasFragment(f, i)
            return pos ? { ...base, ...pos } : base
          })
          setCanvasFragments(mapped)
          setCurrentAttemptId(draft.id)
          if (draft.status === 'published' || draft.status === 'approved') setIsPublished(true)
        } else {
          setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
        }
      })
      return
    }

    // Admin: existing behavior unchanged
    setCanvasFragments(currentProject.fragments.map((f, i) => toCanvasFragment(f, i)))
  }, [currentProject, role])

  // Called by ProjectCanvas on drag/rotate — update local state only (D-16: no auto-save)
  const handleFragmentUpdate = useCallback((fragmentId, updates) => {
    setCanvasFragments((prev) =>
      prev.map((f) => f.id === fragmentId ? { ...f, ...updates } : f)
    )
  }, [])

  // Called by ProjectDropzone after successful server upload (D-10, D-12)
  const handleFragmentUploaded = useCallback((serverFragment, localData) => {
    const newFrag = toCanvasFragment(serverFragment, canvasFragments.length)
    // Use local blob URL and actual dimensions from the processed image
    setCanvasFragments((prev) => [...prev, {
      ...newFrag,
      src: localData.src,
      originalWidth:  localData.originalWidth,
      originalHeight: localData.originalHeight,
      width:  localData.width,
      height: localData.height,
    }])
  }, [canvasFragments.length])

  // D-16: explicit Save Layout button
  async function handleSaveLayout() {
    if (!currentProject) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const updates = canvasFragments.map((f) => ({
        id: f.dbId,
        metadata: {
          x: f.x, y: f.y, rotation: f.rotation,
          scaleX: f.scaleX, scaleY: f.scaleY,
          width: f.width, height: f.height,
          originalWidth: f.originalWidth, originalHeight: f.originalHeight,
        },
      }))
      await saveLayout(currentProject.id, updates)
      setSaveMsg('Layout saved.')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setSaveMsg('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // D-09: Close Project button
  async function handleClose() {
    if (!currentProject) return
    if (!window.confirm('Close this project? It will become read-only.')) return
    setClosing(true)
    try {
      await closeProject(currentProject.id)
    } catch (err) {
      alert('Close failed: ' + err.message)
    } finally {
      setClosing(false)
    }
  }

  // COLLAB-03: Save Attempt button — upsert draft with current canvas layout
  async function handleSaveAttempt() {
    if (!currentProject) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const layoutToSave = canvasFragments.map((f) => ({
        id: f.dbId,
        x: f.x, y: f.y, rotation: f.rotation,
        scaleX: f.scaleX, scaleY: f.scaleY,
      }))
      const attempt = await saveDraft(currentProject.id, layoutToSave)
      setCurrentAttemptId(attempt.id)
      setSaveMsg('Attempt saved.')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch (err) {
      setSaveMsg('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // COLLAB-04: Publish Attempt — lock draft as published (called after confirm)
  async function handlePublishAttempt() {
    if (!currentAttemptId) return
    setPublishing(true)
    setSaveMsg(null)
    setShowPublishConfirm(false)
    try {
      await publishAttempt(currentAttemptId)
      setIsPublished(true)
      navigate('/projects')
    } catch (err) {
      setSaveMsg('Publish failed: ' + err.message)
    } finally {
      setPublishing(false)
    }
  }

  function handleEndSession() {
    logout()
    navigate('/login')
  }

  const isClosed = currentProject?.status === 'closed'

  if (loading) {
    return (
      <div className="detail-page">
        <header className="detail-header">
          <button className="btn-back" onClick={() => navigate('/projects')}>← Projects</button>
        </header>
        <p className="detail-loading">Loading project…</p>
      </div>
    )
  }

  if (error || !currentProject) {
    return (
      <div className="detail-page">
        <header className="detail-header">
          <button className="btn-back" onClick={() => navigate('/projects')}>← Projects</button>
        </header>
        <p className="detail-error">{error || 'Project not found.'}</p>
      </div>
    )
  }

  return (
    <div className="detail-page">
      {/* ── Header ── */}
      <header className="detail-header">
        <div className="detail-header-left">
          <button className="btn-back" onClick={() => navigate('/projects')} type="button">
            ← Projects
          </button>
          <h1 className="detail-title">{currentProject.name}</h1>
          <span className={`detail-status detail-status--${currentProject.status}`}>
            {currentProject.status}
          </span>
        </div>
        <div className="detail-header-right">
          {role === 'admin' && <span className="admin-badge">ADMIN</span>}
          {role === 'user' && (
            <span className="score-chip">&#9733; {user?.score ?? 0}</span>
          )}
          <button className="btn-end-session" onClick={handleEndSession} type="button">
            END SESSION
          </button>
        </div>
      </header>

      {/* ── Section 1: Canvas + sidebar (D-07, D-14, D-15) ── */}
      <div className="detail-canvas-section">
        {/* Upload sidebar (D-10) — admin only */}
        {role === 'admin' && (
          <ProjectDropzone
            projectId={currentProject.id}
            onFragmentUploaded={handleFragmentUploaded}
            disabled={isClosed}
          />
        )}

        {/* Canvas area */}
        <div className="detail-canvas-area">
          {/* Canvas header with Save Layout + Close Project (admin) / Save Attempt + Publish Attempt (user) */}
          <div className="canvas-toolbar">
            <span className="canvas-toolbar-title">
              Fragment Canvas &nbsp;·&nbsp; {canvasFragments.length} fragment{canvasFragments.length !== 1 ? 's' : ''}
            </span>
            <div className="canvas-toolbar-actions">
              {/* Admin save/close controls */}
              {role === 'admin' && (
                <>
                  {saveMsg && <span className="save-msg">{saveMsg}</span>}
                  {/* D-16: explicit Save Layout (admin only) */}
                  <button
                    className="btn-save-layout"
                    onClick={handleSaveLayout}
                    disabled={saving || isClosed}
                    type="button"
                  >
                    {saving ? 'Saving…' : 'Save Layout'}
                  </button>
                  {/* D-09: Close Project (admin only) */}
                  {!isClosed && (
                    <button
                      className="btn-close-project"
                      onClick={handleClose}
                      disabled={closing}
                      type="button"
                    >
                      {closing ? 'Closing…' : 'Close Project'}
                    </button>
                  )}
                </>
              )}
              {/* COLLAB-03/04: User attempt toolbar — save and publish (user, open projects only) */}
              {role !== 'admin' && !isClosed && (
                <>
                  {saveMsg && (
                    <span className={`save-msg${saveMsg.startsWith('Save failed') || saveMsg.startsWith('Publish failed') ? ' save-msg--error' : ''}`}>
                      {saveMsg}
                    </span>
                  )}
                  <button
                    className="btn-save-attempt"
                    onClick={handleSaveAttempt}
                    disabled={saving || isPublished}
                    type="button"
                  >
                    {saving ? 'Saving…' : 'Save Attempt'}
                  </button>
                  {!isPublished && (
                    <button
                      className="btn-publish-attempt"
                      onClick={() => setShowPublishConfirm(true)}
                      disabled={publishing}
                      type="button"
                    >
                      {publishing ? 'Publishing…' : 'Publish Attempt'}
                    </button>
                  )}
                </>
              )}
              {/* COLLAB-05: Read-only label for closed project canvas (non-admin) */}
              {isClosed && role !== 'admin' && (
                <span className="canvas-toolbar-readonly">READ-ONLY · Approved Solution</span>
              )}
            </div>
          </div>

          {/* Canvas (D-15: full drag/rotate interaction for open projects) */}
          <ProjectCanvas
            fragments={canvasFragments}
            onFragmentUpdate={handleFragmentUpdate}
            readOnly={isClosed}
            emptyMessage={
              isClosed
                ? 'No fragments in this project.'
                : role === 'admin'
                  ? 'Upload fragment photos using the panel on the left'
                  : "No fragments loaded. The archaeologist hasn't uploaded any yet."
            }
          />

          {/* COLLAB-05: D-17 Solver attribution */}
          {isClosed && currentProject.solution && (
            <div className="canvas-solver">
              SOLVED BY: <span className="canvas-solver-email">{currentProject.solution.submitter_email}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Submitted Attempts (D-07, D-08) — admin only ── */}
      {role === 'admin' && (
        <div className="detail-attempts-section">
          <h2 className="attempts-title">Submitted Attempts</h2>
          {currentProject.attempts.length === 0 ? (
            <p className="attempts-empty">No attempts submitted yet.</p>
          ) : (
            <table className="attempts-table">
              <thead>
                <tr>
                  <th>Submitter</th>
                  <th>Status</th>
                  <th>Submitted</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentProject.attempts.map((attempt) => (
                  <AttemptRow key={attempt.id} attempt={attempt} currentProject={currentProject} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* COLLAB-04: Publish confirmation modal */}
      {showPublishConfirm && (
        <div className="attempt-modal-backdrop" onClick={() => setShowPublishConfirm(false)}>
          <div className="attempt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Publish attempt?</h3>
            <p className="publish-confirm-body">
              Once published, your arrangement is locked and cannot be edited.
            </p>
            <div className="attempt-modal-actions">
              <button
                className="btn-publish-confirm"
                onClick={handlePublishAttempt}
                type="button"
              >
                Publish now
              </button>
              <button
                className="btn-modal-close"
                onClick={() => setShowPublishConfirm(false)}
                type="button"
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// D-08 fulfilled: Phase 5 AttemptRow with canvas preview and approve/reject workflow
function AttemptRow({ attempt, currentProject }) {
  const [showModal,   setShowModal]   = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [approving,   setApproving]   = useState(false)
  const [rejecting,   setRejecting]   = useState(false)
  const role = useRole()
  const { approveAttempt, rejectAttempt } = useProjectStore()
  const { fetchProject } = useProjectStore()

  // Build read-only canvas fragments from attempt.layout merged with project fragments
  // Mirrors COLLAB-05 solution canvas hydration pattern
  const previewFragments = useMemo(() => {
    if (!currentProject?.fragments || !attempt.layout) return []
    return currentProject.fragments.map((f, i) => {
      const base = toCanvasFragment(f, i)
      const pos = Array.isArray(attempt.layout)
        ? attempt.layout.find((l) => String(l.id) === String(f.id) || l.id === f.id || l.dbId === f.id)
        : null
      return pos ? { ...base, ...pos } : base
    })
  }, [currentProject, attempt.layout])

  async function handleApprove() {
    setApproving(true)
    try {
      await approveAttempt(attempt.id)
      // Re-fetch project to sync status and attempts list
      if (currentProject?.id) await fetchProject(currentProject.id)
      setShowModal(false)
    } catch (e) {
      console.error('[AttemptRow] approve failed:', e)
    } finally {
      setApproving(false)
      setShowConfirm(false)
    }
  }

  async function handleReject() {
    setRejecting(true)
    try {
      await rejectAttempt(attempt.id)
    } catch (e) {
      console.error('[AttemptRow] reject failed:', e)
    }
    setRejecting(false)
    setShowModal(false)
  }

  return (
    <>
      <tr
        className="attempt-row"
        onClick={() => setShowModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <td>{attempt.submitter_email}</td>
        <td>
          <span className={`attempt-status attempt-status--${attempt.status}`}>
            {attempt.status}
          </span>
        </td>
        <td>{attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleString() : '—'}</td>
        <td><span className="attempt-view-hint">view →</span></td>
      </tr>

      {/* Attempt review modal with canvas preview (D-04, D-05, D-06) */}
      {showModal && (
        <tr>
          <td colSpan={4}>
            <div className="attempt-modal-backdrop" onClick={() => setShowModal(false)}>
              <div
                className="attempt-modal attempt-modal--canvas"
                onClick={(e) => e.stopPropagation()}
              >
                <h3>Attempt by {attempt.submitter_email}</h3>

                {/* Read-only canvas preview — reuses ProjectCanvas with readOnly=true (D-04) */}
                <div className="attempt-modal-canvas">
                  {previewFragments.length > 0 ? (
                    <ProjectCanvas
                      fragments={previewFragments}
                      onFragmentUpdate={() => {}}
                      readOnly={true}
                    />
                  ) : (
                    <p style={{ color: '#888', fontSize: '0.83rem', margin: 0 }}>
                      Loading canvas…
                    </p>
                  )}
                </div>

                <div className="attempt-modal-actions">
                  {role === 'admin' && (
                    <button
                      className="btn-approve"
                      onClick={() => setShowConfirm(true)}
                      disabled={attempt.status !== 'published' || approving}
                      type="button"
                    >
                      Approve Attempt
                    </button>
                  )}
                  {role === 'admin' && (
                    <button
                      className="btn-reject"
                      onClick={handleReject}
                      disabled={attempt.status !== 'published' || rejecting}
                      type="button"
                    >
                      {rejecting ? 'Rejecting…' : 'Reject Attempt'}
                    </button>
                  )}
                  <button
                    className="btn-modal-close"
                    onClick={() => setShowModal(false)}
                    type="button"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}

      {/* Approve confirmation modal — second overlay (D-07) */}
      {showConfirm && (
        <tr>
          <td colSpan={4}>
            <div
              className="approve-confirm-backdrop"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="approve-confirm-modal">
                <h3>Approve this attempt?</h3>
                <p className="approve-confirm-body">
                  This will close the project and award {currentProject?.reward ?? '?'} pts to {attempt.submitter_email}.
                </p>
                <div className="attempt-modal-actions">
                  <button
                    className="btn-approve-confirm"
                    onClick={handleApprove}
                    disabled={approving}
                    type="button"
                  >
                    {approving ? 'Approving…' : 'Confirm Approve'}
                  </button>
                  <button
                    className="btn-modal-close"
                    onClick={() => setShowConfirm(false)}
                    type="button"
                  >
                    Keep reviewing
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
