<script setup lang="ts">
/**
 * Renders an inline SVG diagram from a simple box-and-arrow DSL.
 * Accepts a string with lines like "Process > Task > Step".
 * Each ">" creates a directional arrow between rounded boxes.
 * In edit mode, a textarea allows editing the DSL.
 * Uses v-model contract: modelValue / update:modelValue.
 * Registered as 'diagram' in the unified widget registry.
 */
import { computed, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    fieldDefinition?: {
      name: string
      type: string
      options?: string[]
      target_concepts?: string[]
      default?: unknown
    }
    readonly?: boolean
  }>(),
  { readonly: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const editText = ref(props.modelValue ?? '')

function onInput(e: Event): void {
  const target = e.target as HTMLTextAreaElement
  editText.value = target.value
  emit('update:modelValue', target.value)
}

interface Box {
  id: number
  label: string
  x: number
  y: number
  w: number
  h: number
}

interface Arrow {
  from: Box
  to: Box
}

const BOX_WIDTH = 120
const BOX_HEIGHT = 40
const H_GAP = 60
const V_GAP = 40
const PADDING_TOP = 20
const PADDING_LEFT = 20
const R = 6

const svgData = computed<{
  boxes: Box[]
  arrows: Arrow[]
  width: number
  height: number
}>(() => {
  const source = props.modelValue ?? ''
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const boxes: Box[] = []
  const arrows: Arrow[] = []
  let idCounter = 0
  let maxX = 0
  let maxY = 0

  for (const line of lines) {
    const parts = line
      .split('>')
      .map((p) => p.trim())
      .filter(Boolean)
    const rowBoxes: Box[] = []

    for (let i = 0; i < parts.length; i++) {
      const box: Box = {
        id: idCounter++,
        label: parts[i],
        x: PADDING_LEFT + i * (BOX_WIDTH + H_GAP),
        y: PADDING_TOP + boxes.length * (BOX_HEIGHT + V_GAP),
        w: BOX_WIDTH,
        h: BOX_HEIGHT,
      }
      rowBoxes.push(box)
      if (i > 0) {
        arrows.push({ from: rowBoxes[i - 1], to: box })
      }
    }
    boxes.push(...rowBoxes)
  }

  if (boxes.length > 0) {
    maxX = Math.max(...boxes.map((b) => b.x + b.w)) + PADDING_LEFT
    maxY = Math.max(...boxes.map((b) => b.y + b.h)) + PADDING_TOP
  }

  return { boxes, arrows, width: maxX || 200, height: maxY || 80 }
})

function arrowPath(from: Box, to: Box): string {
  const x1 = from.x + from.w
  const y1 = from.y + from.h / 2
  const x2 = to.x
  const y2 = to.y + to.h / 2
  const mx = (x1 + x2) / 2
  return `M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`
}
</script>

<template>
  <div class="widget-diagram">
    <div v-if="!readonly" class="widget-diagram-edit">
      <textarea
        class="widget-diagram-textarea"
        :value="editText"
        @input="onInput"
        spellcheck="false"
        wrap="off"
        placeholder="Enter diagram: e.g. Plan > Execute > Review"
      ></textarea>
      <span class="widget-diagram-hint"
        >Use <code>&gt;</code> between boxes, one flow per line</span
      >
    </div>
    <div v-else-if="!modelValue" class="widget-diagram-empty">—</div>
    <svg
      v-else
      :width="svgData.width"
      :height="svgData.height"
      class="widget-diagram-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
        </marker>
      </defs>
      <g>
        <path
          v-for="(arrow, i) in svgData.arrows"
          :key="'a' + i"
          :d="arrowPath(arrow.from, arrow.to)"
          fill="none"
          stroke="#64748b"
          stroke-width="1.5"
          marker-end="url(#arrowhead)"
        />
      </g>
      <g>
        <rect
          v-for="box in svgData.boxes"
          :key="box.id"
          :x="box.x"
          :y="box.y"
          :width="box.w"
          :height="box.h"
          :rx="R"
          :ry="R"
          fill="#f8fafc"
          stroke="#cbd5e1"
          stroke-width="1.5"
        />
        <text
          v-for="box in svgData.boxes"
          :key="'t' + box.id"
          :x="box.x + box.w / 2"
          :y="box.y + box.h / 2 + 4"
          text-anchor="middle"
          font-family="system-ui, sans-serif"
          font-size="12"
          fill="#1e293b"
        >
          {{ box.label }}
        </text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.widget-diagram {
  font-family: system-ui, sans-serif;
}
.widget-diagram-edit {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.widget-diagram-textarea {
  width: 100%;
  min-height: 60px;
  padding: 0.5rem;
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #fafbfc;
  resize: vertical;
  outline: none;
  color: #1e293b;
}
.widget-diagram-textarea:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
  background: #fff;
}
.widget-diagram-hint {
  font-size: 10px;
  color: #94a3b8;
  font-style: italic;
}
.widget-diagram-hint code {
  font-family: 'Geist Mono', 'SF Mono', 'Fira Code', monospace;
  font-size: 10px;
  background: #f1f5f9;
  padding: 0.05rem 0.25rem;
  border-radius: 2px;
}
.widget-diagram-svg {
  max-width: 100%;
  overflow: visible;
}
.widget-diagram-empty {
  font-size: 13px;
  color: #94a3b8;
}
</style>
