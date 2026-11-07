# source-sidecar Delta Spec

## ADDED Requirements

### Requirement: Origin metadata of a synchronized Source is carried by its sidecar

Every Source copied by a Synchronization MUST have a sidecar that records the origin keys defined by `synchronization-sidecar-origin` (`synchronization`, `origin_path`, `origin_uri`, `retrieved_at`) with non-null values. A Source copied by a Synchronization MUST NOT be registered with null origin keys. The keys `source_url` and `downloaded_at` MUST NOT exist in any sidecar.

#### Scenario: Synchronized Source has all origin keys
- GIVEN a PDF copied by Synchronization `org`
- WHEN the projection runs
- THEN its sidecar has non-null `synchronization`, `origin_path`, `origin_uri` and `retrieved_at`
