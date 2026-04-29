import { useRef, useState, useEffect, useMemo } from 'react'
import {
  Stage, Layer, Group,
  Image as KonvaImage, Line, Transformer,
} from 'react-konva'
import useFragmentStore from '../store/useFragmentStore'
import { matchContourSegments } from '../utils/contourAnalysis'

// ─── Один уламок ─────────────────────────────────────────────────────────

function FragmentNode({
  fragment,
  isSelected,
  ownSegments,   // сегменти самого виділеного уламка (показуємо кольорами)
  matchSegments, // сегменти цього уламка що співпадають з виділеним
  onSelect,
  onUpdate,
}) {
  const [img, setImg] = useState(null)
  const groupRef = useRef()

  useEffect(() => {
    if (!fragment.src) return
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => setImg(image)
    image.onerror = () => console.error('[Canvas] Не завантажено:', fragment.name)
    image.src = fragment.src
  }, [fragment.src])

  // Масштаб від image-координат до відображуваного розміру
  const sx = fragment.originalWidth ? fragment.width / fragment.originalWidth : 1
  const sy = fragment.originalHeight ? fragment.height / fragment.originalHeight : 1
  const ox = fragment.width / 2   // зміщення центра
  const oy = fragment.height / 2

  // Трансформуємо масив точок контуру → локальні координати Group
  const toLocal = (points) =>
    points.flatMap(p => [p.x * sx - ox, p.y * sy - oy])

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
      onDragEnd={(e) =>
        onUpdate(fragment.id, { x: e.target.x(), y: e.target.y() })
      }
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
      {/* Зображення уламка */}
      {img && (
        <KonvaImage
          image={img}
          x={-ox}
          y={-oy}
          width={fragment.width}
          height={fragment.height}
          opacity={isSelected ? 0.82 : 1}
        />
      )}

      {/* Сегменти контуру */}
      {activeSegments.map((seg) => {
        const pts = toLocal(seg.points)
        if (pts.length < 4) return null
        return (
          <Line
            key={seg.index}
            points={pts}
            stroke={seg.color}
            strokeWidth={isSelected ? 3 : 4.5}
            lineCap="round"
            lineJoin="round"
            shadowColor={seg.color}
            shadowBlur={isSelected ? 6 : 16}
            shadowOpacity={1}
            listening={false}
          />
        )
      })}
    </Group>
  )
}

// ─── Канвас ───────────────────────────────────────────────────────────────

export default function FragmentCanvas() {
  const containerRef = useRef(null)
  const stageRef     = useRef(null)
  const trRef        = useRef(null)

  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [selectedId, setSelectedId] = useState(null)
  const { fragments, updateFragment } = useFragmentStore()

  // Адаптивний розмір
  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width, height })
    })
    if (containerRef.current) obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Transformer прикріплюємо до Group
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

  // Зіставлення сегментів при зміні вибору
  const segmentMatches = useMemo(() => {
    if (!selectedId) return {}
    const sel = fragments.find(f => f.id === selectedId)
    if (!sel?.segments?.length) return {}
    return matchContourSegments(sel, fragments)
  }, [selectedId, fragments])

  const handleStageClick = (e) => {
    if (e.target === e.target.getStage()) setSelectedId(null)
  }

  // Для легенди
  const selectedFrag = fragments.find(f => f.id === selectedId)
  const matchCount = Object.keys(segmentMatches).length

  return (
    <div ref={containerRef} className="canvas-wrap">
      {fragments.length === 0 && (
        <div className="canvas-empty">
          <span>Завантаж уламки зліва, щоб почати</span>
        </div>
      )}

      {/* Легенда активних кольорів сегментів */}
      {selectedFrag?.segments?.length > 0 && (
        <div className="seg-legend">
          <div className="seg-legend-title">
            {matchCount > 0
              ? `Знайдено співпадінь: ${matchCount} уламків`
              : 'Співпадінь не знайдено'}
          </div>
          <div className="seg-legend-list">
            {selectedFrag.segments.map(seg => (
              <span key={seg.index} className="seg-legend-item">
                <span className="seg-dot" style={{ background: seg.color, boxShadow: `0 0 6px ${seg.color}` }} />
                сегмент {seg.index + 1}
              </span>
            ))}
          </div>
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

            // Власні сегменти (для виділеного)
            const ownSegments = isSelected ? (fragment.segments ?? []) : []

            // Сегменти цього уламка що відповідають вибраному
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
                onUpdate={updateFragment}
              />
            )
          })}

          <Transformer
            ref={trRef}
            rotateEnabled
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
            borderStroke="#e8b84b"
            borderStrokeWidth={1.5}
            anchorStroke="#e8b84b"
            anchorFill="#111111"
            anchorSize={9}
            anchorCornerRadius={2}
            rotateAnchorOffset={20}
          />
        </Layer>
      </Stage>
    </div>
  )
}