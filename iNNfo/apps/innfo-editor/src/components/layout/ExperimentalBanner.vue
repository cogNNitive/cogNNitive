<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sparkles, X } from 'lucide-vue-next'

const SESSION_KEY = 'nn_experimental_banner_dismissed'

const visible = ref(typeof window !== 'undefined' && typeof sessionStorage !== 'undefined' ? !sessionStorage.getItem(SESSION_KEY) : true)

onMounted(() => {
  if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY)) {
    visible.value = false
  }
})

function dismiss(): void {
  visible.value = false
  sessionStorage.setItem(SESSION_KEY, 'true')
}
</script>

<template>
  <aside
    v-if="visible"
    class="flex items-center justify-between gap-3 px-4 py-1.5 bg-brand-subtle dark:bg-purple-950/60 border-b border-brand/15 dark:border-purple-800/40 text-brand dark:text-purple-200 text-xs transition-all select-none shrink-0"
    role="status"
    aria-label="Experimental notice"
    data-testid="experimental-banner"
  >
    <div class="flex items-center gap-2 min-w-0 flex-1 justify-center text-center">
      <Sparkles class="w-3.5 h-3.5 text-primary shrink-0 animate-pulse" aria-hidden="true" />
      <span class="truncate">
        <strong>Work in Progress:</strong> iNNfo is experimental and actively evolving. Expect updates & occasional dust — feedback is warmly welcome!
      </span>
    </div>
    <button
      type="button"
      class="p-1 rounded-md text-brand/70 dark:text-purple-300 hover:text-brand hover:bg-brand/10 dark:hover:bg-purple-800/50 transition-colors cursor-pointer shrink-0"
      aria-label="Dismiss banner"
      data-testid="dismiss-experimental-banner"
      @click="dismiss"
    >
      <X class="w-3.5 h-3.5" />
    </button>
  </aside>
</template>

<style scoped>
.bg-brand-subtle {
  background-color: #fcf6fc;
}
.text-brand {
  color: #4d0e4e;
}
.border-brand\/15 {
  border-color: rgba(77, 14, 78, 0.15);
}
</style>
