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

function FragmentNode({ fragment, isSelected, ownSegments, matchSegments, onSelect, onUpdate }) {
  const [img, setImg] = useState(null)
  const groupRef      = useRef()

  useEffect(() => {
    if (!fragment.src) return
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload  = () => setImg(image)
    image.onerror = () => console.error('[ProjectCanvas] Failed to load:', fragment.src)
    image.src = fragment.src
  }, [fragment.src])

  const sx = fragment.originalWidth  ? fragment.width  / fragment.originalWidth  : 1
  const sy = fragment.originalHeight ? fragment.height / fragment.originalHeight : 1
  const ox = fragment.width  / 2
  const oy = fragment.height / 2

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
      draggable
      onClick={() => onSelect(fragment.id)}
      onTap={() => onSelect(fragment.id)}
      onDragEnd={(e) => onUpdate(fragment.id, { x: e.target.x(), y: e.target.y() })}
      onTransformEnd={() => {
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
          width={fragment.width} height={fragment.height}
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

function ProjectCanvas({ fragments, onFragmentUpdate }) {
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
          <span>Upload fragment photos using the panel on the left</span>
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
                onSelect={setSelectedId}
                onUpdate={onFragmentUpdate}
              />
            )
          })}
          <Transformer
            ref={trRef}
            rotateEnabled
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="#e8b84b" borderStrokeWidth={1.5}
            anchorStroke="#e8b84b" anchorFill="#111111"
            anchorSize={9} anchorCornerRadius={2} rotateAnchorOffset={20}
          />
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

  const { currentProject, loading, error, fetchProject, saveLayout, closeProject } = useProjectStore()

  // Local canvas fragment state — hydrated from server, updated on drag/rotate
  const [canvasFragments, setCanvasFragments] = useState([])

  const [saving, setSaving]   = useState(false)
  const [saveMsg, setSaveMsg] = useState(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    fetchProject(Number(id))
  }, [id, fetchProject])

  // Hydrate canvas from server fragments when project loads
  useEffect(() => {
    if (!currentProject) return
    const mapped = currentProject.fragments.map((f, i) => toCanvasFragment(f, i))
    setCanvasFragments(mapped)
  }, [currentProject])

  // Called by ProjectCanvas on drag/rotate — update local state only (D-16: no auto-save)
  const handleFragmentUpdate = useCallback((fragmentId, updates) => {
    setCanvasFragments((prev) =>
      prev.map((f) => f.id === fragmentId ? { ...f, ...updates } : f)
    )
  }, [])

  // Called by ProjectDropzone after successful server upload (D-10, D-12)
  const handleFragmentUploaded = useCallback((serverFragment, localData) => {
    const newFrag = toCanvasFragment(serverFragment, canvasFragments.length)
    // Override src with the local blob URL for immediate display (avoids server round-trip)
    setCanvasFragments((prev) => [...prev, { ...newFrag, src: localData.src }])
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
          <button className="btn-end-session" onClick={handleEndSession} type="button">
            END SESSION
          </button>
        </div>
      </header>

      {/* ── Section 1: Canvas + sidebar (D-07, D-14, D-15) ── */}
      <div className="detail-canvas-section">
        {/* Upload sidebar (D-10) */}
        <ProjectDropzone
          projectId={currentProject.id}
          onFragmentUploaded={handleFragmentUploaded}
          disabled={isClosed}
        />

        {/* Canvas area */}
        <div className="detail-canvas-area">
          {/* Canvas header with Save Layout + Close Project */}
          <div className="canvas-toolbar">
            <span className="canvas-toolbar-title">
              Fragment Canvas &nbsp;·&nbsp; {canvasFragments.length} fragment{canvasFragments.length !== 1 ? 's' : ''}
            </span>
            <div className="canvas-toolbar-actions">
              {saveMsg && <span className="save-msg">{saveMsg}</span>}
              {/* D-16: explicit Save Layout (admin only) */}
              {role === 'admin' && (
                <button
                  className="btn-save-layout"
                  onClick={handleSaveLayout}
                  disabled={saving || isClosed}
                  type="button"
                >
                  {saving ? 'Saving…' : 'Save Layout'}
                </button>
              )}
              {/* D-09: Close Project (admin only) */}
              {role === 'admin' && !isClosed && (
                <button
                  className="btn-close-project"
                  onClick={handleClose}
                  disabled={closing}
                  type="button"
                >
                  {closing ? 'Closing…' : 'Close Project'}
                </button>
              )}
            </div>
          </div>

          {/* Canvas (D-15: full drag/rotate interaction) */}
          <ProjectCanvas
            fragments={canvasFragments}
            onFragmentUpdate={handleFragmentUpdate}
          />
        </div>
      </div>

      {/* ── Section 2: Submitted Attempts (D-07, D-08) ── */}
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
                <AttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// D-08: Attempt row with modal stub (approval wired in Phase 5)
function AttemptRow({ attempt }) {
  const [showModal, setShowModal] = useState(false)

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

      {/* D-08: modal stub — Approve/Reject stubbed for Phase 5 */}
      {showModal && (
        <tr>
          <td colSpan={4}>
            <div className="attempt-modal-backdrop" onClick={() => setShowModal(false)}>
              <div className="attempt-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Attempt by {attempt.submitter_email}</h3>
                <p className="attempt-modal-placeholder">
                  [Canvas preview will be shown here in Phase 5]
                </p>
                <div className="attempt-modal-actions">
                  <button
                    className="btn-approve"
                    onClick={() => { console.log('[stub] approve attempt', attempt.id); setShowModal(false) }}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="btn-reject"
                    onClick={() => { console.log('[stub] reject attempt', attempt.id); setShowModal(false) }}
                    type="button"
                  >
                    Reject
                  </button>
                  <button className="btn-modal-close" onClick={() => setShowModal(false)} type="button">
                    Close
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
