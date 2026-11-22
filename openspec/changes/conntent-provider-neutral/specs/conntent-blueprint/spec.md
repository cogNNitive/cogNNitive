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

### Requirement: An avatar Model declares its own request shape

An avatar `Model` MAY declare `request_map`, a keyed list that renames the engine inputs `image`, `audio` and `resolution` to the Model's own request fields, and the engine MUST send only the mapped inputs under those names.
A Model with no `request_map` MUST receive the default body `{image, audio, resolution}` unchanged.
A `request_map` that names an input the engine does not produce MUST fail before any spend.

#### Scenario: A model with different field names is callable from the catalog alone
- GIVEN a catalog avatar Model with `request_map:: [image=image_url, audio=audio_file, resolution=output_resolution]`
- WHEN an avatar clip is synthesized with it against a stub transport
- THEN the posted body is `{image_url, audio_file, output_resolution}`
- AND no engine code names that model

#### Scenario: The default body is unchanged
- GIVEN the shipped avatar Model, which declares no `request_map`
- WHEN an avatar clip is synthesized
- THEN the posted body is `{image, audio, resolution}` in that order

### Requirement: A Model declares the values of its controls

An avatar `Model` that declares the `resolution` control MUST declare its accepted labels in `resolutions`, and the first declared label MUST be its default.
The engine MUST validate `avatar_resolution` against the resolved Model's `resolutions` before any spend and MUST NOT hold a resolution table keyed by model id or vendor name.
A requested `avatar_resolution` for a Model that does not declare the `resolution` control MUST fail with `unsupported-control` before any spend.

#### Scenario: Two models of one family are validated from their declarations
- GIVEN a catalog Model `pruna-ai/p-video-2-pro/avatar` with `resolutions:: [480p, 768p]`
- AND a catalog Model `pruna-ai/p-video/avatar` with `resolutions:: [720p, 1080p]`
- WHEN each is planned with no `avatar_resolution`
- THEN the first defaults to `480p` and the second to `720p`
- AND `1080p` is accepted for the second and refused for the first

### Requirement: The blueprint pins no vendor model for the avatar layer

The package `defaults/video-defaults_NN.md` MUST NOT declare `image_model` or `avatar_model`, and MUST document that a domain plugs them into its own `video-defaults_NN.md` as merged-catalog `api_id` values.
An avatar job whose `avatar_model` resolves at no cascade level MUST be refused before any spend with an error that names the domain `video-defaults_NN.md` plug point.
No binary actor asset is added to the blueprint package.

#### Scenario: A domain plugs its avatar model in
- GIVEN the package Video Defaults, which declare no `avatar_model`
- AND a domain `video-defaults_NN.md` that declares `avatar_model:: wavespeed-ai/infinitetalk-fast`
- WHEN an episode of that domain plans its avatar jobs
- THEN each avatar job uses `wavespeed-ai/infinitetalk-fast`

#### Scenario: No model is plugged in
- GIVEN no cascade level declares `avatar_model`
- WHEN an avatar Layer is collected for synthesis
- THEN no job is created and the problem names `video-defaults_NN.md`

## MODIFIED Requirements

### Requirement: avatar_resolution has no global enum

`avatar_resolution` MUST be a string whose allowed values are the resolved avatar Model's declared `resolutions`, not a fixed select of `480p`, `720p` and `768p`.

#### Scenario: A resolution only one model offers is reachable
- GIVEN an avatar Layer whose resolved Model declares `resolutions:: [720p, 1080p]`
- WHEN the Layer declares `avatar_resolution:: 1080p`
- THEN the job is planned at `1080p`

## REMOVED Requirements

### Requirement: A Model names an adapter

**Reason**: the per-model adapter files repeated each Model's `controls` and were never imported; the catalog is now the only place controls and their values are declared.
**Migration**: delete `adapter::` from catalog overlays; an overlay-only Model declares `provider`, `api_id`, `capability`, `price`, `price_unit` and `price_date`.
