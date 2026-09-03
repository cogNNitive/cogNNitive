import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export const useConfirmStore = defineStore('confirm', () => {
  const isOpen = ref(false)
  const options = ref<ConfirmOptions | null>(null)
  let resolver: ((value: boolean) => void) | null = null

  function confirm(opts: ConfirmOptions): Promise<boolean> {
    options.value = opts
    isOpen.value = true
    return new Promise((resolve) => {
      resolver = resolve
    })
  }

  function resolve(value: boolean): void {
    isOpen.value = false
    options.value = null
    resolver?.(value)
    resolver = null
  }

  return { isOpen, options, confirm, resolve }
})
