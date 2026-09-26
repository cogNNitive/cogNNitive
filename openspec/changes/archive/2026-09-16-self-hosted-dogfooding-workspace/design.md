# Design: Self-Hosted Dogfooding Workspace & Modular Template Packages

## 1. Architectural Architecture

### 1.1 The Self-Describing Graph
The root workspace_NN.md acts as the single source of truth (DAG root) for the entire repository. The system transitions from an ad-hoc directory layout to a typed, navigable graph:

`mermaid
graph TD
    WS[workspace_NN.md Root] --> Specs[specs/ : Specs]
    WS --> Templates[templates/ : Templates]
    WS --> Models[models/ : Models]
    WS --> Sources[sources/ : Sources]
    WS --> Procedures[procedures/ : Procedures]
    WS --> Artifacts[artifacts/ : Artifacts]
    WS --> Skills[skills/ : Skills]
    WS --> Tools[tools/ : Tools]

    Templates --> TplBiz[templates/business/spec_NN.md]
    Templates --> TplRepo[templates/repository/spec_NN.md]

    TplBiz --> SampleBiz[templates/business/samples/]
    TplBiz --> ProcBiz[templates/business/procedures/]
    TplBiz --> SkillBiz[templates/business/skills/]

    Models --> ModelCog[models/cognnitive_repository_NN.md]
    ModelCog -.->|conforms to| TplRepo
`

### 1.2 Vendor/Pin Pattern for Templates
When an end-user instantiates or bootstraps a workspace:
1. The template package is copied verbatim into 	emplates/<name>/.
2. The user's models point to the local 	emplates/<name>/spec_NN.md.
3. The local template points to the upstream specification version (iNNfo_V_0-2-1_NN.md).
4. This ensures total offline determinism, clean customization boundaries, and drift detection via simple content hashing.

## 2. Component Design & Changes

### 2.1 iNNfo/specs/templates/workspace_spec_NN.md
- Bump to version V_0-3-0 / template version V_0-5-0.
- Add concept definitions: Specs, Templates, Skills, Tools.
- Add field definitions with strict typing: 	ype:: model for specs/templates, 	ype:: file for skills/tools.
- Add workspace-level configuration properties (environment, 
ame, 	emplates_dir, skills_dir).

### 2.2 iNNfo/packages/innfo-core
- **ecursiveParser/workspace.ts**:
  - Update isIgnoredPath logic so that specs/ and 	emplates/ are traversed when explicitly referenced by a 	ype:: model field.
  - Update 
ormalizeRefPath and esolveFileHandle to support multi-level relative paths.
- **ecursiveParser/model.ts**:
  - Handle 	ype:: file fields cleanly by creating reference metadata without invoking the iNNfo grammar parser.

### 2.3 iNNfo/specs/templates/repository/
- Introduce spec_NN.md defining Repository, State, Releases, Changes, Metrics.
- Introduce samples/Ghostbusters_repository_NN.md and samples/cognnitive_repository_NN.md.
- Define directional evaluable matrices for commits-to-releases and release-to-posture mapping.

### 2.4 Monorepo Root workspace_NN.md
- Create the canonical root workspace manifest at workspace_NN.md.
- Register the monorepo's specifications, template packages, official skills (ctioNN/skills/*), maintenance tools (scripts/*), and dogfooding repository models.

## 3. Progressive Disclosure & Context Budget
To prevent context window explosion for LLM agents:
- workspace_NN.md maintains a lightweight index (~50-80 lines).
- Heavy catalogs (sources_NN.md, procedures_NN.md, rtifacts_NN.md) remain submodel references (	ype:: model).
- Template packages encapsulate their own sub-resources, loaded only on demand when an agent targets that specific domain.
