<script setup lang="ts">
import type { TagState } from '../types'

defineProps<{
  tagState: TagState
}>()

function formatTime(timestamp: number | null): string {
  if (!timestamp) return '—'
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', { hour12: false })
}

function batteryColor(v: string): string {
  const num = parseFloat(v)
  if (isNaN(num)) return 'text-gray-400'
  if (num >= 3.6) return 'text-green-400'
  if (num >= 3.3) return 'text-yellow-400'
  return 'text-red-400'
}
</script>

<template>
  <div class="bg-[#1a1a2e]/90 border border-[#4fc3f7]/50 rounded-xl p-4 backdrop-blur-sm shadow-2xl min-w-[280px]">
    <!-- Header -->
    <div class="flex items-center gap-2 mb-4">
      <svg class="text-[#4fc3f7] w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="2"/>
        <path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/>
      </svg>
      <h2 class="text-lg font-bold text-uwb-text">UWB Tag Status</h2>
    </div>

    <div class="space-y-3">
      <!-- Chip ID -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-uwb-muted">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
            <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
          </svg>
          <span>Chip ID</span>
        </div>
        <span class="font-mono text-uwb-text">{{ tagState.chip_id }}</span>
      </div>

      <!-- Battery -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-uwb-muted">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/>
          </svg>
          <span>Battery</span>
        </div>
        <span class="font-mono" :class="batteryColor(tagState.battery_v)">
          {{ tagState.battery_v }} V
        </span>
      </div>

      <!-- Position -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2 text-uwb-muted">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Position</span>
        </div>
        <span class="font-mono text-uwb-text">
          <template v-if="tagState.x !== null && tagState.y !== null">
            {{ tagState.x.toFixed(2) }} m, {{ tagState.y.toFixed(2) }} m
          </template>
          <template v-else>—</template>
        </span>
      </div>

      <!-- Distances grid -->
      <div class="grid grid-cols-3 gap-2 mt-4">
        <div v-for="(label, i) in ['A1', 'A2', 'A3']" :key="label" class="text-center">
          <div class="text-xs text-uwb-muted">{{ label }}</div>
          <div class="font-mono text-sm">
            {{ tagState.distances[i] !== undefined ? tagState.distances[i].toFixed(2) : '—' }} m
          </div>
        </div>
      </div>

      <!-- Last update -->
      <div class="flex items-center justify-between pt-3 border-t border-uwb-border/30">
        <div class="flex items-center gap-2 text-uwb-muted">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Last update</span>
        </div>
        <span class="font-mono text-sm text-uwb-text">{{ formatTime(tagState.timestamp) }}</span>
      </div>
    </div>
  </div>
</template>
