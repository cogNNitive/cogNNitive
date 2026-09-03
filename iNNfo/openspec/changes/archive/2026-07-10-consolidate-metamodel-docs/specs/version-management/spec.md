# Delta: Version Management

## MODIFIED Requirements

### Requirement: R-VM-04: _NN.md Filename Generation
(Previously: The filename generated ended with .md without the _NN suffix, e.g. My-Model_V_2-0-0_AI-Industry.md)

The existing `buildFormatFilename(baseName, templateName, version)` function in `utils/version.ts` MUST generate filenames ending with the standard `_NN.md` suffix following the convention:

```
{BaseName}_V_{major}-{minor}-{patch}_{TemplateName}_NN.md
```

For example: `"My Model"` with `template: "business"` and version `[2, 0, 0]` produces `My-Model_V_2-0-0_business_NN.md`.

This slice MUST show a preview of the new filename in the version panel UI next to each bump button.

#### Scenario: Filename preview shows new name with NN suffix
- GIVEN current filename is `My-Model_V_1-0-0_business_NN.md`
- WHEN the user hovers over "Minor" bump
- THEN the tooltip shows: `My-Model_V_1-1-0_business_NN.md`
