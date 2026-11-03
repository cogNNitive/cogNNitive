---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/procedures_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Tabular Data Import & Structure Procedure"
---

>
> **Experimental External Ingestion**: Structured tabular parsing and schema inference (CSV, XLSX, BI exports) are external helper processes assisted by the AI agent. cogNNitive natively manages normalized Markdown representations and semantic model population.

# NN index

* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Work

## NN Work: Import and Structure Tabular Data
step_type:: task
parent:: -
next:: -
condition:: Tabular data files (.csv, .xlsx, .json) present in import folder
input:: @raw-tabular-data-directory
output:: @verified-target-domain-model
output_status:: verified
tool:: @ai-agent
scope:: internal
Ingest tabular files, inspect column schemas and records, normalize raw tables to Markdown under sources/nn/, map rows to semantic Level 3 domain elements (e.g., Costs, Revenue, Products, Inventory), and validate model integrity.

## NN Work: Discover Raw Tabular Files
parent:: @import-and-structure-tabular-data
step_type:: task
next:: @verify-and-deduplicate-tabular-sources
condition:: Ingestion workflow triggered
input:: @raw-tabular-data-directory
output:: @unprocessed-tabular-list
output_status:: verified
tool:: @command-line-interface
scope:: internal
Scan sources/import/ or drop folders for tabular spreadsheets (.xlsx, .csv, .tsv, .json).

## NN Work: Verify and Deduplicate Tabular Sources
parent:: @import-and-structure-tabular-data
step_type:: decision
next:: @parse-and-synthesize-tabular-schema
condition:: Tabular list generated
input:: @unprocessed-tabular-list
output:: @verified-tabular-ingestion-queue
output_status:: verified
tool:: @command-line-interface
scope:: internal
Compute SHA-256 hashes of tabular files to ensure updated or new files only are processed.

## NN Work: Parse and Synthesize Tabular Schema
parent:: @import-and-structure-tabular-data
step_type:: task
next:: @map-table-rows-to-domain-model-elements
condition:: Ingestion queue validated
input:: @verified-tabular-ingestion-queue
output:: @tabular-schema-and-data-summary
output_status:: verified
tool:: @tabular-data-parser
scope:: external
Parse tabular columns, data types, header rows, and aggregated statistical summaries using external data parsing tools.

## NN Work: Map Table Rows to Domain Model Elements
parent:: @import-and-structure-tabular-data
step_type:: decision
next:: @normalize-tabular-source-to-markdown
condition:: Schema parsed
input:: @tabular-schema-and-data-summary
output:: @model-entity-mapping-plan
output_status:: verified
tool:: @ai-agent
scope:: internal
Map table columns to concept fields and table rows to target Level 3 model elements. Confirm field mappings with the workspace maintainer.

## NN Work: Normalize Tabular Source to Markdown
parent:: @import-and-structure-tabular-data
step_type:: task
next:: @populate-and-bind-domain-model-elements
condition:: Mapping plan approved
input:: @model-entity-mapping-plan
output:: @normalized-markdown-sources
output_status:: verified
tool:: @nn-sources-scanner
scope:: internal
Convert raw tabular files into structured Markdown tables under sources/nn/ with scanner provenance frontmatter.

## NN Work: Populate and Bind Domain Model Elements
parent:: @import-and-structure-tabular-data
step_type:: task
next:: @validate-target-model
condition:: Normalized table created
input:: @normalized-markdown-sources
output:: @updated-domain-model
output_status:: verified
tool:: @file-editor
scope:: internal
Instantiate or update Level 3 model elements with properties extracted from table rows and bind provenance citations in sources::.

## NN Work: Validate Target Model
parent:: @import-and-structure-tabular-data
step_type:: task
next:: -
condition:: Domain model populated
input:: @updated-domain-model
output:: @verified-target-domain-model
output_status:: verified
tool:: @nn-mcp
scope:: internal
Validate the populated domain model using nn-mcp to ensure reference integrity and schema compliance.

# NN Tools

## NN Tools: AI Agent
scope:: internal
LLM agent orchestrating schema mapping, record synthesis, and model instantiation.

## NN Tools: Command Line Interface
scope:: internal
Terminal environment for directory inspection and hash calculations.

## NN Tools: Tabular Data Parser
scope:: external
Parser tool (e.g. csv/xlsx parser, python script) reading tabular structures.

## NN Tools: nn-sources Scanner
scope:: internal
Scanner converting tabular sources into normalized Markdown with provenance.

## NN Tools: File Editor
scope:: internal
Tool for writing models and updating semantic definitions.

## NN Tools: nn-mcp
scope:: internal
Deterministic validation engine for iNNfo models.

# NN Artifact

## NN Artifact: Raw Tabular Data Directory
type:: spec
format:: directory
Input folder with raw tabular spreadsheets (.xlsx, .csv).

## NN Artifact: Unprocessed Tabular List
type:: data
format:: json
List of discovered tabular files pending parsing.

## NN Artifact: Verified Tabular Ingestion Queue
type:: data
format:: json
Deduplicated list of spreadsheets.

## NN Artifact: Tabular Schema and Data Summary
type:: deliverable
format:: markdown
Parsed column definitions, record previews, and summaries.

## NN Artifact: Model Entity Mapping Plan
type:: spec
format:: markdown
Mapping between tabular columns/rows and Level 3 concepts/elements.

## NN Artifact: Normalized Markdown Sources
type:: spec
format:: markdown
Traceable Markdown files in sources/nn/ containing formatted tables.

## NN Artifact: Updated Domain Model
type:: spec
format:: markdown
Domain model file populated with elements derived from tabular records.

## NN Artifact: Verified Target Domain Model
type:: report
format:: status
Validation report from nn-mcp confirming model integrity.

# NN Roles

## NN Roles: iNNfo Agent
scope:: internal
AI agent executing parsing, mapping, and model population tasks.

## NN Roles: Workspace Maintainer
scope:: external
Human maintainer confirming column mappings and approving model changes.

# NN matrices: work-roles matrix

| Work \ Roles | iNNfo Agent | Workspace Maintainer |
| :--- | :---: | :---: |
| Import and Structure Tabular Data | Responsible | Accountable |
| Discover Raw Tabular Files | Responsible | Informed |
| Verify and Deduplicate Tabular Sources | Responsible | Informed |
| Parse and Synthesize Tabular Schema | Responsible | Informed |
| Map Table Rows to Domain Model Elements | Responsible | Accountable |
| Normalize Tabular Source to Markdown | Responsible | Informed |
| Populate and Bind Domain Model Elements | Responsible | Accountable |
| Validate Target Model | Responsible | Informed |

# NN matrices: work-tools matrix

| Work \ Tools | AI Agent | Command Line Interface | Tabular Data Parser | nn-sources Scanner | File Editor | nn-mcp |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| Import and Structure Tabular Data | Uses | - | - | - | - | - |
| Discover Raw Tabular Files | - | Uses | - | - | - | - |
| Verify and Deduplicate Tabular Sources | - | Uses | - | - | - | - |
| Parse and Synthesize Tabular Schema | - | - | Uses | - | - | - |
| Map Table Rows to Domain Model Elements | Uses | - | - | - | - | - |
| Normalize Tabular Source to Markdown | - | - | - | Uses | - | - |
| Populate and Bind Domain Model Elements | - | - | - | - | Uses | - |
| Validate Target Model | - | - | - | - | - | Uses |

# NN matrices: work-artifacts matrix

| Work \ Artifact | Raw Tabular Data Directory | Unprocessed Tabular List | Verified Tabular Ingestion Queue | Tabular Schema and Data Summary | Model Entity Mapping Plan | Normalized Markdown Sources | Updated Domain Model | Verified Target Domain Model |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Import and Structure Tabular Data | Reviews | - | - | - | - | - | - | Creates |
| Discover Raw Tabular Files | Reviews | Creates | - | - | - | - | - | - |
| Verify and Deduplicate Tabular Sources | - | Reviews | Creates | - | - | - | - | - |
| Parse and Synthesize Tabular Schema | - | - | Reviews | Creates | - | - | - | - |
| Map Table Rows to Domain Model Elements | - | - | - | Reviews | Creates | - | - | - |
| Normalize Tabular Source to Markdown | - | - | - | - | Reviews | Creates | - | - |
| Populate and Bind Domain Model Elements | - | - | - | - | - | Reviews | Modifies | - |
| Validate Target Model | - | - | - | - | - | - | Validates | Creates |
