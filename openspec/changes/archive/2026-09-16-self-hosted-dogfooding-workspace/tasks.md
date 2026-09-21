# Tasks: Self-Hosted Dogfooding Workspace & Modular Template Packages

## 1. Specification & Metamodel Updates
- [x] 1.1 Update iNNfo/specs/templates/workspace_spec_NN.md to define Specs, Templates, Skills, and Tools concepts.
- [x] 1.2 Define field definitions for Specs (path, level), Templates (path, category), Skills (path, ole, 	arget_agents), and Tools (path, untime).
- [x] 1.3 Add workspace configuration field definitions (
ame, environment, models_dir, sources_dir, 	emplates_dir, skills_dir).

## 2. Repository Lifecycle Template
- [x] 2.1 Create iNNfo/specs/templates/repository/spec_NN.md defining Repository, State, Releases, Changes, and Metrics.
- [x] 2.2 Create canonical sample iNNfo/specs/templates/repository/samples/Ghostbusters_repository_NN.md.
- [x] 2.3 Create repository lifecycle procedures under iNNfo/specs/templates/repository/procedures/.
- [x] 2.4 Register repository template in iNNfo/specs/templates/catalog.json and docs/innfo/templates/catalog.json.

## 3. Template Packages Modularization
- [x] 3.1 Audit existing templates (usiness, nalysis, organization, procedures, sources, rtifacts) and ensure standard layout (spec_NN.md, samples/, procedures/, ssets/, skills/).
- [x] 3.2 Ensure samples reside inside each corresponding template directory.
- [x] 3.3 Verify relative links in template specifications and sample frontmatters.

## 4. Parser & Tooling Adjustments (innfo-core)
- [x] 4.1 Update iNNfo/packages/innfo-core/src/recursiveParser/workspace.ts to allow traversal of referenced specs/ and 	emplates/.
- [x] 4.2 Register 	ype:: file in innfo-core recursive parser as opaque leaf references.
- [x] 4.3 Add unit tests verifying recursive parsing across extended workspace concepts (Specs, Templates, Skills, Tools).

## 5. Dogfooding Root Workspace Manifest
- [x] 5.1 Create canonical workspace_NN.md at the repository root linking all monorepo specs, templates, skills, tools, and repository models.
- [x] 5.2 Create models/cognnitive_repository_NN.md modeling the cogNNitive repository instance.
- [x] 5.3 Ensure scripts/check-integrity.js validates the root workspace manifest cleanly.

## 6. Verification & Quality Gates
- [x] 6.1 Run full unit and integration test suites in innfo-core and innfo-editor.
- [x] 6.2 Run 
ode scripts/check-integrity.js to verify catalog and workspace parity.
- [x] 6.3 Verify MCP offline tool discovery on the new workspace structure.
