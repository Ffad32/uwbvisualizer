<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { TagState, AnchorPosition, AnchorBatteryRecord } from './types'
import { useWebSocket } from './composables/useWebSocket'
import ThreeScene from './components/ThreeScene.vue'
import TagStatusPanel from './components/TagStatusPanel.vue'
import AnchorPanel from './components/AnchorPanel.vue'
import ConnectionBadge from './components/ConnectionBadge.vue'
import CameraControls from './components/CameraControls.vue'

const defaultAnchors: AnchorPosition[] = [
  { x: 0.0, y: 0.0 },
  { x: 3.0, y: 0.0 },
  { x: 1.5, y: 2.598 }
]

const anchors = ref<AnchorPosition[]>(defaultAnchors)
const anchorBatteries = ref<Record<string, AnchorBatteryRecord>>({})
const tagState = ref<TagState>({
  chip_id: '—',
  x: null,
  y: null,
  distances: [],
  battery_v: '—',
  timestamp: null
})

// Camera state
const cameraZoom = ref(1.0)
const cameraCenterX = ref(1.5)
const cameraCenterY = ref(1.3)

// Template ref to ThreeScene for calling exposed methods
const threeSceneRef = ref<InstanceType<typeof ThreeScene> | null>(null)

const { lastMessage, connected } = useWebSocket()

watch(lastMessage, (msg) => {
  if (!msg) return
  if (msg.type === 'position') {
    tagState.value = {
      chip_id: msg.chip_id,
      x: msg.x,
      y: msg.y,
      distances: msg.distances,
      battery_v: msg.battery_v,
      timestamp: msg.timestamp
    }
  } else if (msg.type === 'anchor_status') {
    anchorBatteries.value = {
      ...anchorBatteries.value,
      [msg.anchor_number]: {
        chip_id: msg.chip_id,
        battery_v: msg.battery_v,
        timestamp: msg.timestamp
      }
    }
  } else if (msg.type === 'anchors') {
    anchors.value = msg.anchors
  }
})

onMounted(async () => {
  try {
    const [anchorsRes, batteriesRes] = await Promise.all([
      fetch('/api/anchors'),
      fetch('/api/anchor-batteries')
    ])
    if (anchorsRes.ok) anchors.value = await anchorsRes.json()
    if (batteriesRes.ok) {
      const data = await batteriesRes.json()
      const rec: Record<string, AnchorBatteryRecord> = {}
      Object.entries(data).forEach(([k, v]) => { rec[k] = v as AnchorBatteryRecord })
      anchorBatteries.value = rec
    }
  } catch {}
})

function handleAnchorsUpdate(newAnchors: AnchorPosition[]) {
  fetch('/api/anchors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newAnchors)
  })
    .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
    .then(() => { anchors.value = newAnchors.map(a => ({ ...a })) })
    .catch(console.error)
}

function handleCameraState(state: { zoom: number; centerX: number; centerY: number }) {
  cameraZoom.value = state.zoom
  cameraCenterX.value = state.centerX
  cameraCenterY.value = state.centerY
}
</script>

<template>
  <div class="relative w-screen h-screen overflow-hidden bg-[#0d0d1a]">
    <ThreeScene
      ref="threeSceneRef"
      :tagState="tagState"
      :anchors="anchors"
      @cameraState="handleCameraState"
    />

    <div class="absolute top-4 left-4 z-10">
      <TagStatusPanel :tagState="tagState" />
    </div>

    <div class="absolute top-4 right-4 z-10 max-h-[calc(100vh-2rem)] overflow-y-auto">
      <AnchorPanel
        :anchors="anchors"
        :anchorBatteries="anchorBatteries"
        @update="handleAnchorsUpdate"
      />
    </div>

    <div class="absolute bottom-4 left-4 z-10">
      <CameraControls
        :zoom="cameraZoom"
        :centerX="cameraCenterX"
        :centerY="cameraCenterY"
        @zoomIn="threeSceneRef?.zoomIn()"
        @zoomOut="threeSceneRef?.zoomOut()"
        @resetCamera="threeSceneRef?.resetCamera()"
      />
    </div>

    <div class="absolute bottom-4 right-4 z-10">
      <ConnectionBadge :connected="connected" />
    </div>
  </div>
</template>
