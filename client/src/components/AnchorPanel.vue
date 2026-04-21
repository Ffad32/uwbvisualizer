<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AnchorPosition, AnchorBatteryRecord } from '../types'

const props = defineProps<{
  anchors: AnchorPosition[]
  anchorBatteries: Record<string, AnchorBatteryRecord>
}>()

const emit = defineEmits<{
  (e: 'update', anchors: AnchorPosition[]): void
}>()

const editing = ref(false)
const localAnchors = ref<AnchorPosition[]>(props.anchors.map(a => ({ ...a })))

// Sync localAnchors with prop when not editing
watch(
  () => props.anchors,
  (newAnchors) => {
    if (!editing.value) {
      console.log('AnchorPanel: anchors prop changed, updating localAnchors', newAnchors)
      localAnchors.value = newAnchors.map(a => ({ ...a }))
    }
  },
  { deep: true }
)

function handleSave() {
  console.log('AnchorPanel: saving anchor positions', localAnchors.value)
  emit('update', localAnchors.value.map(a => ({ ...a })))
  editing.value = false
}

function handleCancel() {
  console.log('AnchorPanel: cancel editing, revert to anchors', props.anchors)
  localAnchors.value = props.anchors.map(a => ({ ...a }))
  editing.value = false
}

function updateX(idx: number, value: string) {
  localAnchors.value = localAnchors.value.map((a, i) =>
    i === idx ? { ...a, x: parseFloat(value) || 0 } : a
  )
}

function updateY(idx: number, value: string) {
  localAnchors.value = localAnchors.value.map((a, i) =>
    i === idx ? { ...a, y: parseFloat(value) || 0 } : a
  )
}

function batteryColor(v: string): string {
  const num = parseFloat(v)
  if (isNaN(num)) return 'text-gray-400'
  if (num >= 3.6) return 'text-green-400'
  if (num >= 3.3) return 'text-yellow-400'
  return 'text-red-400'
}

function formatChipId(chipId: string): string {
  if (!chipId) return '—'
  return chipId.length > 8 ? `${chipId.substring(0, 8)}…` : chipId
}
</script>

<template>
  <div class="bg-[#1a1a2e]/90 border border-[#4fc3f7]/50 rounded-xl p-4 backdrop-blur-sm shadow-2xl min-w-[300px] max-w-md">

    <!-- Anchor Batteries Section -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <svg class="text-[#4fc3f7] w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/>
        </svg>
        <h3 class="text-lg font-bold text-uwb-text">Anchor Batteries</h3>
      </div>
      <div class="space-y-2">
        <div
          v-for="num in [1, 2, 3]"
          :key="num"
          class="flex items-center justify-between py-2 px-3 rounded-lg bg-uwb-panel/50"
        >
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-uwb-border/20 flex items-center justify-center">
              <span class="font-bold text-uwb-text">A{{ num }}</span>
            </div>
            <div>
              <div class="text-sm text-uwb-muted">Chip ID</div>
              <div class="font-mono text-sm">{{ formatChipId(anchorBatteries[num]?.chip_id || '') }}</div>
            </div>
          </div>
          <div class="text-right">
            <div class="text-sm text-uwb-muted">Voltage</div>
            <div
              class="font-mono"
              :class="anchorBatteries[num] ? batteryColor(anchorBatteries[num].battery_v) : 'text-gray-500'"
            >
              {{ anchorBatteries[num]?.battery_v ? `${anchorBatteries[num].battery_v} V` : '—' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Anchor Positions Section -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <svg class="text-[#4fc3f7] w-[18px] h-[18px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
          </svg>
          <h3 class="text-lg font-bold text-uwb-text">Anchor Positions</h3>
        </div>
        <template v-if="!editing">
          <button
            @click="editing = true"
            class="px-3 py-1 text-sm bg-uwb-border/20 text-uwb-border rounded-lg hover:bg-uwb-border/30 transition"
          >
            Edit
          </button>
        </template>
        <template v-else>
          <div class="flex gap-2">
            <button
              @click="handleCancel"
              class="px-3 py-1 text-sm bg-red-900/30 text-red-400 rounded-lg hover:bg-red-900/50 transition"
            >
              Cancel
            </button>
            <button
              @click="handleSave"
              class="px-3 py-1 text-sm bg-green-900/30 text-green-400 rounded-lg hover:bg-green-900/50 transition flex items-center gap-1"
            >
              <svg class="w-[14px] h-[14px]" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
              </svg>
              Apply
            </button>
          </div>
        </template>
      </div>

      <div class="space-y-3">
        <div
          v-for="(_, idx) in [0, 1, 2]"
          :key="idx"
          class="grid grid-cols-3 gap-3 items-center"
        >
          <div class="text-center font-bold text-uwb-text">A{{ idx + 1 }}</div>
          <div>
            <label class="block text-xs text-uwb-muted mb-1">X (m)</label>
            <input
              type="number"
              step="0.01"
              :value="localAnchors[idx].x"
              :disabled="!editing"
              @input="updateX(idx, ($event.target as HTMLInputElement).value)"
              class="w-full px-3 py-2 bg-uwb-panel border border-uwb-border/30 rounded-lg text-uwb-text disabled:opacity-50"
            />
          </div>
          <div>
            <label class="block text-xs text-uwb-muted mb-1">Y (m)</label>
            <input
              type="number"
              step="0.01"
              :value="localAnchors[idx].y"
              :disabled="!editing"
              @input="updateY(idx, ($event.target as HTMLInputElement).value)"
              class="w-full px-3 py-2 bg-uwb-panel border border-uwb-border/30 rounded-lg text-uwb-text disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
