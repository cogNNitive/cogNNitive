---
title: "Installing Third-Party Skills"
description: "What a third-party skill is, what cogNNitive does and does not guarantee, and how to check one before you trust it."
html_url: https://cognnitive.com/skills/documentation/#/skills/installing-third-party-skills
---

# Installing Third-Party Skills

Sometimes a task needs a capability the cogNNitive ecosystem does not cover yet —
reading a scanned file, connecting to a service you already use, and so on. When
that happens, your agent may propose installing a skill from a third party. This
page explains what that means and how to stay comfortable with it.

---

## What a third-party skill is

A skill can reach your agent in two ways:

- **From cogNNitive.** It ships inside the ecosystem and is covered by the
  version you installed.
- **From a third party.** Someone else publishes it, on their own repository.
  Your agent only installs one of these when you ask it to, and it always names
  the source first.

The distinction is about **whose channel the skill comes from**, not about how
well it was written.

## What we guarantee — and what we do not

Every third-party skill cogNNitive installs is **pinned to an exact revision**
and, when the author provided one, verified against a **checksum (`sha256`)**.

That is a guarantee about *identity*: the skill you get is the exact revision the
author published, unchanged. It is **not** a guarantee about *content*.
cogNNitive did not review it and does not vouch for its author. A skill runs with
your agent's permissions, so "it is the revision that was published" and "it is
safe to run" are two different things.

## What we recommend

Before you trust a third-party skill, have a **security skill** check it. This is
routine hygiene — the same instinct as not running a downloaded program without
looking at where it came from — not a sign that anything is wrong.

Any agent-skill security scanner works. As one option,
[**plainsight**](https://github.com/VTL1618/plainsight) is a static checker that
runs locally, with no account and no network calls during a scan:

```
npx plainsight scan <the-installed-skill-folder>
```

`plainsight` is itself a third party — cogNNitive does not maintain it. We name
it as a starting point, not as the only choice, and the link lets you inspect it
too.

## You decide

Installing a third-party skill is always your call, and "not now" is as good an
answer as "yes". If a skill later stops being useful, remove its folder from
`~/.agents/skills/`.
