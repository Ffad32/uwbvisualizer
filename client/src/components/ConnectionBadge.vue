<script setup lang="ts">
defineProps<{
  connected: boolean
}>()
</script>

<template>
  <div
    :class="[
      'flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-sm',
      connected
        ? 'bg-green-900/30 text-green-400 border-green-700/50'
        : 'bg-red-900/30 text-red-400 border-red-700/50'
    ]"
  >
    <!-- Dot indicator -->
    <span
      :class="[
        'w-2 h-2 rounded-full',
        connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
      ]"
    />
    <span class="text-sm font-medium">{{ connected ? 'Connected' : 'Disconnected' }}</span>
  </div>
</template>
