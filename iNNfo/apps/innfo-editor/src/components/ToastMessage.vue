<script setup lang="ts">
import { useToast } from '../shared/useToast'

const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div v-if="toasts.length" class="toast-container" data-testid="toast-container">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast--${t.type}`"
        @click="dismiss(t.id)"
      >
        <span class="toast__icon">
          <svg
            v-if="t.type === 'error'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M15 9l-6 6M9 9l6 6" />
          </svg>
          <svg
            v-else-if="t.type === 'warning'"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M12 2L2 19h20L12 2z" />
            <path d="M12 9v4" />
            <path d="M12 17v.01" />
          </svg>
          <svg
            v-else
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
        </span>
        <span class="toast__message">{{ t.message }}</span>
        <button class="toast__close" @click.stop="dismiss(t.id)">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 520px;
  width: calc(100% - 48px);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius);
  font-family: var(--sans);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  animation: toast-in 0.25s ease-out;
  transition: opacity 0.2s;
}

.toast:hover {
  opacity: 0.92;
}

.toast--error {
  background: #c62828;
  color: #fff;
}

.toast--warning {
  background: #8d6e00;
  color: #fff;
}

.toast--success {
  background: #2e7d32;
  color: #fff;
}

.toast--info {
  background: #283593;
  color: #fff;
}

.toast__icon {
  flex-shrink: 0;
  display: flex;
}

.toast__message {
  flex: 1;
  min-width: 0;
}

.toast__close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  padding: 2px;
  border-radius: 4px;
  display: flex;
}

.toast__close:hover {
  opacity: 1;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
