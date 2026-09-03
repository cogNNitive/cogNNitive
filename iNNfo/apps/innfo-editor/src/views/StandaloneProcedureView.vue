<template>
  <div class="min-h-screen flex flex-col bg-slate-900 text-slate-100 font-sans antialiased">
    <!-- Top Minimal Navigation Bar -->
    <header
      class="h-12 px-6 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-xs"
        >
          P
        </div>
        <span class="text-xs font-bold text-slate-200 tracking-wide uppercase">
          iNNfo Procedure Viewer
          <span class="text-slate-500 text-3xs lowercase font-normal">(Standalone)</span>
        </span>
      </div>

      <div class="flex items-center gap-3 text-xs">
        <a
          href="/app/workspace"
          class="px-2.5 py-1 rounded text-2xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
        >
          Open Workspace Editor &rarr;
        </a>
      </div>
    </header>

    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0">
      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex flex-col items-center justify-center gap-3">
        <div
          class="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"
        ></div>
        <p class="text-xs text-slate-400 font-medium">Loading Procedure Model...</p>
      </div>

      <!-- Error State -->
      <div
        v-else-if="error"
        class="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto"
      >
        <div
          class="w-12 h-12 rounded-full bg-rose-950/60 text-rose-400 flex items-center justify-center mb-3"
        >
          !
        </div>
        <h3 class="text-sm font-bold text-rose-300 mb-1">Failed to load Procedure Model</h3>
        <p class="text-xs text-slate-400 mb-4">{{ error }}</p>
        <button
          @click="loadModel"
          class="px-3.5 py-1.5 rounded-md text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
        >
          Retry
        </button>
      </div>

      <!-- Rendered Procedure Extension -->
      <GuidedProcedureView v-else :context="standaloneAdapter.context.value" :standalone="true" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { normalizeSingleModel } from '@cognnitive/innfo-core'
import GuidedProcedureView from '../components/editor/GuidedProcedureView.vue'
import { useStandaloneExtensionAdapter } from '../extensions/adapters/standaloneAdapter'

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)

const standaloneAdapter = useStandaloneExtensionAdapter()

const canonicalSampleMarkdown = `---
specification_version: "V_0-2-0"
specification_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_0-2-0"
title: "Code Review Process"
---

# _NN index
* [[Work]]
* [[Roles]]
* [[Artifact]]
* [[Tools]]

# _NN Work
* _NN Work: Standard Code Review Process
  next: "Emergency Hotfix Process"
  Standard code review procedure for the engineering team. Every pull request must go through at least one review before merging to main.

* _NN Work: Open Pull Request
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: event
  next: "Assign Reviewer"
  output: "Pull Request"
  tool: "GitHub"
  \`\`\`
  Author creates a PR with a descriptive title and summary of changes.

* _NN Work: Assign Reviewer
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: task
  next: "Review Code Changes"
  output: "Review Assignment"
  tool: "GitHub"
  \`\`\`
  A reviewer is auto-assigned based on code ownership or team rotation.

* _NN Work: Review Code Changes
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: task
  next: "Approve or Request Changes"
  input: "Pull Request"
  output: "Review Comments"
  tool: "GitHub"
  \`\`\`
  Reviewer checks logic correctness, test coverage, and code quality.

* _NN Work: Approve or Request Changes
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: decision
  condition: "No blocking issues"
  next: "Merge to Main"
  input: "Review Comments"
  \`\`\`
  If no blocking issues remain, the reviewer approves the pull request.

* _NN Work: Merge to Main
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: event
  next: "Close Source Branch"
  input: "Approved PR"
  output: "Merged PR"
  tool: "GitHub"
  \`\`\`
  Squash-merge the approved PR into main branch.

* _NN Work: Close Source Branch
  \`\`\`yaml
  parent: "Standard Code Review Process"
  step_type: task
  input: "Merged PR"
  output: "Branch Closure"
  tool: "GitHub"
  \`\`\`
  The source branch is deleted automatically after merge.

* _NN Work: Emergency Hotfix Process
  next: "Release Review Process"
  Expedited process for critical production bugs.

* _NN Work: Create Hotfix Branch
  \`\`\`yaml
  parent: "Emergency Hotfix Process"
  step_type: task
  next: "Request Expedited Review"
  output: "Hotfix Branch"
  tool: "GitHub"
  \`\`\`
  Branch from main with a hotfix prefix and minimal targeted changes.

* _NN Work: Request Expedited Review
  \`\`\`yaml
  parent: "Emergency Hotfix Process"
  step_type: task
  next: "Bypass Standard Review"
  input: "Hotfix Branch"
  output: "Incident Report"
  \`\`\`
  Request expedited review in the incident channel.

* _NN Work: Bypass Standard Review
  \`\`\`yaml
  parent: "Emergency Hotfix Process"
  step_type: decision
  condition: "P0 incident + maintainer authorisation"
  next: "Deploy to Production"
  input: "Hotfix Branch"
  \`\`\`
  If P0 incident, on-call engineer gives fast track go/no-go.

* _NN Work: Deploy to Production
  \`\`\`yaml
  parent: "Emergency Hotfix Process"
  step_type: event
  input: "Approved Hotfix"
  output: "Deployment Report"
  tool: "CI Pipeline"
  \`\`\`
  Deploy immediately via CI pipeline.

# _NN Roles
* _NN Roles: Author
* _NN Roles: Reviewer
* _NN Roles: Maintainer
* _NN Roles: On-Call Engineer

# _NN Artifact
* _NN Artifact: Pull Request
* _NN Artifact: Review Comments
* _NN Artifact: Review Assignment
* _NN Artifact: Hotfix Branch
* _NN Artifact: Merged PR

# _NN Tools
* _NN Tools: GitHub
* _NN Tools: CI Pipeline

# _NN matrices: work-roles matrix
| Work \\ Roles | Author | Reviewer | Maintainer | On-Call Engineer |
| :--- | :---: | :---: | :---: | :---: |
| Open Pull Request | Responsible | - | - | - |
| Assign Reviewer | - | - | Responsible | - |
| Review Code Changes | Consulted | Responsible | Accountable | - |
| Approve or Request Changes | Informed | Consulted | Responsible | - |
| Merge to Main | Informed | Informed | Accountable | - |
| Close Source Branch | Responsible | - | - | - |
| Create Hotfix Branch | Responsible | - | - | Consulted |
| Request Expedited Review | Responsible | - | - | Accountable |
| Bypass Standard Review | Responsible | - | Accountable | Consulted |
| Deploy to Production | Consulted | - | Accountable | Responsible |
`

async function loadModel() {
  loading.value = true
  error.value = null

  try {
    const targetUrl = route.query.url as string | undefined

    let markdown = canonicalSampleMarkdown
    let sourceId = 'CodeReviewProcess'

    if (targetUrl) {
      sourceId = targetUrl.split('/').pop()?.replace(/\.md$/i, '') || 'ProcedureModel'
      const response = await window.fetch(targetUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      markdown = await response.text()
    }

    const { nodes } = normalizeSingleModel(
      markdown,
      targetUrl || 'sample://CodeReviewProcess',
      sourceId,
    )
    standaloneAdapter.setNodes(nodes as any)
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadModel()
})

watch(
  () => route.query.url,
  () => {
    loadModel()
  },
)
</script>
