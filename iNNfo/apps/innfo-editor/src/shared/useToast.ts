import { ref } from 'vue'

export interface Toast {
  id: number
  message: string
  type: 'error' | 'warning' | 'success' | 'info'
}

const toasts = ref<Toast[]>([])
let nextId = 0
const TOAST_DURATION = 6000
const timeouts = new Map<number, ReturnType<typeof setTimeout>>()

export function useToast() {
  function show(message: string, type: Toast['type'] = 'warning') {
    const id = nextId++
    toasts.value.push({ id, message, type })
    const timer = setTimeout(() => dismiss(id), TOAST_DURATION)
    timeouts.set(id, timer)
  }

  function dismiss(id: number) {
    const timer = timeouts.get(id)
    if (timer) {
      clearTimeout(timer)
      timeouts.delete(id)
    }
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function clearAll() {
    for (const [, timer] of timeouts) {
      clearTimeout(timer)
    }
    timeouts.clear()
    toasts.value = []
  }

  return { toasts, show, dismiss, clearAll }
}
