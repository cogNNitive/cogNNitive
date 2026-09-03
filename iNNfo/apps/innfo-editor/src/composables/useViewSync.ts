import { watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore, type ActiveView } from '../stores/uiStore'

const VALID_VIEWS: ActiveView[] = [
  'editor',
  'graph',
  'matrices',
  'info',
  'ai-guide',
  'guided-procedure',
]

/**
 * Syncs `uiStore.activeView` with the `?view=` query parameter on the
 * workspace route so that browser back/forward navigates between views
 * instead of jumping to the homepage.
 *
 * - **Store → URL**: when the active view changes (via sidebar, header, or
 *   internal code), a new history entry is pushed with the updated query.
 * - **URL → Store**: when the user navigates back/forward, the query param
 *   is read and the store is updated.
 * - **Guard**: a `updating` flag prevents infinite update loops between
 *   the two sync directions.
 */
export function useViewSync(): void {
  const route = useRoute()
  const router = useRouter()
  const uiStore = useUiStore()

  let updating = false

  // URL → Store: when route query changes via back/forward
  watch(
    () => [route.query.view, route.query.model],
    ([view, model]) => {
      if (updating) return
      updating = true
      if (typeof view === 'string' && VALID_VIEWS.includes(view as ActiveView)) {
        uiStore.setActiveView(view as ActiveView)
      }
      if (typeof model === 'string' && model) {
        uiStore.setActiveModel(model)
      }
      updating = false
    },
  )

  // Store → URL: update query when view or activeModelId changes
  watch(
    () => [uiStore.activeView, uiStore.activeModelId],
    ([view, model]) => {
      if (updating) return
      updating = true
      const query: Record<string, any> = { ...route.query, view }
      if (model) {
        query.model = model
      } else {
        delete query.model
      }
      router.replace({
        query,
        hash: window.location.hash || undefined,
      })
      updating = false
    },
  )

  // On mount, seed the URL with the current view and model if present
  onMounted(() => {
    const viewParam = route.query.view as string | undefined
    const modelParam = route.query.model as string | undefined
    if (viewParam && VALID_VIEWS.includes(viewParam as ActiveView)) {
      uiStore.setActiveView(viewParam as ActiveView)
    }
    if (modelParam) {
      uiStore.setActiveModel(modelParam)
    } else {
      router.replace({
        query: { ...route.query, view: uiStore.activeView, model: uiStore.activeModelId || undefined },
        hash: window.location.hash || undefined,
      })
    }
  })
}
