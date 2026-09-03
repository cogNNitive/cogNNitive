<script setup lang="ts">
import ToastMessage from './components/ToastMessage.vue'
import ConfirmDialog from './components/ui/ConfirmDialog.vue'
</script>

<template>
  <router-view />
  <ToastMessage />
  <ConfirmDialog />
</template>
