import { ref, onBeforeUnmount } from 'vue'
import { getSidebarWidth, setSidebarWidth } from '../utils/db'

interface ResizableOptions {
  /** Persisted width key in localStorage and IndexedDB. */
  storageKey: string
  /** Default width in pixels when nothing is stored. */
  defaultWidth: number
  /** Minimum allowed width in pixels. */
  minWidth?: number
  /** Maximum allowed width in pixels. */
  maxWidth?: number
  /**
   * Which edge hosts the drag handle. 'right' means dragging right grows the
   * panel (left sidebar); 'left' means dragging left grows it (right sidebar).
   */
  side: 'left' | 'right'
}

/**
 * Reusable pointer-driven panel resizing with localStorage + IndexedDB persistence.
 * Returns the reactive width and a handler to bind to the drag handle.
 *
 * Width is resolved in order:
 *   1. IndexedDB (async, loaded on init)
 *   2. localStorage (sync, instant fallback)
 *   3. defaultWidth
 */
export function useResizablePanel(options: ResizableOptions) {
  const { storageKey, defaultWidth, minWidth = 200, maxWidth = 720, side } = options

  const stored = Number(localStorage.getItem(storageKey))
  const width = ref(Number.isFinite(stored) && stored > 0 ? stored : defaultWidth)

  // Async load from IndexedDB on init — overwrites localStorage value if found
  getSidebarWidth(storageKey).then((storedWidth) => {
    if (storedWidth !== undefined && Number.isFinite(storedWidth) && storedWidth > 0) {
      width.value = storedWidth
    }
  })

  let startX = 0
  let startWidth = 0

  const clamp = (value: number) => Math.min(maxWidth, Math.max(minWidth, value))

  const onPointerMove = (e: PointerEvent) => {
    const delta = e.clientX - startX
    // Right handle grows with positive delta; left handle grows with negative.
    const next = side === 'right' ? startWidth + delta : startWidth - delta
    width.value = clamp(next)
  }

  const onPointerUp = () => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    localStorage.setItem(storageKey, String(width.value))
    setSidebarWidth(storageKey, width.value) // fire-and-forget
  }

  const startResize = (e: PointerEvent) => {
    e.preventDefault()
    startX = e.clientX
    startWidth = width.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }

  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
  })

  return { width, startResize }
}
