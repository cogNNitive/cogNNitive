import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach } from 'vitest'

// `fake-indexeddb/auto` installs ONE shared database on globalThis, and this
// project runs Vitest with `pool: 'forks'` + `singleFork: true`, so every test
// file shares that instance for the whole run. A file that persists a workspace
// (the HomeView resume specs) therefore leaks it into files that mount a view
// which restores from storage, failing at random depending on file order.
//
// Handing each test a fresh factory (and a clean localStorage) keeps storage
// state per-test rather than per-run.
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  try {
    globalThis.localStorage?.clear()
  } catch {
    // Not every environment exposes localStorage; nothing to reset there.
  }
})
