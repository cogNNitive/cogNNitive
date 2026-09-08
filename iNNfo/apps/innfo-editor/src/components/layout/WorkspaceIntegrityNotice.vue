<script setup lang="ts">
/**
 * WorkspaceIntegrityNotice — passive, dismissible workspace-level integrity
 * report surface (AD-6). Three visually distinct bands per Resolved Decision 5:
 *
 *   invalid           — aggregate.invalid > 0 (validation errors). The ONLY
 *                       band that uses the error treatment.
 *   informational     — version-status-only findings (upgrade-available /
 *                       ahead / unlisted / unpinned) or warnings, never errors.
 *   cannot-determine  — unknown / not-checked / offline, sourced from
 *                       report.degraded. NEVER rendered as "invalid".
 *
 * Rendered by WorkspaceDashboard.vue. Non-blocking: it never mutates a file
 * and never prevents opening or editing the workspace.
 */
import { ref } from 'vue'
import type { WorkspaceIntegrityReport } from '@cognnitive/innfo-core'
import { Check, Copy, X } from 'lucide-vue-next'

const props = defineProps<{ report: WorkspaceIntegrityReport | null }>()

const dismissed = ref(false)
const copied = ref(false)

const hasInvalid = (): boolean => (props.report?.aggregate.invalid ?? 0) > 0

const hasInformational = (): boolean => {
  const report = props.report
  if (!report) return false
  if ((report.aggregate.withWarnings ?? 0) > 0) return true
  const vs = report.aggregate.versionStatus ?? {}
  return (
    (vs['upgrade-available'] ?? 0) > 0 ||
    (vs.ahead ?? 0) > 0 ||
    (vs.unlisted ?? 0) > 0 ||
    (vs.unpinned ?? 0) > 0
  )
}

const hasCannotDetermine = (): boolean => {
  const report = props.report
  if (!report) return false
  if (report.offline) return true
  if ((report.degraded ?? []).length > 0) return true
  const vs = report.aggregate.versionStatus ?? {}
  const freshness = report.aggregate.freshness ?? {}
  return (vs.unknown ?? 0) > 0 || (freshness['not-checked'] ?? 0) > 0 || (freshness.unknown ?? 0) > 0
}

function buildSummaryPrompt(): string {
  const report = props.report
  if (!report) return ''
  const aggregate = report.aggregate
  const lines = [
    `innfo: Workspace integrity check for ${aggregate.modelsScanned} model(s):`,
    `- ${aggregate.invalid} model(s) with validation errors`,
    `- ${aggregate['withWarnings'] ?? 0} model(s) with warnings`,
  ]
  for (const status of Object.keys(aggregate.versionStatus ?? {})) {
    const count = aggregate.versionStatus[status as keyof typeof aggregate.versionStatus]
    if (count > 0) lines.push(`- ${count} ${status}`)
  }
  if (report.offline) lines.push('- offline: template catalog unreachable')
  return lines.join('\n')
}

async function copySummary(): Promise<void> {
  const text = buildSummaryPrompt()
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard unavailable — ignore, the notice stays passive
  }
}
</script>

<template>
  <div
    v-if="report && !dismissed"
    data-testid="integrity-notice"
    class="relative rounded-xl border p-4 space-y-3"
    :class="
      hasInvalid()
        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800/40'
        : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
    "
  >
    <button
      data-testid="integrity-dismiss"
      aria-label="Dismiss workspace integrity notice"
      class="absolute top-3 right-3 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
      @click="dismissed = true"
    >
      <X class="w-3.5 h-3.5" />
    </button>

    <div class="space-y-1 pr-6">
      <p class="text-3xs font-semibold uppercase tracking-wider" :class="hasInvalid() ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'">
        Workspace integrity
      </p>
      <p class="text-2xs text-slate-500 dark:text-slate-400">
        {{ report.aggregate.modelsScanned }} model(s) scanned ·
        {{ report.aggregate.invalid }} with validation errors
      </p>
    </div>

    <!-- Band 1: invalid — the ONLY error treatment -->
    <div
      v-if="hasInvalid()"
      data-testid="integrity-band-invalid"
      class="flex items-start gap-2.5 rounded-lg bg-red-100/70 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 px-3 py-2.5"
    >
      <div>
        <p class="text-2xs font-semibold text-red-700 dark:text-red-400">
          {{ report.aggregate.invalid }} model(s) have validation errors
        </p>
        <p class="text-2xs text-red-600/80 dark:text-red-400/80 leading-relaxed">
          Check each model's validation report to review the errors. The workspace remains fully editable.
        </p>
      </div>
    </div>

    <!-- Band 2: informational — version status / warnings, never failures -->
    <div
      v-if="hasInformational() && !hasInvalid()"
      data-testid="integrity-band-informational"
      class="flex items-start gap-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 px-3 py-2.5"
    >
      <div class="space-y-1">
        <p class="text-2xs font-semibold text-amber-700 dark:text-amber-300">
          Template version updates or warnings
        </p>
        <p class="text-2xs text-amber-600/80 dark:text-amber-400/80 leading-relaxed">
          <template v-for="(count, status) in report.aggregate.versionStatus" :key="status">
            <span v-if="count > 0" class="inline-flex items-center gap-1 mr-2">
              {{ count }} {{ status }}
            </span>
          </template>
          <span v-if="(report.aggregate.withWarnings ?? 0) > 0">
            {{ report.aggregate.withWarnings }} model(s) with warnings
          </span>
        </p>
        <p class="text-2xs text-amber-600/60 dark:text-amber-400/60">
          These statuses are informational, not failures.
        </p>
      </div>
    </div>

    <!-- Band 3: cannot determine — offline / unknown / not-checked, distinct from invalid -->
    <div
      v-if="hasCannotDetermine()"
      data-testid="integrity-band-cannot-determine"
      class="flex items-start gap-2.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5"
    >
      <div>
        <p class="text-2xs font-semibold text-slate-600 dark:text-slate-300">
          Some checks could not be determined
        </p>
        <p class="text-2xs text-slate-500 dark:text-slate-400 leading-relaxed">
          <span v-if="report.offline">Offline — the template catalog and remote checks were unreachable.</span>
          <span v-else-if="report.degraded.length">Not checked on this platform.</span>
          <span v-else>Unknown.</span>
        </p>
      </div>
    </div>

    <!-- Copyable innfo: prompt (mirrors the template-version badge pattern) -->
    <div class="flex items-center justify-end">
      <button
        data-testid="integrity-copy-prompt"
        @click="copySummary"
        class="inline-flex items-center gap-1.5 text-2xs font-medium px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
      >
        <Check v-if="copied" class="w-3 h-3" />
        <Copy v-else class="w-3 h-3" />
        {{ copied ? 'Copied' : 'Copy summary prompt' }}
      </button>
    </div>
  </div>
</template>