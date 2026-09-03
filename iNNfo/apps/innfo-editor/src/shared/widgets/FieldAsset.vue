<script setup lang="ts">
/**
 * Renders an asset field (image/file/video/audio).
 * Part of the unified widget registry (FR-003).
 * Uses v-model contract: modelValue / update:modelValue.
 *
 * widgetType determines rendering:
 * - 'image': thumbnail preview
 * - 'file': file icon + filename
 * - 'video': video player
 * - 'audio': audio player
 *
 * Shows a warning if the path appears stale (placeholder — UI can refine later).
 */
import { computed, ref, watch } from 'vue'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { useModelStore } from '../../stores/modelStore'

const props = withDefaults(
  defineProps<{
    modelValue: string
    widgetType?: string
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
    nodeId?: string
    fieldKey?: string
    readonly?: boolean
  }>(),
  { widgetType: 'file', readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const assetType = computed(() => props.fieldDefinition?.type ?? props.widgetType)

const assetPath = computed(() => props.modelValue ?? '')

const fileName = computed(() => {
  const p = assetPath.value
  return p.split('/').pop() ?? p.split('\\').pop() ?? p
})

const isImage = computed(() => assetType.value === 'image')
const isVideo = computed(() => assetType.value === 'video')
const isAudio = computed(() => assetType.value === 'audio')
const isFile = computed(() => assetType.value === 'file')

const ws = useWorkspaceStore()
const modelStore = useModelStore()
const resolvedAssetUrl = ref('')
const fileExists = ref(true)
const blobUrlCache = new Map<string, string>()

watch(
  [() => assetPath.value, () => ws.handle],
  async ([path, handle]) => {
    if (!path) {
      resolvedAssetUrl.value = ''
      fileExists.value = true
      return
    }
    if (path.startsWith('http') || path.startsWith('data:') || path.startsWith('blob:')) {
      resolvedAssetUrl.value = path
      fileExists.value = true
      return
    }
    const cached = blobUrlCache.get(path)
    if (cached) {
      resolvedAssetUrl.value = cached
      fileExists.value = true
      return
    }
    if (!handle) {
      console.log('[FieldAsset] no handle, using fallback path:', path)
      resolvedAssetUrl.value = path
      fileExists.value = true
      return
    }

    const node = props.nodeId ? modelStore.getNode(props.nodeId) : null
    let slug = ''
    if (node) {
      slug =
        node.slug ||
        node.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/[\s_]+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '')
    }

    console.log('[FieldAsset] resolving:', { path, nodeId: props.nodeId, nodeName: node?.name, slug })

    // Resolve directory containing the model file relative to workspace root
    async function getModelDirectoryHandle(rootHandle: any, modelPath: string): Promise<any> {
      const parts = modelPath.replace(/\\/g, '/').split('/').filter(Boolean)
      parts.pop() // Drop the filename segment
      let current = rootHandle
      for (const part of parts) {
        current = await current.getDirectoryHandle(part)
      }
      return current
    }

    let modelDirHandle = handle
    const modelPath = node?.source?.path || ''
    if (modelPath) {
      try {
        modelDirHandle = await getModelDirectoryHandle(handle, modelPath)
      } catch (err) {
        console.warn('[FieldAsset] Failed to resolve model directory handle for:', modelPath, err)
      }
    }

    // 1. Try canonical per-element assets: assets/{slug}/{filename}
    if (slug) {
      try {
        const assetsDir = await modelDirHandle.getDirectoryHandle('assets')
        const slugDir = await assetsDir.getDirectoryHandle(slug)
        const fh = await slugDir.getFileHandle(path)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const file = (await fh.getFile()) as any
        const url = URL.createObjectURL(file)
        blobUrlCache.set(path, url)
        resolvedAssetUrl.value = url
        fileExists.value = true
        console.log('[FieldAsset] resolved via canonical path:', url)
        return
      } catch (err) {
        console.warn(`[FieldAsset] canonical path failed for slug="${slug}" path="${path}":`, err)
      }
    }

    // 2. Try centralized assets: assets/{filename}
    try {
      const assetsDir = await modelDirHandle.getDirectoryHandle('assets')
      const fh = await assetsDir.getFileHandle(path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const file = (await fh.getFile()) as any
      const url = URL.createObjectURL(file)
      blobUrlCache.set(path, url)
      resolvedAssetUrl.value = url
      fileExists.value = true
      console.log('[FieldAsset] resolved via centralized assets path:', url)
      return
    } catch (err) {
      console.warn(`[FieldAsset] centralized path failed for path="${path}":`, err)
    }

    // 3. Try direct workspace path (e.g. subfolders or root file)
    try {
      const parts = path.split('/').filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = modelDirHandle
      for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i])
      }
      const fh = await current.getFileHandle(parts[parts.length - 1])
      const file = await fh.getFile()
      const url = URL.createObjectURL(file)
      blobUrlCache.set(path, url)
      resolvedAssetUrl.value = url
      fileExists.value = true
      console.log('[FieldAsset] resolved via direct workspace path:', url)
      return
    } catch (err) {
      console.warn(`[FieldAsset] direct path failed for path="${path}":`, err)
      resolvedAssetUrl.value = path
      fileExists.value = false
    }
  },
  { immediate: true },
)

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

function onImageError(e: Event): void {
  const img = e.target as HTMLImageElement
  if (!img) return
  img.style.display = 'none'
}
</script>

<template>
  <div class="field-asset">
    <!-- Image thumbnail -->
    <div v-if="isImage && assetPath" class="field-asset__preview">
      <img
        v-if="resolvedAssetUrl"
        :src="resolvedAssetUrl"
        :alt="fileName"
        class="field-asset__image"
        @error="onImageError"
      />
      <span v-if="!assetPath" class="field-asset__placeholder">No image selected</span>
    </div>

    <!-- Video player -->
    <div v-else-if="isVideo && assetPath" class="field-asset__preview">
      <video v-if="resolvedAssetUrl" :src="resolvedAssetUrl" controls class="field-asset__video" preload="metadata">
        Your browser does not support the video element.
      </video>
    </div>

    <!-- Audio player -->
    <div v-else-if="isAudio && assetPath" class="field-asset__preview">
      <audio v-if="resolvedAssetUrl" :src="resolvedAssetUrl" controls class="field-asset__audio" preload="metadata">
        Your browser does not support the audio element.
      </audio>
    </div>

    <!-- File icon + name (default fallback for file type) -->
    <div v-else-if="isFile && assetPath" class="field-asset__file">
      <span class="field-asset__file-icon">📄</span>
      <span class="field-asset__file-name">{{ fileName }}</span>
    </div>

    <!-- Editable path input -->
    <div v-if="!readonly" class="field-asset__input-row">
      <input
        type="text"
        class="field-asset__input"
        :value="modelValue"
        :placeholder="`Enter ${assetType} path...`"
        @input="onInput"
      />
      <span class="field-asset__type-badge">{{ assetType }}</span>
    </div>

    <!-- Missing file warning (real validation) -->
    <div v-if="assetPath && !fileExists && !readonly" class="field-asset__warning">
      <span class="field-asset__warning-icon">⚠️</span>
      Asset file not found in workspace:
      <code>{{ assetPath }}</code>
    </div>
  </div>
</template>

<style scoped>
.field-asset {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.field-asset__preview {
  max-width: 100%;
  border: 1px solid var(--border-soft, #e2e8f0);
  border-radius: 6px;
  overflow: hidden;
  background: #f8fafc;
}

.field-asset__image {
  display: block;
  max-width: 100%;
  max-height: 200px;
  object-fit: contain;
}

.field-asset__video {
  display: block;
  max-width: 100%;
  max-height: 240px;
}

.field-asset__audio {
  display: block;
  width: 100%;
}

.field-asset__file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-soft, #e2e8f0);
  border-radius: 6px;
  background: #f8fafc;
}

.field-asset__file-icon {
  font-size: 1.25rem;
}

.field-asset__file-name {
  font-size: 13px;
  color: #334155;
  font-family: monospace;
}

.field-asset__input-row {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.field-asset__input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  font-size: 13px;
  border: 1px solid var(--border-soft, #ccc);
  border-radius: 6px;
  background: #fff;
  font-family: monospace;
  box-sizing: border-box;
}

.field-asset__input:focus {
  outline: none;
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.field-asset__type-badge {
  font-size: 11px;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  background: #e2e8f0;
  color: #475569;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.03em;
}

.field-asset__placeholder {
  display: block;
  padding: 1rem;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

.field-asset__warning {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 12px;
  color: #d97706;
  padding: 0.3rem 0.5rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 4px;
}

.field-asset__warning code {
  font-size: 11px;
  background: #fef3c7;
  padding: 0.1rem 0.3rem;
  border-radius: 3px;
}
</style>
