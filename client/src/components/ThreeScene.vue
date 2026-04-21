<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import type { TagState, AnchorPosition } from '../types'

const props = defineProps<{
  tagState: TagState
  anchors: AnchorPosition[]
}>()

const emit = defineEmits<{
  (e: 'cameraState', payload: { zoom: number; centerX: number; centerY: number }): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

const TRAIL_LENGTH = 50
const LERP_FACTOR = 0.1
const DEFAULT_CENTER_X = 1.5
const DEFAULT_CENTER_Y = 1.3
const DEFAULT_VIEW_SIZE = 5
const MIN_VIEW_SIZE = 0.5
const MAX_VIEW_SIZE = 20

let scene: THREE.Scene
let camera: THREE.OrthographicCamera
let renderer: THREE.WebGLRenderer
let animFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null

// Camera state (module-level, not reactive)
let cameraCenter = { x: DEFAULT_CENTER_X, y: DEFAULT_CENTER_Y }
let currentViewSize = DEFAULT_VIEW_SIZE

// Pan state
const isDragging = ref(false)
let lastMouseX = 0
let lastMouseY = 0

// Touch state
let lastTouchDistance = 0
let lastTouchX = 0
let lastTouchY = 0

let anchorMeshes: THREE.Mesh[] = []
let anchorLabels: THREE.Sprite[] = []

let tagMesh: THREE.Mesh
const currentTagPos = new THREE.Vector3(DEFAULT_CENTER_X, DEFAULT_CENTER_Y, 0)
const targetTagPos = new THREE.Vector3(DEFAULT_CENTER_X, DEFAULT_CENTER_Y, 0)

let trailLine: THREE.Line
let trailGeo: THREE.BufferGeometry
const trailPositions: THREE.Vector3[] = []

let distanceLines: THREE.Line[] = []
let distanceLabels: THREE.Sprite[] = []

function emitCameraState() {
  emit('cameraState', {
    zoom: DEFAULT_VIEW_SIZE / currentViewSize,
    centerX: cameraCenter.x,
    centerY: cameraCenter.y
  })
}

function makeTextSprite(text: string, fontSize = 48): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(0.4, 0.2, 1)
  return sprite
}

function updateTextSprite(sprite: THREE.Sprite, text: string, fontSize = 36) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.font = `bold ${fontSize}px Arial`
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const oldTex = (sprite.material as THREE.SpriteMaterial).map
  oldTex?.dispose()
  ;(sprite.material as THREE.SpriteMaterial).map = new THREE.CanvasTexture(canvas)
  ;(sprite.material as THREE.SpriteMaterial).needsUpdate = true
}

function updateCameraFrustum(width: number, height: number) {
  const aspect = width / height
  const halfH = currentViewSize / 2
  const halfW = halfH * aspect
  camera.left = cameraCenter.x - halfW
  camera.right = cameraCenter.x + halfW
  camera.top = cameraCenter.y + halfH
  camera.bottom = cameraCenter.y - halfH
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

function applyZoom(factor: number, pivotWorldX?: number, pivotWorldY?: number) {
  const newViewSize = Math.min(MAX_VIEW_SIZE, Math.max(MIN_VIEW_SIZE, currentViewSize * factor))
  if (newViewSize === currentViewSize) return

  const canvas = canvasRef.value!
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  if (pivotWorldX !== undefined && pivotWorldY !== undefined) {
    // Zoom toward the pivot point so the world point under cursor stays fixed
    const scaleRatio = newViewSize / currentViewSize
    cameraCenter.x = pivotWorldX + (cameraCenter.x - pivotWorldX) * scaleRatio
    cameraCenter.y = pivotWorldY + (cameraCenter.y - pivotWorldY) * scaleRatio
  }

  currentViewSize = newViewSize
  updateCameraFrustum(width, height)
  camera.position.set(cameraCenter.x, cameraCenter.y, 10)
  emitCameraState()
}

function pixelToWorld(pixelX: number, pixelY: number): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const nx = (pixelX - rect.left) / rect.width   // 0..1
  const ny = (pixelY - rect.top) / rect.height    // 0..1
  const worldX = camera.left + nx * (camera.right - camera.left)
  const worldY = camera.top - ny * (camera.top - camera.bottom)
  return { x: worldX, y: worldY }
}

// ── Mouse event handlers ──────────────────────────────────────────────────────

function onMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  isDragging.value = true
  lastMouseX = e.clientX
  lastMouseY = e.clientY
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const canvas = canvasRef.value!
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  const dx = e.clientX - lastMouseX
  const dy = e.clientY - lastMouseY
  lastMouseX = e.clientX
  lastMouseY = e.clientY

  const worldDeltaX = (dx / width) * (camera.right - camera.left)
  const worldDeltaY = (dy / height) * (camera.top - camera.bottom)

  cameraCenter.x -= worldDeltaX
  cameraCenter.y += worldDeltaY

  updateCameraFrustum(width, height)
  camera.position.set(cameraCenter.x, cameraCenter.y, 10)
  emitCameraState()
}

function onMouseUp() {
  isDragging.value = false
}

function onMouseLeave() {
  isDragging.value = false
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  const factor = e.deltaY > 0 ? 1.1 : 0.9
  const pivot = pixelToWorld(e.clientX, e.clientY)
  applyZoom(factor, pivot.x, pivot.y)
}

// ── Touch event handlers ──────────────────────────────────────────────────────

function getTouchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
  } else if (e.touches.length === 2) {
    lastTouchDistance = getTouchDistance(e.touches)
  }
}

function onTouchMove(e: TouchEvent) {
  e.preventDefault()
  const canvas = canvasRef.value!
  const width = canvas.clientWidth
  const height = canvas.clientHeight

  if (e.touches.length === 1) {
    // Pan
    const dx = e.touches[0].clientX - lastTouchX
    const dy = e.touches[0].clientY - lastTouchY
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY

    const worldDeltaX = (dx / width) * (camera.right - camera.left)
    const worldDeltaY = (dy / height) * (camera.top - camera.bottom)

    cameraCenter.x -= worldDeltaX
    cameraCenter.y += worldDeltaY

    updateCameraFrustum(width, height)
    camera.position.set(cameraCenter.x, cameraCenter.y, 10)
    emitCameraState()
  } else if (e.touches.length === 2) {
    // Pinch zoom
    const newDist = getTouchDistance(e.touches)
    if (lastTouchDistance > 0) {
      const factor = lastTouchDistance / newDist
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
      const pivot = pixelToWorld(midX, midY)
      applyZoom(factor, pivot.x, pivot.y)
    }
    lastTouchDistance = newDist
  }
}

function onTouchEnd(e: TouchEvent) {
  if (e.touches.length < 2) lastTouchDistance = 0
  if (e.touches.length === 1) {
    lastTouchX = e.touches[0].clientX
    lastTouchY = e.touches[0].clientY
  }
}

// ── Exposed camera control functions ─────────────────────────────────────────

function resetCamera() {
  cameraCenter = { x: DEFAULT_CENTER_X, y: DEFAULT_CENTER_Y }
  currentViewSize = DEFAULT_VIEW_SIZE
  const canvas = canvasRef.value!
  updateCameraFrustum(canvas.clientWidth, canvas.clientHeight)
  camera.position.set(cameraCenter.x, cameraCenter.y, 10)
  emitCameraState()
}

function zoomIn() {
  applyZoom(0.8)
}

function zoomOut() {
  applyZoom(1.25)
}

defineExpose({ resetCamera, zoomIn, zoomOut })

// ── Scene building ────────────────────────────────────────────────────────────

function buildAnchors(anchors: AnchorPosition[]) {
  anchorMeshes.forEach(m => scene.remove(m))
  anchorLabels.forEach(s => scene.remove(s))
  anchorMeshes = []
  anchorLabels = []

  anchors.forEach((a, i) => {
    const geo = new THREE.CircleGeometry(0.08, 32)
    const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(a.x, a.y, 0)
    scene.add(mesh)
    anchorMeshes.push(mesh)

    const label = makeTextSprite(`A${i + 1}`)
    label.position.set(a.x + 0.15, a.y + 0.15, 0)
    scene.add(label)
    anchorLabels.push(label)
  })
}

function buildDistanceObjects(count: number) {
  distanceLines.forEach(l => scene.remove(l))
  distanceLabels.forEach(s => scene.remove(s))
  distanceLines = []
  distanceLabels = []

  for (let i = 0; i < count; i++) {
    const geo = new THREE.BufferGeometry()
    const mat = new THREE.LineBasicMaterial({ color: 0xff6b6b, transparent: true, opacity: 0.3 })
    const line = new THREE.Line(geo, mat)
    line.visible = false
    scene.add(line)
    distanceLines.push(line)

    const label = makeTextSprite('', 36)
    label.scale.set(0.35, 0.175, 1)
    label.visible = false
    scene.add(label)
    distanceLabels.push(label)
  }
}

function initScene() {
  const canvas = canvasRef.value!
  const parent = canvas.parentElement!

  scene = new THREE.Scene()
  scene.background = null

  camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1000, 1000)
  camera.position.set(cameraCenter.x, cameraCenter.y, 10)
  camera.lookAt(cameraCenter.x, cameraCenter.y, 0)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas })
  renderer.setClearColor(0x000000, 0)

  updateCameraFrustum(parent.clientWidth, parent.clientHeight)

  const grid = new THREE.GridHelper(10, 20, 0x1a1a2e, 0x16213e)
  grid.rotation.x = Math.PI / 2
  grid.position.set(0, 0, -0.1)
  scene.add(grid)

  buildAnchors(props.anchors)

  const tagGeo = new THREE.CircleGeometry(0.1, 32)
  const tagMat = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 })
  tagMesh = new THREE.Mesh(tagGeo, tagMat)
  tagMesh.visible = false
  scene.add(tagMesh)

  trailGeo = new THREE.BufferGeometry()
  const trailMat = new THREE.LineBasicMaterial({ color: 0x4fc3f7, transparent: true, opacity: 0.4 })
  trailLine = new THREE.Line(trailGeo, trailMat)
  trailLine.visible = false
  scene.add(trailLine)

  buildDistanceObjects(props.anchors.length)

  // Attach event listeners to canvas
  canvas.addEventListener('mousedown', onMouseDown)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseup', onMouseUp)
  canvas.addEventListener('mouseleave', onMouseLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  canvas.addEventListener('touchstart', onTouchStart, { passive: true })
  canvas.addEventListener('touchmove', onTouchMove, { passive: false })
  canvas.addEventListener('touchend', onTouchEnd, { passive: true })

  resizeObserver = new ResizeObserver(() => {
    updateCameraFrustum(parent.clientWidth, parent.clientHeight)
  })
  resizeObserver.observe(parent)

  // Emit initial camera state
  emitCameraState()

  function animate() {
    animFrameId = requestAnimationFrame(animate)
    currentTagPos.lerp(targetTagPos, LERP_FACTOR)
    tagMesh.position.copy(currentTagPos)
    renderer.render(scene, camera)
  }
  animate()
}

watch(
  () => props.anchors,
  (newAnchors) => {
    if (!scene) return
    buildAnchors(newAnchors)
    buildDistanceObjects(newAnchors.length)
  },
  { deep: true }
)

watch(
  () => props.tagState,
  (state) => {
    if (!scene) return

    const hasPos = state.x !== null && state.y !== null
    tagMesh.visible = hasPos

    if (hasPos) {
      targetTagPos.set(state.x!, state.y!, 0)

      trailPositions.push(targetTagPos.clone())
      if (trailPositions.length > TRAIL_LENGTH) trailPositions.shift()

      if (trailPositions.length >= 2) {
        trailGeo.setFromPoints(trailPositions)
        trailLine.visible = true
      }

      props.anchors.forEach((anchor, i) => {
        const d = state.distances[i]
        const line = distanceLines[i]
        const label = distanceLabels[i]
        if (!line || !label) return

        if (typeof d === 'number' && d > 0) {
          const from = new THREE.Vector3(anchor.x, anchor.y, 0)
          const to = new THREE.Vector3(state.x!, state.y!, 0)
          line.geometry.setFromPoints([from, to])
          line.visible = true

          const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5)
          label.position.copy(mid)
          updateTextSprite(label, `${d.toFixed(2)}m`, 36)
          label.visible = true
        } else {
          line.visible = false
          label.visible = false
        }
      })
    } else {
      distanceLines.forEach(l => { l.visible = false })
      distanceLabels.forEach(l => { l.visible = false })
    }
  },
  { deep: true }
)

onMounted(() => {
  initScene()
})

onUnmounted(() => {
  if (animFrameId !== null) cancelAnimationFrame(animFrameId)
  resizeObserver?.disconnect()

  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousedown', onMouseDown)
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mouseup', onMouseUp)
    canvas.removeEventListener('mouseleave', onMouseLeave)
    canvas.removeEventListener('wheel', onWheel)
    canvas.removeEventListener('touchstart', onTouchStart)
    canvas.removeEventListener('touchmove', onTouchMove)
    canvas.removeEventListener('touchend', onTouchEnd)
  }

  renderer?.dispose()
})
</script>

<template>
  <canvas
    ref="canvasRef"
    class="absolute top-0 left-0 w-full h-full"
    :style="{ display: 'block', cursor: isDragging ? 'grabbing' : 'grab' }"
  />
</template>
