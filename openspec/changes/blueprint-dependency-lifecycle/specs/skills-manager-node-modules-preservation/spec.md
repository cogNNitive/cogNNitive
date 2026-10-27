# Delta for skills-manager-node-modules-preservation

## MODIFIED Requirements

### Requirement: Automatic Dependency Self-Healing on Skill Install/Update (R-SMP-02)
`skills-manager` install and update operations MUST verify whether all declared npm dependencies in an installed skill's `package.json` are present, and run `npm install --omit=dev --no-audit --no-fund` when dependencies are missing. This MUST apply equally to skills installed from a manifest entry and to embedded skills installed from a bluepriNNt.
(Previously: only the manifest-entry install path ran the self-heal; embedded installs skipped it.)

#### Scenario: Installing or updating a skill with missing dependencies
- GIVEN a skill with a `package.json` specifying dependencies
- WHEN `installSkillAtCommit` completes
- THEN all declared dependencies MUST be present under `node_modules/`.

#### Scenario: Embedded skill with missing dependencies
- GIVEN a bluepriNNt embedded skill whose `package.json` declares `sharp`
- WHEN `install --blueprint` or `update` installs it
- THEN `node_modules/sharp` is present afterwards

#### Scenario: Dependencies already present
- GIVEN an embedded skill whose declared dependencies are all installed
- WHEN `update` runs
- THEN `npm install` is not invoked
