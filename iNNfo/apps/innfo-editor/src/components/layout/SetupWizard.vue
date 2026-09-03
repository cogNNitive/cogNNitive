<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkspaceStore } from '../../stores/workspaceStore'
import { addToHistory } from '../../stores/historyStore'
import { useUrlDocLoader } from '../../composables/useUrlDocLoader'
import type { DirectoryHandleLike } from '../../model/fs-types'
import { buildFormatFilename } from '../../utils/version'
import { SAMPLE_BASE } from '../../config/samples'
import {
  type TemplateChoice,
  initWorkspaceStructure,
  createIndexMd,
  prepopulateSpecs,
  getStarterByTemplate,
} from '../../composables/useWorkspaceScaffolding'

interface SampleInfo {
  id: string
  template: string
  templateLabel: string
  sampleName: string
  description: string
  url: string
}

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()

const currentStep = ref(0)
const error = ref<string | null>(null)
const busy = ref(false)
const folderHandle = ref<DirectoryHandleLike | null>(null)
const folderPath = ref('')
const templateChoice = ref<TemplateChoice>('blank')
const modelName = ref('')

function clearFolderSelection() {
  folderHandle.value = null
  folderPath.value = ''
}

const STARTER_BASE = `${SAMPLE_BASE}/`

const samples: SampleInfo[] = [
  {
    id: 'sample-business',
    template: 'business',
    templateLabel: 'Business',
    sampleName: 'Ghostbusters',
    description: 'Ghost-catching franchise: SWOT, risks, market, finance, legal, and operations.',
    url: `${SAMPLE_BASE}/business/samples/Ghostbusters_V_0-2-0_business_NN.md`,
  },
  {
    id: 'sample-procedures',
    template: 'procedures',
    templateLabel: 'Procedures',
    sampleName: 'Ghostbusters',
    description:
      'Ghost containment protocol: roles, step-by-step workflow, tool bindings, and recovery path.',
    url: `${SAMPLE_BASE}/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md`,
  },
  {
    id: 'sample-organization',
    template: 'organization',
    templateLabel: 'Organization',
    sampleName: 'Ghostbusters Inc.',
    description: 'Team structure: positions, roles, members, reporting lines, and skills matrix.',
    url: `${SAMPLE_BASE}/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md`,
  },
]

const templateOptions = computed(() => [
  {
    id: 'blank' as TemplateChoice,
    label: 'Start from scratch',
    desc: 'Begin with an empty model and define everything yourself.',
    icon: 'blank',
  },
  {
    id: 'business' as TemplateChoice,
    label: 'Business',
    desc: 'Model your business idea: market, team, finance, operations, and strategy.',
    icon: 'business',
  },
  {
    id: 'procedures' as TemplateChoice,
    label: 'Procedures',
    desc: 'Define step-by-step workflows, roles, artifacts, and decision points.',
    icon: 'procedures',
  },
  {
    id: 'organization' as TemplateChoice,
    label: 'Organization',
    desc: 'Structure positions, roles, members, and reporting lines.',
    icon: 'organization',
  },
  {
    id: 'sandbox' as TemplateChoice,
    label: 'Open a sandbox',
    desc: 'Play with a throwaway model to test the editor. Nothing is saved until you click "Save to folder".',
    icon: 'sandbox',
  },
])

const fileName = computed(() => {
  if (templateChoice.value === 'blank' || templateChoice.value === 'sandbox') return ''
  const name = modelName.value.trim() || 'MyModel'
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '_')
  return buildFormatFilename(safe, templateChoice.value, { major: 1, minor: 0, patch: 0 })
})

function goToStep(step: number): void {
  error.value = null
  currentStep.value = step
}

async function loadSample(sample: SampleInfo): Promise<void> {
  error.value = null
  busy.value = true
  try {
    await workspaceStore.loadFromUrl(sample.url, sample.template)
    await addToHistory(`${sample.sampleName} Sample`, null as unknown as any)
    // Store that user has explored samples
    localStorage.setItem('nn_has_explored_samples', 'true')
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

async function openFolderPicker(): Promise<void> {
  error.value = null
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: { id?: string }) => Promise<DirectoryHandleLike>
    }
  ).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    const handle = await picker.call(window, { id: 'innfo-workspace' })
    folderHandle.value = handle
    folderPath.value = handle.name
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  }
}

async function createFolder(): Promise<void> {
  error.value = null
  const picker = (
    window as unknown as {
      showDirectoryPicker?: (opts?: { id?: string }) => Promise<DirectoryHandleLike>
    }
  ).showDirectoryPicker
  if (!picker) {
    error.value = 'This browser does not support the File System Access API. Use Chrome or Edge.'
    return
  }
  try {
    // Browser FS API creates a directory when the user picks a new folder
    const handle = await picker.call(window, { id: 'innfo-create' })
    folderHandle.value = handle
    folderPath.value = handle.name
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return
    error.value = err instanceof Error ? err.message : String(err)
  }
}

async function finishWizard(): Promise<void> {
  error.value = null
  busy.value = true
  try {
    if (templateChoice.value === 'sandbox') {
      const sandboxUrl = `${STARTER_BASE}Sandbox_V_1-0-0_starter_NN.md`
      await workspaceStore.loadFromUrl(sandboxUrl)
      await addToHistory('Sandbox', null as unknown as any)
      router.push('/workspace')
      return
    }

    if (!folderHandle.value) {
      error.value = 'Please select a folder first.'
      busy.value = false
      return
    }

    const handle = folderHandle.value
    const name = modelName.value.trim() || 'MyModel'

    // Create workspace structure (directories + support files)
    await initWorkspaceStructure(handle, name, templateChoice.value)

    // Pre-populate specs/ with the full spec chain so both the editor
    // and AI agents have local copies without fetching on first use.
    if (templateChoice.value !== 'blank') {
      const starter = getStarterByTemplate(templateChoice.value)
      if (starter) {
        await prepopulateSpecs(handle, starter.url)
      }
    }

    if (templateChoice.value === 'blank') {
      const loader = useUrlDocLoader()
      const frontmatter = {
        spec_version: 'V_0-2-0',
        model_version: 'V_0-1-0',
        title: name,
        template: { name: 'business', version: 'V_0-2-0' },
        concepts: [{ name: 'Topic', type: 'topic', icon: 'wrench', color: '#059669' }],
        markers: [],
      }
      await loader.loadFromFrontmatter(frontmatter, `${name}_NN.md`)
      await createIndexMd(handle, name, 'business')
      workspaceStore.hasParsed = true
      workspaceStore.hasHandle = true
      workspaceStore.handle = handle
      workspaceStore.parseCount += 1
      await addToHistory(name, null as unknown as any)
      router.push('/workspace')
      return
    }

    // Template-based creation
    const starter = getStarterByTemplate(templateChoice.value)
    if (!starter) {
      error.value = `Template "${templateChoice.value}" not found.`
      busy.value = false
      return
    }

    const response = await window.fetch(starter.url)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    let content = await response.text()
    content = content.replace(/^title:.*$/m, `title: "${name}"`)

    const filename =
      fileName.value ||
      `${name.replace(/[^a-zA-Z0-9._-]/g, '_')}_V_1-0-0_${templateChoice.value}_NN.md`
    const fileHandle = await handle.getFileHandle(filename, { create: true })
    if (!fileHandle.createWritable) throw new Error('File handle does not support writing')
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()

    // Create index.md pointing to the model
    await createIndexMd(handle, name, templateChoice.value)

    await workspaceStore.open(handle)
    await addToHistory(handle.name, handle)
    router.push('/workspace')
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    busy.value = false
  }
}

// Handle ?createTemplate=X from SampleBanner CTA
onMounted(() => {
  const createTemplate = route.query.createTemplate as string | undefined
  if (createTemplate) {
    const validTemplates: TemplateChoice[] = ['business', 'procedures', 'organization']
    if (validTemplates.includes(createTemplate as TemplateChoice)) {
      templateChoice.value = createTemplate as TemplateChoice
      currentStep.value = 4
    }
    router.replace({ query: {} })
  }
})

const stepTitles = [
  'Before you start',
  'Welcome',
  'Choose a folder',
  'Workspace contents',
  'Choose how to start',
  'Name your model',
  "You're all set",
]
</script>

<template>
  <div class="wizard">
    <!-- Step indicator -->
    <div class="wizard__progress">
      <div
        v-for="(title, i) in stepTitles"
        :key="i"
        class="wizard__step-dot"
        :class="{
          'wizard__step-dot--active': i === currentStep,
          'wizard__step-dot--done': i < currentStep,
        }"
        :title="title"
      >
        <span v-if="i < currentStep">&#10003;</span>
        <span v-else-if="i === currentStep">{{ i + 1 }}</span>
        <span v-else>{{ i + 1 }}</span>
      </div>
    </div>

    <div class="wizard__body">
      <!-- ---------------------------------------- -->
      <!-- STEP 0: Before you start                -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 0" class="wizard__step">
        <h2 class="wizard__title">Before you start...</h2>
        <p class="wizard__desc">
          Do you know what an iNNfo model looks like? We recommend exploring a completed model first
          — it takes 2 minutes and helps you understand how everything works.
        </p>

        <div class="wizard__samples">
          <button
            v-for="s in samples"
            :key="s.id"
            class="wizard__sample-card"
            :disabled="busy"
            @click="loadSample(s)"
          >
            <div class="wizard__sample-label">
              <span class="wizard__sample-badge">{{ s.templateLabel }}</span>
              <strong class="wizard__sample-name">{{ s.sampleName }}</strong>
            </div>
            <p class="wizard__sample-desc">{{ s.description }}</p>
          </button>
        </div>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--prominent" @click="goToStep(1)">
            I already know — create a model
          </button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 1: Welcome                         -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 1" class="wizard__step">
        <div class="wizard__icon">🧠</div>
        <h2 class="wizard__title">Welcome to iNNfo</h2>
        <p class="wizard__desc">
          iNNfo lets you create structured knowledge models — like a database for ideas, processes,
          and data. Your models are plain Markdown files stored on YOUR computer — nothing is
          uploaded to the cloud.
        </p>
        <p class="wizard__desc">We'll guide you through the setup in just a few steps.</p>

        <div class="wizard__actions">
          <button class="wizard__btn" @click="goToStep(2)">Get started &#8594;</button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 2: Choose a folder                 -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 2" class="wizard__step">
        <div class="wizard__icon">📁</div>
        <h2 class="wizard__title">Where to save your models</h2>
        <p class="wizard__desc">
          Your models are saved as plain Markdown files in a folder on your computer. We recommend
          creating a folder in your Documents directory:
        </p>
        <code class="wizard__path">~/Documents/iNNfo/</code>

        <div v-if="folderHandle" class="wizard__folder-selected">
          <span class="wizard__folder-icon">&#128193;</span>
          <span>{{ folderPath }}</span>
          <button class="wizard__btn-link" @click="clearFolderSelection">Change</button>
        </div>

        <div v-else class="wizard__folder-actions">
          <button class="wizard__btn" @click="openFolderPicker">Choose existing folder</button>
          <button class="wizard__btn wizard__btn--outline" @click="createFolder">
            Create new folder
          </button>
        </div>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--ghost" @click="goToStep(1)">Back</button>
          <button class="wizard__btn" :disabled="!folderHandle" @click="goToStep(3)">
            Next &#8594;
          </button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 3: Workspace contents              -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 3" class="wizard__step">
        <div class="wizard__icon">📄</div>
        <h2 class="wizard__title">Workspace contents</h2>
        <p class="wizard__desc">iNNfo will create these files and folders in your workspace:</p>

        <div class="wizard__file-list">
          <div class="wizard__file">
            <code>iNNfo.html</code>
            <span>Bookmark to launch the application — redirects to the editor URL</span>
          </div>
          <div class="wizard__file">
            <code>README.md</code>
            <span>Overview of your workspace structure</span>
          </div>
          <div class="wizard__file">
            <code>index.md</code>
            <span>Entry point that maps your model structure</span>
          </div>
          <div
            class="wizard__file"
            v-if="templateChoice !== 'blank' && templateChoice !== 'sandbox'"
          >
            <code>{{ fileName || 'MyModel_V_1-0-0_template_NN.md' }}</code>
            <span>Your model file with semantic versioning and template type</span>
          </div>
          <div class="wizard__file">
            <code>specs/</code>
            <span>Template specifications downloaded automatically</span>
          </div>
        </div>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--ghost" @click="goToStep(2)">Back</button>
          <button class="wizard__btn" @click="goToStep(4)">Next &#8594;</button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 4: Blank, template, or sandbox     -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 4" class="wizard__step">
        <div class="wizard__icon">🎨</div>
        <h2 class="wizard__title">How would you like to start?</h2>

        <div class="wizard__template-grid">
          <button
            v-for="opt in templateOptions"
            :key="opt.id"
            class="wizard__template-card"
            :class="{ 'wizard__template-card--selected': templateChoice === opt.id }"
            @click="templateChoice = opt.id"
          >
            <div class="wizard__template-icon">
              <span v-if="opt.icon === 'blank'">⬜</span>
              <span v-else-if="opt.icon === 'business'">🏢</span>
              <span v-else-if="opt.icon === 'procedures'">📋</span>
              <span v-else-if="opt.icon === 'organization'">👥</span>
              <span v-else-if="opt.icon === 'sandbox'">🧪</span>
            </div>
            <div class="wizard__template-info">
              <strong>{{ opt.label }}</strong>
              <p>{{ opt.desc }}</p>
            </div>
          </button>
        </div>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--ghost" @click="goToStep(3)">Back</button>
          <button v-if="templateChoice !== 'sandbox'" class="wizard__btn" @click="goToStep(5)">
            Next &#8594;
          </button>
          <button v-else class="wizard__btn" :disabled="busy" @click="finishWizard">
            {{ busy ? 'Loading...' : 'Open sandbox 🧪' }}
          </button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 5: Name your model                 -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 5" class="wizard__step">
        <div class="wizard__icon">✏️</div>
        <h2 class="wizard__title">Name your model</h2>

        <label class="wizard__label">
          <span>Model name</span>
          <input
            v-model="modelName"
            type="text"
            class="wizard__input"
            placeholder="MyModel"
            @keydown.enter="finishWizard"
          />
        </label>

        <div v-if="fileName" class="wizard__file-preview">
          <span class="wizard__file-preview-label">Filename:</span>
          <code>{{ fileName }}</code>
        </div>

        <div class="wizard__actions">
          <button class="wizard__btn wizard__btn--ghost" @click="goToStep(4)">Back</button>
          <button class="wizard__btn" :disabled="busy" @click="finishWizard">
            {{ busy ? 'Creating...' : 'Create model &#128640;' }}
          </button>
        </div>
      </div>

      <!-- ---------------------------------------- -->
      <!-- STEP 6: You're all set                  -->
      <!-- ---------------------------------------- -->
      <div v-if="currentStep === 6" class="wizard__step">
        <div class="wizard__icon">🎉</div>
        <h2 class="wizard__title">You're all set!</h2>
        <p class="wizard__desc">You can edit your model in two ways:</p>

        <div class="wizard__editors">
          <div class="wizard__editor-card">
            <strong>iNNfo editor</strong>
            <p>
              Open <code>iNNfo.html</code> in your workspace folder to launch the app. Use the full
              UI: tree navigation, graph view, matrices, and structured fields.
            </p>
          </div>
          <div class="wizard__editor-card">
            <strong>AI agent</strong>
            <p>
              Edit via natural language with Claude Code, OpenCode Desktop, or Antigravity. In the
              editor, click <strong>"Use AI"</strong> in the top bar for setup instructions.
            </p>
          </div>
        </div>

        <p class="wizard__tip">
          💡 You can switch between both — changes are reflected immediately.
        </p>

        <div class="wizard__actions">
          <button class="wizard__btn" :disabled="busy" @click="finishWizard">
            {{ busy ? 'Creating...' : 'Open my model &#128640;' }}
          </button>
        </div>
      </div>

      <!-- Error -->
      <p v-if="error" class="wizard__error" role="alert">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.wizard {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
  font-family: system-ui, sans-serif;
}

/* -- Progress dots -- */
.wizard__progress {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
}

.wizard__step-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  background: #e0e0e0;
  color: #999;
  transition: all 0.2s;
}

.wizard__step-dot--active {
  background: #4d0e4e;
  color: #fff;
  box-shadow: 0 0 0 3px rgba(77, 14, 78, 0.15);
}

.wizard__step-dot--done {
  background: #10b981;
  color: #fff;
}

/* -- Body -- */
.wizard__body {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wizard__step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.wizard__icon {
  font-size: 2.5rem;
  text-align: center;
  line-height: 1;
}

.wizard__title {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 800;
  color: #4d0e4e;
  text-align: center;
}

.wizard__desc {
  margin: 0;
  font-size: 14px;
  color: #555;
  line-height: 1.6;
  text-align: center;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
}

/* -- Path suggestion -- */
.wizard__path {
  display: block;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  padding: 0.75rem;
  background: #f5f3ff;
  border: 1px solid #e0d8f0;
  border-radius: 8px;
  color: #4d0e4e;
}

/* -- Folder selection -- */
.wizard__folder-selected {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #166534;
}

.wizard__folder-icon {
  font-size: 1.2rem;
}

.wizard__folder-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

/* -- Sample cards -- */
.wizard__samples {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wizard__sample-card {
  text-align: left;
  padding: 0.75rem 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
}

.wizard__sample-card:hover:not(:disabled) {
  border-color: #4d0e4e;
  box-shadow: 0 2px 8px rgba(77, 14, 78, 0.08);
}

.wizard__sample-card:disabled {
  opacity: 0.5;
  cursor: default;
}

.wizard__sample-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.wizard__sample-badge {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 6px;
  border-radius: 4px;
  background: #f3e5f5;
  color: #4d0e4e;
}

.wizard__sample-name {
  font-size: 15px;
  color: #333;
}

.wizard__sample-desc {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

/* -- File list -- */
.wizard__file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wizard__file {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0.6rem 0.75rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
}

.wizard__file code {
  font-size: 13px;
  font-weight: 600;
  color: #4d0e4e;
}

.wizard__file span {
  font-size: 12px;
  color: #888;
}

.wizard__note {
  font-size: 13px;
  color: #888;
  text-align: center;
  padding: 0.5rem;
  background: #f5f5f5;
  border-radius: 6px;
}

/* -- Template grid -- */
.wizard__template-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wizard__template-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  text-align: left;
  padding: 0.75rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  font-family: system-ui, sans-serif;
  width: 100%;
}

.wizard__template-card:hover {
  border-color: #4d0e4e;
}

.wizard__template-card--selected {
  border-color: #4d0e4e;
  background: #f8f0f8;
}

.wizard__template-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  line-height: 1;
}

.wizard__template-info {
  flex: 1;
  min-width: 0;
}

.wizard__template-info strong {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 2px;
}

.wizard__template-info p {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

/* -- Name input -- */
.wizard__label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}

.wizard__input {
  padding: 0.65rem 0.75rem;
  font-size: 15px;
  font-family: system-ui, sans-serif;
  border: 1px solid #d0d0d0;
  border-radius: 6px;
  outline: none;
  transition: border-color 0.15s;
}

.wizard__input:focus {
  border-color: #4d0e4e;
  box-shadow: 0 0 0 2px rgba(77, 14, 78, 0.1);
}

.wizard__file-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 13px;
  color: #555;
}

.wizard__file-preview-label {
  font-weight: 600;
}

.wizard__file-preview code {
  font-size: 13px;
  color: #4d0e4e;
  font-weight: 600;
}

/* -- Editor cards -- */
.wizard__editors {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.wizard__editor-card {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: #fafafa;
}

.wizard__editor-card strong {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 0.25rem;
}

.wizard__editor-card p {
  margin: 0;
  font-size: 13px;
  color: #888;
  line-height: 1.5;
}

.wizard__editor-card code {
  font-size: 12px;
  color: #4d0e4e;
  font-weight: 600;
}

.wizard__tip {
  font-size: 13px;
  color: #555;
  text-align: center;
  padding: 0.5rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 6px;
}

/* -- Actions -- */
.wizard__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.wizard__btn {
  padding: 0.65rem 1.5rem;
  font-size: 14px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-family: system-ui, sans-serif;
  background: #4d0e4e;
  color: #fff;
  transition: all 0.15s;
}

.wizard__btn:hover:not(:disabled) {
  background: #3a0b3b;
  transform: translateY(-1px);
}

.wizard__btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.wizard__btn--outline {
  background: #fff;
  color: #4d0e4e;
  border: 2px solid #4d0e4e;
}

.wizard__btn--outline:hover:not(:disabled) {
  background: #f8f0f8;
}

.wizard__btn--ghost {
  background: none;
  color: #888;
  font-weight: 600;
}

.wizard__btn--ghost:hover:not(:disabled) {
  color: #4d0e4e;
  background: #f5f5f5;
}

.wizard__btn--prominent {
  background: #4d0e4e;
  color: #fff;
  font-size: 1.1rem;
  padding: 0.85rem 2rem;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(77, 14, 78, 0.3);
}

.wizard__btn--prominent:hover:not(:disabled) {
  background: #3a0b3b;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(77, 14, 78, 0.4);
}

.wizard__btn-link {
  margin-left: auto;
  background: none;
  border: none;
  color: #4d0e4e;
  font-weight: 600;
  cursor: pointer;
  font-size: 13px;
  font-family: system-ui, sans-serif;
}

.wizard__error {
  color: #b00020;
  text-align: center;
  font-size: 14px;
}
</style>
