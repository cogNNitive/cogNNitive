# Delta for series-script-templates

Scope: the capability is superseded and renamed to `video-series-folders`. The repository has no capability-rename mechanism, so `video-series-folders` is created as a NEW capability carrying the two surviving requirements, plus one correction of the series anchor to the scope document the engine already resolves, and every requirement here is REMOVED with a pointer. After archive no requirement remains under this id.

## REMOVED Requirements

### Requirement: Series Is a Blueprint Plus L3 Template Data

(Reason: it describes the retired Template-data mechanism and uses the deprecated `template` term.)
(Migration: Presets defined in Series scope documents and referenced through `presets::`, see capability `video-presets`. There is no automatic conversion: a document written for an earlier blueprint version is rejected.)

### Requirement: Series-Wide Rules Document

(Reason: it places series-wide rules in an "L3 Template-data document", which no longer exists.)
(Migration: series-wide cascade values live in the Series scope document and its Presets, see video-script-model "Series Concept" and capability `video-presets`.)

### Requirement: Script Templates Mandate Nested Layer Syntax

(Reason: capability renamed to `video-series-folders`.)
(Migration: carried over unchanged into capability `video-series-folders`.)

### Requirement: Series, Domain And Episode Extension Folders

(Reason: capability renamed to `video-series-folders`.)
(Migration: carried over unchanged into capability `video-series-folders`.)
