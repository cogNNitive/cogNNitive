# Delta for agent-modification-provenance

## REMOVED Requirements

### Requirement: Agent Modification provenance block

**Reason**: Per D8/D15, the `## NN Agent Modification` block, its verbatim-paste mandate
and its origin classification in `citations.ts` are retired. Provenance no longer depends
on a manually pasted block; every graph change is a changeset.

**Migration**: None. Existing transcripts are not re-processed; the origin classifier
loses the `agent-modification` case.

#### Scenario: The origin classifier no longer knows the block
- GIVEN a citation in any document
- WHEN `classifyOrigin` runs
- THEN it never returns an `agent-modification` origin
- AND `AGENT_MODIFICATION_CONCEPT` is not defined
