<script setup lang="ts">
import { ref, onMounted } from 'vue'

const SESSION_KEY = 'nn_sample_banner_dismissed'
defineProps<{
  templateName: string
}>()

const emit = defineEmits<{
  create: []
  dismiss: []
}>()

const visible = ref(true)

onMounted(() => {
  if (sessionStorage.getItem(SESSION_KEY)) {
    visible.value = false
  }
})

function onDismiss(): void {
  visible.value = false
  sessionStorage.setItem(SESSION_KEY, 'true')
  emit('dismiss')
}
</script>

<template>
  <div v-if="visible" class="sample-banner" data-testid="sample-banner">
    <div class="sample-banner__body">
      <span class="sample-banner__icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      </span>
      <p class="sample-banner__text">
        You are exploring a sample model that uses the
        <strong>{{ templateName }}</strong> template. Changes you make won't be saved.
        When you're ready, you can
        <button class="sample-banner__link" @click="emit('create')">
          create your own model
        </button>
        .
      </p>
      <button class="sample-banner__create-btn" @click="emit('create')">
        Create your own model
      </button>
    </div>
    <button class="sample-banner__close" aria-label="Cerrar" @click="onDismiss">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.sample-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1.5rem;
  background: #4D0E4E;
  color: #fff;
  font-family: system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  box-shadow: 0 2px 8px rgba(77, 14, 78, 0.2);
  position: relative;
  z-index: 10;
}

.sample-banner__body {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.sample-banner__icon {
  flex-shrink: 0;
  display: flex;
  opacity: 0.85;
}

.sample-banner__text {
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.sample-banner__link {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  color: #fbbf24;
  font-weight: 700;
  text-decoration: underline;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  font-size: inherit;
}

.sample-banner__link:hover {
  color: #fcd34d;
}

.sample-banner__create-btn {
  padding: 0.4rem 1rem;
  font-size: 13px;
  font-weight: 700;
  border-radius: 6px;
  border: 2px solid #fff;
  background: transparent;
  color: #fff;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}

.sample-banner__create-btn:hover {
  background: #fff;
  color: #4D0E4E;
}

.sample-banner__close {
  background: none;
  border: none;
  padding: 0.25rem;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: color 0.15s;
}

.sample-banner__close:hover {
  color: #fff;
}
</style>
