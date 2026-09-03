<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { AlertTriangle, X } from 'lucide-vue-next'
import { useConfirmStore } from '../../stores/confirmStore'

const store = useConfirmStore()

function onKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape' && store.isOpen) {
    store.resolve(false)
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      v-if="store.isOpen && store.options"
      class="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      @click.self="store.resolve(false)"
    >
      <div
        class="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-scale-in text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
        >
          <h2
            id="confirm-dialog-title"
            class="text-base font-bold text-slate-900 dark:text-slate-50"
          >
            {{ store.options.title }}
          </h2>
          <button
            @click="store.resolve(false)"
            class="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Content -->
        <div class="p-6">
          <div class="flex gap-3">
            <div
              class="shrink-0 w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20"
            >
              <AlertTriangle class="w-5 h-5" />
            </div>
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300 mt-1">
              {{ store.options.message }}
            </p>
          </div>
        </div>

        <!-- Footer Actions -->
        <div
          class="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800"
        >
          <button
            @click="store.resolve(false)"
            class="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition"
          >
            {{ store.options.cancelLabel ?? 'Cancel' }}
          </button>
          <button
            @click="store.resolve(true)"
            class="px-4 py-2 text-xs font-semibold rounded-lg text-white cursor-pointer transition"
            :class="
              store.options.danger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            "
          >
            {{ store.options.confirmLabel ?? 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes scale-in {
  from {
    transform: scale(0.96);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-fade-in {
  animation: fade-in 0.15s ease-out forwards;
}
.animate-scale-in {
  animation: scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
