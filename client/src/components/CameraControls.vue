<script setup lang="ts">
defineProps<{
  zoom: number
  centerX: number
  centerY: number
}>()

const emit = defineEmits<{
  (e: 'zoomIn'): void
  (e: 'zoomOut'): void
  (e: 'resetCamera'): void
}>()
</script>

<template>
  <div class="bg-[#1a1a2e]/90 border border-[#4fc3f7]/50 rounded-xl p-3 backdrop-blur-sm shadow-2xl flex items-center gap-3">
    <!-- Zoom controls group -->
    <div class="flex items-center gap-1.5">
      <button
        class="bg-[#0d0d1a] border border-[#4fc3f7]/30 text-[#4fc3f7] rounded-lg hover:bg-[#4fc3f7]/10 transition w-8 h-8 flex items-center justify-center text-lg font-bold"
        title="Zoom out"
        @click="emit('zoomOut')"
      >−</button>

      <span class="text-[#4fc3f7] font-mono text-sm font-bold min-w-[3.5rem] text-center">
        {{ zoom.toFixed(1) }}×
      </span>

      <button
        class="bg-[#0d0d1a] border border-[#4fc3f7]/30 text-[#4fc3f7] rounded-lg hover:bg-[#4fc3f7]/10 transition w-8 h-8 flex items-center justify-center text-lg font-bold"
        title="Zoom in"
        @click="emit('zoomIn')"
      >+</button>
    </div>

    <!-- Divider -->
    <div class="w-px h-6 bg-[#4fc3f7]/20"></div>

    <!-- Reset view button -->
    <button
      class="bg-[#0d0d1a] border border-[#4fc3f7]/30 text-[#4fc3f7] rounded-lg hover:bg-[#4fc3f7]/10 transition w-8 h-8 flex items-center justify-center text-lg font-bold"
      title="Reset view"
      @click="emit('resetCamera')"
    >⊙</button>

    <!-- Divider -->
    <div class="w-px h-6 bg-[#4fc3f7]/20"></div>

    <!-- Coordinates display -->
    <span class="text-[#8888aa] font-mono text-xs whitespace-nowrap">
      X: {{ centerX.toFixed(2) }}m&nbsp;&nbsp;Y: {{ centerY.toFixed(2) }}m
    </span>
  </div>
</template>
