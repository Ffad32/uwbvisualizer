import { ref, onUnmounted } from 'vue'
import type { WsMessage } from '../types'

export function useWebSocket() {
  const lastMessage = ref<WsMessage | null>(null)
  const connected = ref(false)
  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  function connect() {
    const url = import.meta.env.DEV ? 'ws://localhost:8080' : `ws://${location.host}`
    ws = new WebSocket(url)

    ws.onopen = () => {
      connected.value = true
    }

    ws.onclose = () => {
      connected.value = false
      reconnectTimer = setTimeout(connect, 3000)
    }

    ws.onmessage = (event) => {
      try {
        lastMessage.value = JSON.parse(event.data) as WsMessage
      } catch {
        // ignore malformed messages
      }
    }
  }

  connect()

  onUnmounted(() => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    ws?.close()
  })

  return { lastMessage, connected }
}
