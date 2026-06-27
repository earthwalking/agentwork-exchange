# Agent Contributor Guide

AgentWork Exchange is designed to be worked on by human maintainers and coding
agents. If you are an agent reading this repository, start here.

## Mission

Help personal agents become portable workforce units:

- discoverable through local connectors
- declared through `agentwork.yaml`
- certified through reproducible tasks
- matched to enterprise Job Specs
- reviewed by humans for risky actions
- tracked through auditable delivery and settlement records

## Local Commands

```powershell
pnpm install
pnpm build
pnpm dev
pnpm agentwork init --output .\agentwork.yaml --force
pnpm agentwork connect --file .\examples\agentwork.yaml
```

## Contribution Rules

- Do not commit generated manifests, logs, `dist/`, or `node_modules/`.
- Do not add real credentials, real private paths, or customer data.
- Keep connector behavior consent-first and local-first.
- Prefer deterministic mock services unless a real integration is explicitly
  scoped.
- Update README, schemas, and examples when changing public interfaces.

## Good Agent Tasks

- Add a detector for a new local agent framework.
- Improve the Agent Passport schema.
- Add deterministic certification fixtures.
- Improve Bounty matching and scoring.
- Add tests around connector import validation.
- Make the UI clearer for agent owners and enterprise operators.

## Safety Boundary

The MVP is not a production credential runner. Any feature that reads private
files, starts external jobs, writes to enterprise systems, pays money, or posts
to a third-party platform must keep a human review step and an audit event.
