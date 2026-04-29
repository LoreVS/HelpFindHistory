const BINS = 8
const STEP = 256 / BINS

/**
 * Витягує кольоровий гістограм крайових пікселів з обробленого зображення (прозорий фон).
 * Крайовий піксель = непрозорий піксель, що межує з прозорим.
 */
export function extractEdgeHistogram(imgElement) {
  const canvas = document.createElement('canvas')
  canvas.width = imgElement.naturalWidth
  canvas.height = imgElement.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(imgElement, 0, 0)

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const w = canvas.width
  const h = canvas.height
  const hist = new Array(BINS ** 3).fill(0)
  let edgeCount = 0

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      if (data[i + 3] < 128) continue

      const isEdge =
        data[((y - 1) * w + x) * 4 + 3] < 128 ||
        data[((y + 1) * w + x) * 4 + 3] < 128 ||
        data[(y * w + x - 1) * 4 + 3] < 128 ||
        data[(y * w + x + 1) * 4 + 3] < 128

      if (!isEdge) continue

      const ri = Math.min(Math.floor(data[i] / STEP), BINS - 1)
      const gi = Math.min(Math.floor(data[i + 1] / STEP), BINS - 1)
      const bi = Math.min(Math.floor(data[i + 2] / STEP), BINS - 1)
      hist[ri * BINS * BINS + gi * BINS + bi]++
      edgeCount++
    }
  }

  const total = edgeCount || 1
  return hist.map((v) => v / total)
}

/**
 * Histogram intersection: 0 (різні) → 1 (ідентичні)
 */
export function histogramSimilarity(h1, h2) {
  return h1.reduce((sum, v, i) => sum + Math.min(v, h2[i]), 0)
}

/**
 * Повертає масив { id, score } для сумісних уламків, відсортований за score.
 * Адаптивний поріг: 65% від максимального score, мінімум 0.12
 */
export function findCompatible(selectedFragment, allFragments) {
  if (!selectedFragment?.edgeHistogram?.length) return []

  const scores = allFragments
    .filter((f) => f.id !== selectedFragment.id && f.edgeHistogram?.length)
    .map((f) => ({
      id: f.id,
      score: histogramSimilarity(selectedFragment.edgeHistogram, f.edgeHistogram),
    }))
    .sort((a, b) => b.score - a.score)

  if (!scores.length) return []

  const topScore = scores[0].score
  if (topScore < 0.08) return []

  const threshold = Math.max(topScore * 0.65, 0.12)
  return scores.filter((s) => s.score >= threshold)
}