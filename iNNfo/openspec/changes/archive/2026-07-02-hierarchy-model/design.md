# Design: hierarchy-model

> Follow-up to the archived `deep-integration` change. Authoritative model: `DESIGN_BRIEF.md`
> in this folder (locked). This design refines `deep-integration`'s R5 FOLDER read path only;
> it does not contradict the brief or change `packages/format-core`.

## Technical Approach

The empty-tree defect lives entirely in `parseFolderNode` in
`apps/format-editor/src/model/recursiveParser.ts`. Today that function wraps _both_ the
`_FORMAT.md` read/parse _and_ node creation in a single `try`, and its `catch` ends with
`return` (line 232) — so a directory that lacks `_FORMAT.md` never reaches the
`for await (dirHandle.entries())` recursion. Every real FOLDER model whose type-grouping
directories are bare (`AILab`, `AIProduct`, `Researcher`, `Technology`) loses its whole
subtree and renders an empty tree.

The fix restructures `parseFolderNode` into two independent phases that share nothing but the
node's `qualifiedId`:

1. **Node-creation phase** — always produces a node for the directory. If a parseable
   `_FORMAT.md` exists it is an **element/root-style** node (carries `localMetamodel`,
   `rawContent`, in-file elements). If `_FORMAT.md` is _absent_, it is a **concept/group**
   node (no local metamodel, no raw content, `type: 'concept'`). If `_FORMAT.md` is
   _present but unparseable_, an issue is recorded but a concept/group node is still created
   as a structural placeholder.
2. **Recursion phase** — runs **unconditionally** for every directory node, regardless of
   which branch phase 1 took. This is the load-bearing change: recursion is no longer gated
   behind a successful `_FORMAT.md` parse.

The concept/element distinction is captured with a new optional `kind` discriminator on
`ModelNode` (`'root' | 'concept' | 'element'`) rather than overloading `type`/`storageMode`.
`type` already carries the resolved concept name (e.g. `"AILab"` on `Anthropic`) and must
stay free for that; `storageMode` is orthogonal (a concept node is still `FOLDER`). Metamodel
binding is **enrichment layered on top of the structural node**: when
`resolveEffectiveMetamodel` (already present in `metamodel.ts`) surfaces a concept matching
the bare directory's name, the concept node records the binding; when it cannot (parent-spec
chain is node-only and unwired in the browser), the node stays a structural concept node and
its subtree is fully intact. Binding is never a gate. The tree at any node remains the
**union** of its in-file children (from `normalizeElementsIntoGraph`) and its child
directories, deduplicated through the existing `IdentityRegistry`.

`packages/format-core` is untouched. The write path (`recursiveSerializer.ts`) is untouched.
This is a read-only, additive change plus fixtures and tests.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Where to split the try/catch | Keep one try, add a flag / return early differently vs two independent phases | A single try can't recurse after a `_FORMAT.md` miss without leaking control flow; a flag re-introduces the coupling the defect came from. | **Two phases**: `ensureFolderNode()` (creates the node, classifies it) then an **unconditional** recursion block. Recursion never depends on phase-1 success. |
| Missing vs unparseable `_FORMAT.md` | Treat both identically vs distinguish | Treating both as "concept node, no issue" masks genuinely broken files; treating both as fatal re-creates the defect. | **Distinguish by cause**: _absent_ file (FS `NotFoundError` / "File not found") → concept node, **no** issue. _Present-but-unparseable_ → concept node **and** a recorded issue. Both recurse. |
| Node-kind representation | New `kind` discriminator vs infer from `type`/`localMetamodel`/`rawContent` | Inferring ("no `rawContent` ⇒ concept") is implicit and brittle; the tree, forms, and future serializer all need an explicit answer. `type` is needed for the resolved concept name. | **Add optional `kind: 'root' \| 'concept' \| 'element'`** to `ModelNode` (additive, undefined-tolerant for old graphs). Root = FILE/FOLDER root, Concept = bare dir / `# _F` section, Element = `type:`-bearing dir / index-block instance. |
| Concept node payload | Reuse full root shape vs minimal shape | A concept node has no own file: giving it `rawContent`/`localMetamodel` implies a serializable document it doesn't have. | **Minimal**: `kind:'concept'`, `storageMode:'FOLDER'`, `type:'concept'` (or the bound metamodel concept name when resolved), **no** `rawContent`, **no** `localMetamodel`, empty `fields`/`markers`. Transparent to `resolveEffectiveMetamodel`'s ancestor walk. |
| Metamodel binding | Wire browser-safe parent-spec resolution now vs structural-first + optional enrichment | Wiring `resolveParentChain`/`getSpecForLevel` into the browser is out of scope and blocked by their `node:fs`/`fetch` deps. | **Structural first, enrichment second.** Node exists unconditionally. Bind to a concept only when `resolveEffectiveMetamodel(parentId)` already yields a matching concept **from in-graph `localMetamodel`** (e.g. root/ancestor declared it inline). No node-only resolver at runtime; parent-spec catalog concepts remain unbound this slice (structural fallback), which is correct and tested. |
| Union of children | New dedup pass vs reuse `IdentityRegistry` | A parallel dedup would diverge from R11 collision semantics. | **Reuse `IdentityRegistry`.** In-file children register under the folder node's id in `normalizeElementsIntoGraph`; child directories register under the same id in the recursion loop. Same-name clashes flow through existing collision diagnostics + `#n` disambiguation — no double-count, no silent drop. |
| Concept-node binding storage | Overload `type` with concept name vs dedicated field | Overloading `type` loses the distinction between "unbound structural concept" and "resolved concept type". | Add optional **`conceptBinding?: { name: string; source: 'metamodel' | 'structural' }`** to `ModelNode`; `type` stays `'concept'` for structural nodes and can carry the bound name when resolved. Keeps enrichment inspectable and testable. |

## Data Flow

```
parseFolderNode(dirHandle, parentId, sourcePath, ctx)
        │
        ▼
  ── PHASE 1: ensure a node exists (never aborts) ──
  try getFileHandle('_FORMAT.md')
     ├─ ABSENT (NotFoundError) ────────────► create CONCEPT node
     │                                        kind:'concept', type:'concept',
     │                                        no rawContent / localMetamodel
     │                                        (no issue recorded)
     ├─ PRESENT + parseModel OK ───────────► create ELEMENT/ROOT node
     │                                        kind: parentId==null ? 'root' : 'element'
     │                                        rawContent + localMetamodel set,
     │                                        type = frontmatter.type || title || 'folder'
     │                                        normalizeElementsIntoGraph(parsed, id, ...)   ← in-file children (union part A)
     │                                        try metamodel binding (enrichment)
     └─ PRESENT but parseModel THROWS ─────► create CONCEPT node (structural placeholder)
                                              + ctx.issues.push({ path: .../_FORMAT.md, message })
        │
        ▼  (qualifiedId now guaranteed to exist)
  ── PHASE 2: recurse UNCONDITIONALLY ──
  for await ([entryName, entryHandle] of dirHandle.entries())
     ├─ entryName === '_FORMAT.md' → skip
     ├─ directory  → parseFolderNode(entryHandle, qualifiedId, childPath, ctx)   ← child dirs (union part B)
     └─ *_FORMAT.md file → parseFileNode(entryHandle, qualifiedId, childPath, ctx)
        │
        ▼
  Concept binding (when resolvable):
  resolveEffectiveMetamodel(parentId, ctx.nodes).concepts
     └─ find concept.name === dirHandle.name
          ├─ hit  → conceptBinding = { name, source:'metamodel' }; type = concept.name
          └─ miss → conceptBinding = { name: dirHandle.name, source:'structural' } (stays structural)
```

Before/after of the control-flow defect:

```
BEFORE (defective)                        AFTER (fixed)
──────────────────                        ─────────────
try {                                     const { qualifiedId } = ensureFolderNode(...)  // always returns an id
  read+parse _FORMAT.md                   //   ├─ absent      → concept node, no issue
  create node                             //   ├─ ok          → element/root node (+ in-file children)
  normalizeElementsIntoGraph              //   └─ unparseable → concept node + issue
} catch {
  issues.push(...)                        for await (entry of dirHandle.entries()) {     // UNCONDITIONAL
  return   ◄── aborts subtree!              recurse dirs / parse *_FORMAT.md files
}                                         }
for await (entry ...) { recurse }         // (recursion no longer reachable-only-on-success)
```

`ensureFolderNode` classification (pseudocode):

```ts
async function ensureFolderNode(dirHandle, parentId, sourcePath, ctx): Promise<string> {
  const id = ctx.identity.register(parentId, dirHandle.name)
  let formatHandle: FileHandleLike | null = null
  try {
    formatHandle = await dirHandle.getFileHandle(FORMAT_MD)
  } catch (err) {
    if (!isNotFound(err)) { /* unexpected FS error: record issue, still concept node */ ctx.issues.push(...) }
    createConceptNode(id, dirHandle.name, parentId, sourcePath, ctx)   // absent → concept, no issue on NotFound
    bindConcept(id, parentId, dirHandle.name, ctx)
    return id
  }
  try {
    const content = await (await formatHandle.getFile()).text()
    const parsed = parseModel(content)
    createElementNode(id, dirHandle.name, parentId, content, parsed, sourcePath, ctx) // rawContent + localMetamodel
    normalizeElementsIntoGraph(parsed, id, `${sourcePath}/${FORMAT_MD}`, ctx)         // in-file children
    bindConcept(id, parentId, dirHandle.name, ctx)                                    // enrichment (element may still bind by name)
  } catch (err) {
    ctx.issues.push({ path: `${sourcePath}/${FORMAT_MD}`, message: msg(err) })        // present-but-unparseable
    createConceptNode(id, dirHandle.name, parentId, sourcePath, ctx)                  // structural placeholder — children NOT dropped
  }
  return id
}

// isNotFound: true when err is a DOMException 'NotFoundError' (real FS API) OR
// err.message matches /file not found/i (fakeFs + defensive). Everything else is an unexpected error.
```

Key correctness point: the id is registered **once, up front**, so both branches share it and
Phase 2 always has a valid parent id. `createConceptNode` and `createElementNode` do not
re-register.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/format-editor/src/model/recursiveParser.ts` | **Modify (primary)** | Split `parseFolderNode` into `ensureFolderNode` (classify + create) + unconditional recursion. Add `createConceptNode`, `createElementNode`, `isNotFound`, `bindConcept` helpers. Remove the `return` that aborts on missing `_FORMAT.md`. Distinguish absent vs unparseable. |
| `apps/format-editor/src/model/types.ts` | **Modify (additive)** | Add optional `kind?: 'root' \| 'concept' \| 'element'` and `conceptBinding?: { name: string; source: 'metamodel' \| 'structural' }` to `ModelNode`. Both optional so existing graphs/tests remain valid. |
| `apps/format-editor/src/model/metamodel.ts` | **Unchanged** | `resolveEffectiveMetamodel` reused as-is for binding lookups; no signature change. |
| `apps/format-editor/src/model/identity.ts` | **Unchanged** | Reused for union dedup + collision handling. |
| `apps/format-editor/src/components/SidebarTree*.vue` | **Unchanged (this slice)** | Tree already derives from `parentId`/`childIds` and shows `storageMode` + `name`; concept nodes render for free. Optional `kind`-based badge deferred (not required to fix the defect). |
| `apps/format-editor/tests/fixtures/catalog/**` | **New** | Catalog-shaped fixture mirroring `models/AI_Industry_V_1-0-0_catalog`: root `_FORMAT.md` (FOLDER, parent = catalog spec, **no inline concepts**), **bare** `AILab/` dir, `AILab/Anthropic/_FORMAT.md` (`type:"AILab"`). Bare intermediate dir is mandatory. |
| `apps/format-editor/tests/golden/catalog-hierarchy.golden.test.ts` | **New** | Structural/golden assertion of the `AILab` (concept) → `Anthropic` (element, `type:"AILab"`) tree from the fixture. |
| `apps/format-editor/tests/integration/catalog.integration.test.ts` | **New** | Drives `recursiveParse` over a catalog-shaped fake handle end-to-end; asserts a non-empty tree with the concept→element edge and no dropped subtree. Regression lock for the empty-tree defect. |
| `apps/format-editor/tests/unit/recursiveParser.test.ts` | **Modify** | The existing `'Broken'` case (lines 44–68) currently asserts the **defective** behavior (`names).not.toContain('Broken')` on a dir with no `_FORMAT.md`). Update: a `_FORMAT.md`-less dir is now a **concept node that IS present** and whose children recurse. Add a separate present-but-unparseable case that still records an issue and still recurses. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Missing `_FORMAT.md` ⇒ concept node created (`kind:'concept'`), **no** issue, and its children are recursed (walk not aborted). | Vitest + `buildFakeTree` with a bare dir containing a nested `_FORMAT.md` child; assert the child node exists. |
| Unit | Present-but-unparseable `_FORMAT.md` ⇒ concept node **and** a recorded issue **and** children still walked. | `buildFakeTree` with malformed frontmatter + a nested child; assert `issues` non-empty and nested child present. |
| Unit | Concept binding: name matches an in-graph declared concept ⇒ `conceptBinding.source==='metamodel'`; no match ⇒ `'structural'`, node still present. | Two fixtures — one with root inline `concepts:[{name:'AILab'}]`, one without (catalog case). |
| Unit | Union of in-file children + child dirs has no duplicate/dropped nodes; same-name clash flows through `IdentityRegistry` collision + `#n`. | Folder with a `# _F`-declared child **and** a same-named child dir; assert both survive with distinct ids and one collision issue. |
| Golden | `AILab` concept → `Anthropic` element (`type:"AILab"`) from the catalog fixture. | Structural snapshot / explicit assertions on `nodes`, `rootIds`, `childIds`. |
| Integration | `recursiveParse` over a catalog-shaped fake handle yields a **non-empty** tree; `AILab` present as concept, `Anthropic` as its element child; no subtree dropped. | End-to-end over `buildFakeTree`; **regression lock**. |
| Regression | `packages/format-core` suite unchanged; existing editor golden/roundtrip suites still pass. | Run existing vitest. |

**Fixture requirement (do not regress the deep-integration gap):** the archived
`deep-integration` fixtures put a `_FORMAT.md` in **every** directory, which is exactly why
the empty-tree defect was never caught. The new fixture MUST have **bare intermediate
directories** (`AILab/`, `AIProduct/`, ... with no `_FORMAT.md`), copied from the shape of
`models/AI_Industry_V_1-0-0_catalog/`. A minimal but faithful subset (root + one bare
concept dir + one element leaf) is sufficient and cheaper than copying all 21 leaves; copy
at least `AILab/Anthropic` verbatim so `type:`, `fields:`, and `markers:` are real.

## Open Questions

- [ ] `isNotFound` detection: real FS Access API throws `DOMException` with
  `name === 'NotFoundError'`; `fakeFs.getFileHandle` throws a generic `Error('File not
  found: ...')`. The design matches **both** (name check OR `/file not found/i` message).
  Flag for `sdd-tasks`: confirm no other FS driver throws a different not-found shape, else
  broaden the predicate.
- [ ] Concept-node `type` value: `'concept'` sentinel vs the bound metamodel name when
  resolved. Design uses `'concept'` for unbound and lets `bindConcept` overwrite with the
  resolved name. Confirm downstream (NodeForm) tolerates `type:'concept'` gracefully
  (FallbackWidget path). Non-blocking for the read fix.
- [ ] Whether to add a `kind`-based badge in `SidebarTreeNode.vue` now (nice-to-have) or
  defer. Design defers — the defect is fixed without any UI change.
