# Delta for innfo-presentation

## REMOVED Requirements

### Requirement: Template Extensions & Custom Viewers Registry
(Reason: Specialized presentation is now handled exclusively via standalone interactive console artifacts embedded in ConsoleHubView, eliminating runtime extension views.)
(Migration: Replace in-editor extension views with template console assets.)

### Requirement: Semantic View Intent Contract (viewers:)
(Reason: Declarative viewers frontmatter is deprecated and removed from template schemas.)
(Migration: Remove `viewers:` blocks from template frontmatters and use `assets:` for console templates.)
