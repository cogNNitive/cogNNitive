---
level: 3
parent_spec:
  name: "review-panel_V_0-1-0"
  url: "review-panel_spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Independent analysis - gpt-luna"
---

# NN Findings

## NN Findings: F1 Validate blueprint names before constructing scaffold paths
category:: change
impact:: high
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:2218, scripts/export-console.mjs:2221, scripts/export-console.mjs:2222
recommendation:: Require `blueprint` to be a single valid blueprint slug before joining it into `targetDir`, and verify the resolved directory remains under the selected blueprint root.
tags:: [scaffolding, paths]

`blueprint` comes from `--blueprint` without validation and is inserted into a filesystem path. Values containing `..` or an absolute path can make `--new-view` create directories and write a view outside the requested workspace. Validate the name and enforce the resolved-root boundary before creating directories.

## NN Findings: F2 Escape user supplied titles in generated JavaScript
category:: change
impact:: high
effort:: low
risk:: medium
code_ref:: scripts/export-console.mjs:2209, scripts/export-console.mjs:2241, scripts/export-console.mjs:2264, scripts/export-console.mjs:2283
recommendation:: Encode `viewTitle` as a JavaScript string literal (for example with `JSON.stringify`) in every template and separately escape it before placing it in comments.
tags:: [scaffolding, input-validation]

The `--title` value is interpolated inside single quoted JavaScript strings and comments without escaping. A quote can produce invalid generated code, and crafted input can break out of the `title` or `textContent` literal and inject executable code into the view that is later inlined into the console.

## NN Findings: F3 Add hashes to the effective CSP directive
category:: change
impact:: high
effort:: low
risk:: medium
code_ref:: scripts/console-views.mjs:500, scripts/console-views.mjs:508, scripts/console-views.mjs:524
recommendation:: When a CSP is present, append the inline hashes to `script-src` or the applicable `script-src-elem` directive, creating `script-src` when neither exists so it overrides `default-src` fallback.
tags:: [csp, inline-assets]

`allowInlineScripts` only adds hashes by replacing an existing `script-src`. With a policy such as `default-src 'self'` and no `script-src`, this replacement is a no-op, so the newly inlined bundle and views remain blocked by the policy’s script fallback. The exporter should update the effective directive rather than silently return HTML that cannot run.

## NN Findings: F4 Surface filesystem scan errors instead of dropping subtrees
category:: change
impact:: medium
effort:: low
risk:: low
code_ref:: scripts/export-console.mjs:255, scripts/export-console.mjs:258, scripts/export-console.mjs:260
recommendation:: Treat only expected missing-path cases as an empty directory and propagate permission and I/O errors with the directory path.
tags:: [model-discovery, errors]

`findModelFiles` catches every `readdir` failure and treats it as an empty directory. A permission or transient I/O error therefore silently omits every model below that directory and can produce an apparently successful but incomplete domain console. Restrict the fallback to expected absence and fail the export for other errors.

## NN Findings: F5 Avoid process-wide output replacement across asynchronous exports
category:: refactor
impact:: medium
effort:: medium
risk:: medium
code_ref:: scripts/export-console.mjs:2480, scripts/export-console.mjs:2494, scripts/export-console.mjs:2503, scripts/export-console.mjs:2505, scripts/export-console.mjs:2519
recommendation:: Capture output through an injected logger or serialize calls to `runExportConsole` so concurrent invocations cannot overwrite each other’s process-wide output handlers.
tags:: [api, concurrency]

`runExportConsole` replaces global console methods and stdout/stderr writers, then awaits the full export. If two callers invoke it concurrently, their captures can receive each other’s output and one call can restore handlers while the other is still running. This also contradicts the API comment that the entry point does not mutate globals; local capture or explicit serialization would make the API safe for concurrent use.
