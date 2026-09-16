# Simulacro — user-flow simulation report

Generated: 2026-09-16T11:40:24.197Z

**1 passed · 5 failed · 0 observed**

| Scenario | Pass | Fail | Observed |
| --- | ---: | ---: | ---: |
| S07 — Opening the shipped sample workspace | 1 | 5 | 0 |

## S07 — Opening the shipped sample workspace

_A new user opens the workspace we ship. Everything they see on day one is what this scenario measures._

### ❌ The shipped workspace parses without issues
- **Expected:** all sample models load with zero parse issues — this is the first thing a new user sees
- **Actual:**

```
{
  "entrypoint": "workspace_NN.md",
  "models": 13,
  "issueCount": 40,
  "issueKinds": {
    "slug-collision": 8,
    "other": 32
  }
}
```

### ✅ Every shipped sample passes document hygiene with no errors
- **Expected:** zero hygiene errors across the eleven samples
- **Actual:**

```
[]
```

### ❌ Every citation in the shipped workspace resolves
- **Expected:** a new user opening the sample sees no broken provenance
- **Actual:**

```
[
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Handbook Overview.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Proton Pack.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Ghost Trap.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#PKE Meter.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Entrapment Protocol.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Grid Transfer.source"
  },
  {
    "code": "KU_DANGLING_FILE",
    "severity": "error",
    "path": "models/Ghostbusters_documentation_NN.md#Roster.source"
  }
]
```

### ❌ The shipped workspace contains the sources its models cite
- **Expected:** source traceability is the headline capability — the demo must demonstrate it
- **Actual:**

```
{
  "sourcesDir": "sources/nn/",
  "files": []
}
```

### ❌ The shipped workspace contains the compiled console artifact its manifest declares
- **Expected:** workspace_NN.md registers `## NN Artifacts: Workspace Hub Dashboard`; the file should exist
- **Actual:**

```
{
  "declared": "artifacts/workspace_hub.html",
  "present": []
}
```

### ❌ A field named `source` that is declared as a content path is not treated as a citation
- **Expected:** the Citation vocabulary should key on the declared field TYPE, not on the field NAME
- **Actual:**

```
{
  "template": "documentation",
  "declaredType": "markdown_file",
  "citationFieldNames": [
    "sources",
    "source"
  ],
  "diagnosticsOnDocumentationSample": [
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE",
    "KU_DANGLING_FILE"
  ]
}
```
