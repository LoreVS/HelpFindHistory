import { useState } from 'react'
import { extractContourSegments } from '../utils/contourAnalysis'

const MAX_SIZE = 320

async function removeBgWithCanvas(file) {
  const originalUrl = URL.createObjectURL(file)

  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = originalUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  let hasTransparency = false
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 250) { hasTransparency = true; break }
  }

  if (!hasTransparency) {
    const corners = [
      getPixel(data, canvas.width, 0, 0),
      getPixel(data, canvas.width, canvas.width - 1, 0),
      getPixel(data, canvas.width, 0, canvas.height - 1),
      getPixel(data, canvas.width, canvas.width - 1, canvas.height - 1),
    ]
    const bgColor = averageColor(corners)
    floodFill(data, canvas.width, canvas.height, 0, 0, bgColor, 40)
    floodFill(data, canvas.width, canvas.height, canvas.width - 1, 0, bgColor, 40)
    floodFill(data, canvas.width, canvas.height, 0, canvas.height - 1, bgColor, 40)
    floodFill(data, canvas.width, canvas.height, canvas.width - 1, canvas.height - 1, bgColor, 40)
    ctx.putImageData(imageData, 0, 0)
  }

  // Контурний аналіз до масштабування
  const contourData = extractContourSegments(canvas)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  return {
    blob,
    originalUrl,
    width: canvas.width,
    height: canvas.height,
    segments: contourData.segments,
    centroid: contourData.centroid,
  }
}

function getPixel(data, width, x, y) {
  const i = (y * width + x) * 4
  return { r: data[i], g: data[i + 1], b: data[i + 2] }
}
function averageColor(colors) {
  return {
    r: Math.round(colors.reduce((s, c) => s + c.r, 0) / colors.length),
    g: Math.round(colors.reduce((s, c) => s + c.g, 0) / colors.length),
    b: Math.round(colors.reduce((s, c) => s + c.b, 0) / colors.length),
  }
}
function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}
function floodFill(data, width, height, startX, startY, bgColor, tolerance) {
  const stack = [[startX, startY]]
  const visited = new Uint8Array(width * height)
  while (stack.length > 0) {
    const [x, y] = stack.pop()
    if (x < 0 || x >= width || y < 0 || y >= height) continue
    const idx = y * width + x
    if (visited[idx]) continue
    visited[idx] = 1
    const i = idx * 4
    if (data[i + 3] < 10) continue
    if (colorDistance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bgColor) > tolerance) continue
    data[i + 3] = 0
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
}

export function useBackgroundRemoval() {
  const [queue, setQueue] = useState([])

  const processFiles = async (files, onDone) => {
    for (const file of files) {
      const id = crypto.randomUUID()
      setQueue((q) => [...q, { id, name: file.name, status: 'processing', progress: 0 }])

      try {
        setQueue((q) => q.map((item) => (item.id === id ? { ...item, progress: 30 } : item)))
        const { blob, originalUrl, width, height, segments, centroid } =
          await removeBgWithCanvas(file)
        setQueue((q) => q.map((item) => (item.id === id ? { ...item, progress: 90 } : item)))

        const src = URL.createObjectURL(blob)
        const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height, 1)

        setQueue((q) =>
          q.map((item) => (item.id === id ? { ...item, status: 'done', progress: 100 } : item))
        )

        onDone({
          id,
          src,
          previewSrc: originalUrl,
          name: file.name,
          originalWidth: width,   // ← потрібно для трансформації контуру
          originalHeight: height,
          width: Math.round(width * scale),
          height: Math.round(height * scale),
          x: 200 + Math.random() * 400,
          y: 120 + Math.random() * 300,
          rotation: (Math.random() - 0.5) * 40,
          scaleX: 1,
          scaleY: 1,
          segments,   // ← сегменти контуру
          centroid,
        })
      } catch (err) {
        console.error('[BG] Помилка:', err)
        setQueue((q) =>
          q.map((item) => (item.id === id ? { ...item, status: 'error' } : item))
        )
      }
    }
  }

  return { queue, processFiles }
}