# Scenario, in one page

Three domaiNNs, one machine, no server, no network at read time.

```
iNNtake_NN  ──sync──▶  AI_stack_NN  ──sync──▶  coNNtent_NN
```

## Step 1 — iNNtake detects an article

The download feed delivers a newsletter article. It lands as raw bytes plus a sidecar in
`sources/import/`. The sidecar records the origin (the mail feed) and the sha256 of the
bytes. A change in iNNtake's log sets a model element — call it a resource, slug
`articulo-x` — and its `evidence` points at a heading inside the article.

## Step 2 — AI_stack imports it

AI_stack declares a Synchronization on `iNNtake_NN`. That lands iNNtake's models under
AI_stack's `sources/sync/intake/`. AI_stack then maps the resource to one of its own
elements — a tool, slug `herramienta-x` — with a change whose provenance is the iNNtake
side of the boundary.

Question for the panel: what exactly can that change cite today, and what would it need to
cite for the chain to be walkable later?

## Step 3 — coNNtent generates a video

coNNtent declares a Synchronization on `AI_stack_NN`, imports `herramienta-x`, and records
a `produce_artifact` change for the video.

The video must, among other things, include a screenshot of the original article and be
able to answer "where did this come from" all the way to the mail feed.

Known obstacle, from the design under review: a domaiNN-origin sync copies models only, so
coNNtent does not receive the article's bytes and cannot take the screenshot from what it
imported. The article's bytes live in iNNtake's `sources/import/`.

## What the panel should test

For each step, state precisely which existing mechanism carries the information and which
one breaks. Then state the minimum change that makes step 3 answer the question without
introducing a second synchronization of iNNtake into coNNtent.

Cite code. `iNNfo/packages/nn-core/src/sync/refresh.ts`, `.../cognitivize/cognitivize.ts`,
`.../sourceRef.ts`, `.../lineage/project.ts` and `.../validator/workspaceSources.ts` are the
most likely places to look, but do not assume they are the only ones.
