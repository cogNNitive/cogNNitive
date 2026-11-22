# Delta for conntent-blueprint

The coNNtent blueprint treated providers and models as hardcoded code paths plus a price
allowlist (#752): the synthesizer owned the WaveSpeed base URL, a bespoke Replicate branch
called a baked-in model whatever the catalog said, and the `Provider` element carried no
call contract. A Provider now declares its transport and every billable call is routed by
its Model. The fail-closed price and allowlist checks are unchanged.

## ADDED Requirements

### Requirement: A Provider declares its transport

A `Provider` element MUST declare `api_base`, `env_key`, `auth_scheme`, `submit_path` and `poll_path` before any Model of it can be called, and MAY declare `envelope` and `size_format`.
`submit_path` replaces `{api_id}` with the called Model's own `api_id`, and `poll_path` replaces `{id}` with the task id the submit returned.
`env_key` names the environment variable that holds the credential and never the credential itself.

#### Scenario: A Replicate model is called by its own api_id
- GIVEN a catalog Model with `provider:: replicate` and `api_id:: acme/other-image`
- AND the `replicate` Provider declares `envelope:: [model=version, input=input]`
- WHEN an image is synthesized with that Model
- THEN the request is posted to the Provider's `api_base` plus `submit_path`
- AND the body carries `version: acme/other-image`, not any other model id

### Requirement: Every billable call is routed by its Model

The engine MUST resolve each billable call's Provider from the called Model's `provider` field and MUST NOT select a provider from a process-wide setting or from which credential happens to be set.
A call whose Model is not declared in the merged catalog, or whose Provider is not declared or declares no complete transport, MUST be refused before any network call.
The spend guard's model check MUST run before the catalog route, so a blocked or unlisted model keeps its existing refusal.
A Model whose Provider credential is not set MUST produce the offline placeholder instead of a call.

#### Scenario: Two providers serve one episode
- GIVEN an image Model of the `replicate` Provider and an avatar Model of the `wavespeed` Provider
- AND both credentials are set
- WHEN one run synthesizes the image and the avatar
- THEN the image is posted to the Replicate transport and the avatar to the WaveSpeed transport

#### Scenario: An undeclared model is refused before any call
- GIVEN a model id the spend guard allows but the merged catalog does not declare
- WHEN it is synthesized with a provider credential set
- THEN the call fails with `unknown-model`
- AND no network request was made
