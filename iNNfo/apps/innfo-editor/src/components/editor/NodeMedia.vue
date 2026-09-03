<template>
  <div data-testid="node-media" class="node-media">
    <!-- Images gallery grid -->
    <div v-if="imageAssets.length > 0" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <button
        v-for="(asset, idx) in imageAssets"
        :key="idx"
        class="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
        @click="openLightbox(idx)"
        :aria-label="`View ${asset.filename}`"
      >
        <img
          :src="asset.url"
          :alt="asset.filename"
          class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          loading="lazy"
          @error="onImgError($event)"
        />
        <div
          class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 py-1.5"
        >
          <span class="text-xs text-white/90 truncate block">{{ asset.filename }}</span>
        </div>
      </button>
    </div>

    <!-- Non-image file list -->
    <div v-if="nonImageAssets.length > 0" class="mt-3 space-y-1">
      <a
        v-for="(asset, idx) in nonImageAssets"
        :key="idx"
        :href="asset.url"
        :download="asset.filename"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <!-- File icon SVG -->
        <svg
          class="w-4 h-4 shrink-0 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
        <span class="truncate">{{ asset.filename }}</span>
      </a>
    </div>

    <!-- Empty state -->
    <p v-if="assets.length === 0" class="text-xs text-slate-400 dark:text-slate-500 italic">
      No media or attachments.
    </p>

    <!-- Lightbox overlay -->
    <Teleport to="body">
      <div
        v-if="lightboxOpen"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        @click.self="closeLightbox"
        data-testid="lightbox-overlay"
      >
        <button
          class="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer z-10"
          @click="closeLightbox"
          aria-label="Close lightbox"
          data-testid="lightbox-close"
        >
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <button
          v-if="imageAssets.length > 1"
          class="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer z-10"
          @click="prevImage"
          aria-label="Previous image"
        >
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <img
          :src="currentLightboxUrl"
          :alt="currentLightboxFilename"
          class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />

        <button
          v-if="imageAssets.length > 1"
          class="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer z-10"
          @click="nextImage"
          aria-label="Next image"
        >
          <svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <!-- Counter -->
        <div
          class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-medium"
        >
          {{ lightboxIndex + 1 }} / {{ imageAssets.length }}
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { isImageExtension } from '../../utils/imageDetection'

export interface AssetItem {
  filename: string
  url: string
}

const props = defineProps<{
  assets: AssetItem[]
}>()

// Separate assets into images and non-images
const imageAssets = computed(() =>
  props.assets.filter((a) => {
    const ext = a.filename.split('.').pop()?.toLowerCase()
    return ext ? isImageExtension(ext) : false
  }),
)

const nonImageAssets = computed(() =>
  props.assets.filter((a) => {
    const ext = a.filename.split('.').pop()?.toLowerCase()
    return ext ? !isImageExtension(ext) : true
  }),
)

// Lightbox state
const lightboxOpen = ref(false)
const lightboxIndex = ref(0)

const currentLightboxUrl = computed(() => imageAssets.value[lightboxIndex.value]?.url ?? '')

const currentLightboxFilename = computed(
  () => imageAssets.value[lightboxIndex.value]?.filename ?? '',
)

function openLightbox(idx: number) {
  lightboxIndex.value = idx
  lightboxOpen.value = true
}

function closeLightbox() {
  lightboxOpen.value = false
}

function nextImage() {
  if (imageAssets.value.length === 0) return
  lightboxIndex.value = (lightboxIndex.value + 1) % imageAssets.value.length
}

function prevImage() {
  if (imageAssets.value.length === 0) return
  lightboxIndex.value =
    (lightboxIndex.value - 1 + imageAssets.value.length) % imageAssets.value.length
}

function onImgError(event: Event) {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}
</script>
