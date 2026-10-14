# Delta for console-export-cli

## ADDED Requirements

### Requirement: Console Links Are Relative to the Console File

The export MUST rewrite every local file reference the console opens so it resolves from the written HTML file under `file://`: the values of fields declared `image`, `video`, `audio` or `file` (in addition to the image-shaped values rebased today), and an `href` added to every resolved citation entry that has a `path` and no `error`, pointing at that source file without its anchor. Each rewritten reference MUST be relative to the directory of the output HTML (a domain console at the domaiNN root, a scoped or stamped console deeper) and MUST NOT be absolute. Values that already carry a scheme (`http:`, `https:`, `data:`, `blob:`, `file:`) MUST be left unchanged. The citation entry's `path` itself MUST stay domain-relative. (S3b P1, supports "Declared Media Rendering" and "Open Original Source File".)

#### Scenario: Domain console at the root
- GIVEN a domaiNN whose element cites `sources/nn/interview.md@## Clients`
- WHEN the domain console is exported at the domaiNN root
- THEN the citation entry carries `path: "sources/nn/interview.md"` and `href: "./sources/nn/interview.md"`

#### Scenario: Console written deeper
- GIVEN the same domaiNN exported as a console under `artifacts/<stem>_console/`
- THEN the same entry carries `href: "../../sources/nn/interview.md"`

#### Scenario: Declared video is rebased
- GIVEN a field declared `video` with value `sources/demo.mp4` and a console under `artifacts/<stem>_console/`
- WHEN it is exported
- THEN the field value is `../../sources/demo.mp4` (today only image-shaped values are rebased)

#### Scenario: Remote values are untouched
- GIVEN a field declared `video` with value `https://example.com/v.mp4`
- WHEN it is exported
- THEN the value is unchanged
