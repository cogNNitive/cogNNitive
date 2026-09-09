# Proposal: VideoScript minimal template + procedure + artifact (VUS export for VidGeNN)

## Intent

cogNNitive has no Level-2 template for driving a video generator; script generation is ad hoc. Ship minimal standalone `videoscript` plus a `generate-VUS` serializer emitting a pure VUS V_0-3-3 `.md` byte-compatible with VidGeNN `ScriptParser.parse()`.

## Scope

### In Scope
- Standalone L2 `videoscript` V_0-1-0 (`VideoScript` + release info), canonical `spec_NN.md` layout.
- Canonical L3 sample (Ghostbusters-Inc., 100% English); `generate-VUS` procedure-as-model.
- VUS oracle pinned (`V_0-3-3.json` or `ScriptParser` grammar) before spec.
- Catalog regen via script + mirror; name decided once; #11 parallel-run note.

### Out of Scope
- Merging into backlog #11 pipeline; pipeline concepts (sources, storyboards, assets).
- Video parse/validate/render code in `innfo-core`/`innfo-mcp`; `.md` is the only VidGeNN interface.
- `cdn/manifest.json`, `business` `includes:`, hand-edited `catalog.json`.
- Rock-bands model as canonical sample (quarantined fixture only).

## Capabilities

### New Capabilities
None — content conforms to existing `template-*` specs; no new spec file.

### Modified Capabilities
None — `template-package-structure`, `template-dynamic-discovery` followed as-is.

## Approach

Scaffold `videoscript` per `blank`/procedures precedent; `anydeo-script-builder` shape is the normative floor (confirmed 9 props only, listed in exploration). Ghostbusters canonical sample; rock-bands quarantined. Pin oracle, then spec; regen catalog; parallel to #11.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/videoscript/` | New | L2 `spec_NN.md` + `generate_VUS_NN.md` + Ghostbusters sample |
| `catalog.json` + docs mirror | Modified (generated) | Script regen only, after dirty files land |
| `openspec/backlog.md` #11 | Reference | Parallel-run note; no merge (read-only this phase) |
| `innfo-core/**`, `innfo-mcp/**` | Untouched | Zero video logic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| VUS oracle missing (84-prop JSON absent) | High | Pin oracle before spec; confirmed-set props only |
| Rock-bands ships as canonical | Med | Quarantine fixture; Ghostbusters canonical |
| Catalog regen vs dirty-tree work | Med | Script regen after concurrent landings; never hand-edit |
| Creep to pipeline (#11) / core code | Low | Restate `.md`-only boundary in spec |

## Rollback Plan

Delete `iNNfo/specs/templates/videoscript/`; regen `catalog.json` + mirror. No core/MCP diff to revert.

## Dependencies

- VUS oracle (VidGeNN grammar or `V_0-3-3.json`) pinned before spec; `anydeo-script-builder` floor until then.
- Dirty `catalog.json` work lands first; this change regens after.

## Success Criteria

- [ ] `videoscript` V_0-1-0 passes nn-template-audit bar (Ghostbusters, English, exhaustiveness).
- [ ] `generate-VUS` output parses under pinned oracle with zero invented props.
- [ ] Script-regen catalog lists `videoscript`; core/MCP diff empty; name fixed; #11 linked.

## Proposal question round

Confirm: (1) name `videoscript`? (2) oracle = VidGeNN grammar over JSON? (3) rock-bands quarantined outside `samples/`?
