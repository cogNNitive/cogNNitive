# Delta for release-writeback

The write-back lane proposes its commit as a pull request on `chore/regen`, and `auto-tag` waits for
that pull request to land. It was opened with the workflow token, so it was authored by
`app/github-actions`, and GitHub holds that author's `pull_request` run for approval: the five
checks the `main` ruleset requires never reported, the ruleset refused the merge with no bypass
actor available, and the lane still finished green. The release then stalled one commit behind
every merge, and nothing in the run said so. Two escapes exist today — approve the held run, or push
an empty commit from a maintainer checkout — and both are manual, so the stall returns on the next
cycle. This delta moves the identity into the lane so the gate runs by itself, and makes a
write-back that cannot land a failure instead of a green run.

## ADDED Requirements

### Requirement: The write-back pull request is authored by a maintainer identity

The `regen` lane MUST open the write-back pull request with a credential whose GitHub identity has write access to the repository, and MUST NOT use the workflow token for that pull request, because a pull request authored by the GitHub Actions App has its `pull_request` run held for approval and the required checks therefore never report.
The same credential MUST be the push credential, so the commit and the pull request carry one identity and GitHub attributes the resulting `pull_request` event to it.
The lane MUST fail, naming the missing credential, when that credential is absent, so a release that cannot be merged is never reported as a successful run.
The lane MUST read the author of the pull request it opened or reused and MUST fail when that author is the GitHub Actions App or any bot identity.

#### Scenario: The maintainer token is configured

- GIVEN `REGEN_PR_TOKEN` holds a maintainer token with `contents: write` and `pull-requests: write`
- WHEN a push to `main` produces a pending write-back
- THEN the commit is pushed to `chore/regen` and the pull request is opened by that maintainer
- AND the `pull_request` run reports `verify`, `quality`, `site`, `spec-integrity` and `ui-smoke` without approval, so the ruleset accepts the merge

#### Scenario: The maintainer token is missing

- GIVEN `REGEN_PR_TOKEN` is unset
- WHEN the `regen` job runs on a push to `main`
- THEN the job fails before proposing a write-back and names the credential
- AND the run is red instead of green with a stalled release

#### Scenario: A pull request already open from the previous contract

- GIVEN an open `chore/regen` pull request authored by `app/github-actions`
- WHEN the lane reuses it instead of opening a new one
- THEN the job fails and names the author it found
- AND closing that pull request lets the next run open one under the maintainer identity
