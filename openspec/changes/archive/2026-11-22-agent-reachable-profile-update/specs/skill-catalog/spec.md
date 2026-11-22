# Delta for skill-catalog

An agent asked to update cogNNitive had no model-visible surface naming the profile
installation (`~/.agents/`), its manifest or `skills-manager.js`: the only skill that
documents the flow, `nn-skills-lifecycle`, is user-invoked only
(`disable-model-invocation: true`), so the agent guessed and updated a git checkout
instead (#778). The two always-present, model-invocable skills now carry the pointer.

## ADDED Requirements

### Requirement: The profile-update path is reachable from a model-invocable skill

The `description` of `skills/nn/SKILL.md` MUST name updating or installing the cogNNitive installation as a trigger.
The `description` of `skills/nn-preflight/SKILL.md` MUST point a profile install or update request at the manifest `https://cognnitive.com/use/manifest.md`.
The body of `skills/nn/SKILL.md` MUST hold a section that names the manifest `https://cognnitive.com/use/manifest.md` as the source of truth, `skills-manager.js status` as the read-only first step, and `skills-manager.js bootstrap --yes` as the apply step that runs only with the user's consent.
That section MUST state that a git clone of the repository is a development checkout and not the installation.
`nn-skills-lifecycle` keeps `disable-model-invocation: true`.

#### Scenario: An agent asked to update cogNNitive finds the profile path
- GIVEN a profile installation with the `nn` and `nn-preflight` skills in the agent's available-skills list
- WHEN the user asks the agent to "update cogNNitive"
- THEN the `nn` description matches the request
- AND its body tells the agent to run `skills-manager.js status` before anything else
- AND to apply `bootstrap --yes` only after the user consents

#### Scenario: The maintainer skill stays hidden
- GIVEN `skills/nn-skills-lifecycle/SKILL.md`
- WHEN its frontmatter is read
- THEN `disable-model-invocation` is `true`
