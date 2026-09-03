import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import { useWorkspaceStore } from '../stores/workspaceStore'
import HomeView from '../views/HomeView.vue'
import WorkspaceView from '../views/WorkspaceView.vue'
import InfoDocView from '../views/InfoDocView.vue'

export const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/innfo-doc', alias: '/info-doc', name: 'innfo-doc', component: InfoDocView },
  {
    path: '/workspace',
    name: 'workspace',
    component: WorkspaceView,
    meta: { requiresHandle: true },
  },
  {
    path: '/view/procedure',
    alias: ['/standalone/procedure'],
    name: 'view-procedure',
    component: () => import('../views/StandaloneProcedureView.vue'),
    meta: { requiresHandle: false },
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

/**
 * Gates routes on workspaceStore. Navigating between nodes/routes must
 * never trigger a second parse pass (R1) — this guard only checks state;
 * it never calls `open()` or triggers parsing itself.
 *
 * Accepts workspaces with a directory handle OR content already parsed
 * via URL load (hasParsed). URL-loaded workspaces have no handle but
 * still contain valid model data in modelStore.
 */
router.beforeEach((to: RouteLocationNormalized) => {
  if (to.meta?.requiresHandle) {
    const workspaceStore = useWorkspaceStore()
    if (!workspaceStore.hasHandle && !workspaceStore.hasParsed) {
      return { name: 'home', query: to.query, hash: to.hash }
    }
  }
  return true
})
