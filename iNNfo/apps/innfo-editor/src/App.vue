<script setup lang="ts">
import ExperimentalBanner from './components/layout/ExperimentalBanner.vue'
import ToastMessage from './components/ToastMessage.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
</script>

<template>
  <ExperimentalBanner />
  <router-view />
  <ToastMessage />
  <ConfirmDialog />
</template>

