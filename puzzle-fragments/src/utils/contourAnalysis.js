export const SEG_COLORS = [
  '#ff4466', '#44aaff', '#44ff88',
  '#ffcc44', '#cc44ff', '#ff8844',
  '#44ffee', '#ff44cc',
]

// ─── Утиліти ──────────────────────────────────────────────────────────────

function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2 }

function perpendicularDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len === 0) return Math.sqrt(dist2(p, a))
  return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / len
}

function rdp(points, epsilon) {
  if (points.length <= 2) return [...points]
  const keep = new Uint8Array(points.length)
  keep[0] = 1; keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [s, e] = stack.pop()
    let maxD = 0, maxI = s
    for (let i = s + 1; i < e; i++) {
      const d = perpendicularDist(points[i], points[s], points[e])
      if (d > maxD) { maxD = d; maxI = i }
    }
    if (maxD > epsilon) { keep[maxI] = 1; stack.push([s, maxI], [maxI, e]) }
  }
  return points.filter((_, i) => keep[i])
}

function resample(points, N) {
  if (points.length <= 1) return points
  const lens = [0]
  for (let i = 1; i < points.length; i++)
    lens.push(lens[i - 1] + Math.sqrt(dist2(points[i], points[i - 1])))
  const total = lens[lens.length - 1]
  if (total < 1) return points
  const result = []
  let j = 0
  for (let i = 0; i < N; i++) {
    const target = (i / (N - 1)) * total
    while (j < lens.length - 2 && lens[j + 1] < target) j++
    const t = lens[j + 1] - lens[j] < 0.0001
      ? 0 : (target - lens[j]) / (lens[j + 1] - lens[j])
    result.push({
      x: points[j].x + t * (points[j + 1].x - points[j].x),
      y: points[j].y + t * (points[j + 1].y - points[j].y),
    })
  }
  return result
}

function normalizeSignature(points, N = 32) {
  const pts = resample(points, N)
  if (pts.length < 2) return null
  const cx = pts.reduce((s, p) => s + p.x, 0) / N
  const cy = pts.reduce((s, p) => s + p.y, 0) / N
  const centered = pts.map(p => ({ x: p.x - cx, y: p.y - cy }))
  const maxD = Math.max(...centered.map(p => Math.sqrt(p.x ** 2 + p.y ** 2)))
  if (maxD < 0.5) return null
  return centered.map(p => ({ x: p.x / maxD, y: p.y / maxD }))
}

function sigDistance(s1, s2) {
  if (!s1 || !s2 || s1.length !== s2.length) return Infinity
  const sum = s1.reduce((acc, p, i) =>
    acc + (p.x - s2[i].x) ** 2 + (p.y - s2[i].y) ** 2, 0)
  return Math.sqrt(sum / s1.length)
}

// ─── Трасування контуру (Moore neighborhood) ──────────────────────────────

// 8 напрямків: право, право-вниз, вниз, вниз-ліво, ліво, ліво-вверх, вверх, вверх-право
const DIR8 = [
  [1, 0], [1, 1], [0, 1], [-1, 1],
  [-1, 0], [-1, -1], [0, -1], [1, -1],
]

function isOpaque(data, w, h, x, y) {
  if (x < 0 || x >= w || y < 0 || y >= h) return false
  return data[(y * w + x) * 4 + 3] >= 128
}

/**
 * Трасує зовнішній контур форми через обхід сусідів.
 * Повертає впорядкований масив точок вздовж межі.
 */
function traceContour(data, w, h) {
  // Знаходимо стартову точку (перший непрозорий зверху-ліво)
  let startX = -1, startY = -1
  outer:
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (isOpaque(data, w, h, x, y)) { startX = x; startY = y; break outer }
    }
  }
  if (startX < 0) return []

  const contour = []
  const visited = new Set()

  let x = startX, y = startY
  // Стартовий напрямок: шукаємо першого непрозорого сусіда
  let dir = 0

  const MAX_STEPS = w * h
  let steps = 0

  do {
    const key = y * w + x
    if (!visited.has(key)) {
      contour.push({ x, y })
      visited.add(key)
    }

    // Шукаємо наступний піксель контуру: обертаємося вліво (CCW) поки не знайдемо непрозорого
    // який межує з прозорим
    let found = false
    // Починаємо перевірку з напрямку (dir + 6) % 8 = dir - 2 (поворот вліво)
    const startDir = (dir + 6) % 8
    for (let i = 0; i < 8; i++) {
      const d = (startDir + i) % 8
      const nx = x + DIR8[d][0]
      const ny = y + DIR8[d][1]
      if (isOpaque(data, w, h, nx, ny)) {
        // Перевіряємо що сусід є крайовим (межує з прозорим)
        let isEdge = false
        for (let k = 0; k < 8; k++) {
          if (!isOpaque(data, w, h, nx + DIR8[k][0], ny + DIR8[k][1])) {
            isEdge = true; break
          }
        }
        if (isEdge) { x = nx; y = ny; dir = d; found = true; break }
      }
    }

    if (!found) break
    if (++steps > MAX_STEPS) break

  } while (!(x === startX && y === startY))

  return contour
}

// ─── Основна функція ──────────────────────────────────────────────────────

export function extractContourSegments(canvas) {
  const ctx = canvas.getContext('2d')
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const w = canvas.width, h = canvas.height

  // Центроїд
  let sumX = 0, sumY = 0, cnt = 0
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] >= 128) { sumX += x; sumY += y; cnt++ }
  const cx = cnt > 0 ? sumX / cnt : w / 2
  const cy = cnt > 0 ? sumY / cnt : h / 2

  // Трасуємо контур
  let contour = traceContour(data, w, h)
  if (contour.length < 6) return { segments: [], centroid: { x: cx, y: cy } }

  // Підвибірка щоб не перевантажувати RDP
  const MAX_PTS = 1200
  if (contour.length > MAX_PTS) {
    const step = Math.floor(contour.length / MAX_PTS)
    contour = contour.filter((_, i) => i % step === 0)
  }

  // RDP спрощення вздовж реального контуру
  const simplified = rdp(contour, 1.8)
  if (simplified.length < 4) return { segments: [], centroid: { x: cx, y: cy } }

  // Пошук кутів
  const CORNER_DEG = 20
  const cornerIdx = [0]
  for (let i = 1; i < simplified.length - 1; i++) {
    const ax = simplified[i].x - simplified[i - 1].x
    const ay = simplified[i].y - simplified[i - 1].y
    const bx = simplified[i + 1].x - simplified[i].x
    const by = simplified[i + 1].y - simplified[i].y
    const cross = Math.abs(ax * by - ay * bx)
    const dot = ax * bx + ay * by
    if (Math.atan2(cross, dot) * 180 / Math.PI > CORNER_DEG) cornerIdx.push(i)
  }
  cornerIdx.push(simplified.length - 1)

  // Злиття коротких сегментів (< 4% контуру)
  const MIN_FRAC = 0.04
  const filtered = [cornerIdx[0]]
  for (let i = 1; i < cornerIdx.length; i++) {
    const frac = (cornerIdx[i] - filtered[filtered.length - 1]) / simplified.length
    if (frac >= MIN_FRAC || i === cornerIdx.length - 1) filtered.push(cornerIdx[i])
  }

  // Обмеження до 8 сегментів: злиття найменших
  while (filtered.length - 1 > 8) {
    let minLen = Infinity, minI = 1
    for (let i = 1; i < filtered.length - 1; i++) {
      const len = filtered[i] - filtered[i - 1]
      if (len < minLen) { minLen = len; minI = i }
    }
    filtered.splice(minI, 1)
  }

  // Fallback: рівномірно ділимо на 4
  if (filtered.length - 1 < 2) {
    const N = 4, s = Math.floor(simplified.length / N)
    filtered.length = 0
    for (let i = 0; i < N; i++) filtered.push(i * s)
    filtered.push(simplified.length - 1)
  }

  // Будуємо сегменти
  const segments = []
  for (let i = 0; i < filtered.length - 1; i++) {
    const pts = simplified.slice(filtered[i], filtered[i + 1] + 1)
    if (pts.length < 2) continue
    segments.push({
      index: i,
      points: pts,
      signature: normalizeSignature(pts),
      color: SEG_COLORS[i % SEG_COLORS.length],
    })
  }

  return { segments, centroid: { x: cx, y: cy } }
}

// ─── Зіставлення сегментів ────────────────────────────────────────────────

export function matchContourSegments(selectedFrag, allFragments) {
  if (!selectedFrag?.segments?.length) return {}

  const ABSOLUTE_MAX_DIST = 0.55
  const RELATIVE_FACTOR = 2.2

  let globalBestDist = Infinity
  for (const other of allFragments) {
    if (other.id === selectedFrag.id || !other.segments?.length) continue
    for (const sSeg of selectedFrag.segments) {
      if (!sSeg.signature) continue
      for (const oSeg of other.segments) {
        if (!oSeg.signature) continue
        const rev = [...oSeg.signature].reverse()
        const d = sigDistance(sSeg.signature, rev)
        if (d < globalBestDist) globalBestDist = d
      }
    }
  }

  if (globalBestDist >= ABSOLUTE_MAX_DIST) return {}
  const distThreshold = Math.min(ABSOLUTE_MAX_DIST, globalBestDist * RELATIVE_FACTOR)

  const result = {}
  for (const other of allFragments) {
    if (other.id === selectedFrag.id || !other.segments?.length) continue
    const pairs = []
    for (const sSeg of selectedFrag.segments) {
      if (!sSeg.signature) continue
      for (const oSeg of other.segments) {
        if (!oSeg.signature) continue
        const rev = [...oSeg.signature].reverse()
        const d = sigDistance(sSeg.signature, rev)
        if (d < distThreshold) {
          pairs.push({
            selectedSegIndex: sSeg.index,
            otherSegIndex: oSeg.index,
            color: sSeg.color,
            score: 1 - d / ABSOLUTE_MAX_DIST,
            dist: d,
          })
        }
      }
    }
    if (!pairs.length) continue
    pairs.sort((a, b) => a.dist - b.dist)
    const usedSel = new Set(), usedOther = new Set()
    const matches = []
    for (const p of pairs) {
      if (usedSel.has(p.selectedSegIndex) || usedOther.has(p.otherSegIndex)) continue
      matches.push(p)
      usedSel.add(p.selectedSegIndex)
      usedOther.add(p.otherSegIndex)
    }
    if (matches.length > 0) result[other.id] = matches
  }
  return result
}
