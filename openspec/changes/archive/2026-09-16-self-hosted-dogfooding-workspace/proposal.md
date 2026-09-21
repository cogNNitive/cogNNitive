# Proposal: Self-Hosted Dogfooding Workspace & Modular Template Packages

## Intent
Transform the cogNNitive repository into a self-hosted, self-describing iNNfo workspace by extending the Level 2 Workspace specification (workspace_spec_NN.md) to govern specifications, templates, domain models, procedures, artifacts, AI agent skills, and tools. Unify template directories into self-contained packages and integrate the Level 2 Repository Template (epository/spec_NN.md) to model the repository lifecycle.

## Scope
1. **Extended Workspace Metamodel**: Extend iNNfo/specs/templates/workspace_spec_NN.md with first-class concepts for Specs (	ype:: model), Templates (	ype:: model), Skills (	ype:: file), and Tools (	ype:: file), alongside global workspace configuration fields.
2. **Modular Template Package Architecture**: Standardize template directories under 	emplates/<template_name>/ as self-contained packages containing spec_NN.md, samples/, procedures/, ssets/, and skills/.
3. **Repository Lifecycle Template**: Integrate 	emplates/repository/ with spec_NN.md (concepts Repository, State, Releases, Changes, Metrics), evaluable matrices, and canonical sample models.
4. **Dogfooding Root Workspace**: Establish workspace_NN.md at the repository root describing the cogNNitive project, models, capabilities, and tools.
5. **Runtime and Tooling Alignment**: Update innfo-core recursive parser to support 	ype:: file as opaque assets and ensure non-blocking resolution of local workspace specs.

## Capabilities

### New Capabilities
- workspace-metamodel-extension: Extended Level 2 workspace specification adding Specs, Templates, Skills, and Tools concepts with workspace configuration attributes.
- modular-template-packages: Standardized self-contained template package layout containing spec, samples, procedures, assets, and skills.
- epository-lifecycle-template: Level 2 template defining GitHub repository lifecycle concepts, matrices, and metrics.
- dogfooding-root-workspace: Root workspace manifest modeling the cogNNitive codebase and ecosystem.

### Modified Capabilities
- innfo-core-workspace-parser: Parser support for opaque 	ype:: file properties and unblocking referenced specification paths.

## Approach
- **Phase 1: Metamodel & Specification**: Author the extended workspace_spec_NN.md (V_0-3-0 / Level 2) and epository/spec_NN.md.
- **Phase 2: Template Modularization**: Restructure template directories into self-contained packages with their corresponding samples and procedures.
- **Phase 3: Core Parser & MCP Support**: Ensure innfo-core and innfo-mcp navigate the new concepts and opaque file handles cleanly.
- **Phase 4: Dogfooding Manifest**: Create root workspace_NN.md and dogfooding repository model instances.
- **Phase 5: Integrity Verification**: Run test suites, verify schema conformance, and ensure zero regressions across editor and MCP.

## Affected Areas
- iNNfo/specs/templates/workspace_spec_NN.md
- iNNfo/specs/templates/repository/ (spec_NN.md, samples/, procedures/)
- iNNfo/specs/templates/ (usiness/, nalysis/, organization/, etc.)
- iNNfo/packages/innfo-core/src/recursiveParser/
- workspace_NN.md (Repository Root)

## Risks & Mitigations
- **Context inflation**: Large workspace manifests could consume excessive LLM context. *Mitigation*: Progressive disclosure via satellite catalog models (sources_NN.md, procedures_NN.md, 	emplates_NN.md).
- **Legacy Path Resolution**: Existing models referencing remote CDN URLs. *Mitigation*: Dual-mode resolution in innfo-core (local workspace path first, fallback to remote registry).
- **Parser execution on non-iNNfo files**: Agents skills (SKILL.md) are not iNNfo ASTs. *Mitigation*: Register 	ype:: file as an opaque leaf resource in innfo-core.

## Rollback Plan
Revert changes to workspace_spec_NN.md and innfo-core workspace parser. Existing flat directory structures and template references remain intact.

## Success Criteria
- Root workspace_NN.md validates successfully against workspace_spec_NN.md.
- All template packages pass self-containment audit (spec, samples, procedures).
- innfo-core test suite passes with 100% green integrity checks.
- innfo-mcp operates completely offline using local workspace manifests.
