<template>
  <span class="inline-flex items-center">
    <Pill
      :kind="kind"
      :color="colorForKind"
      :icon="iconForKind"
      :name="displayName"
      interactive
      @click.stop="showModal = true"
    />

    <FilePreviewModal
      :is-open="showModal"
      :kind="kind"
      :file-path="filePath"
      :file-name="fileName"
      :slug="slug"
      @close="showModal = false"
    />
  </span>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import Pill from './Pill.vue'
import FilePreviewModal from './FilePreviewModal.vue'

const props = defineProps<{
  kind: 'artifact' | 'source' | 'model'
  filePath: string
  fileName: string
  slug?: string
}>()

const showModal = ref(false)

const displayName = computed(() => (props.slug ? `${props.fileName} #${props.slug}` : props.fileName))

const colorForKind = computed(() => {
  if (props.kind === 'artifact') return 'black'
  if (props.kind === 'model') return 'indigo'
  return 'slate'
})

const iconForKind = computed(() => {
  if (props.kind === 'artifact') return 'file-output'
  if (props.kind === 'model') return 'sparkles'
  return 'file-code'
})
</script>
