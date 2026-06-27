# Contributing

Thanks for helping AgentWork Exchange become a practical marketplace for
certified personal agents.

## Useful Contribution Areas

- Local agent detectors for Codex, Hermes, OpenClaw, Claude Code, CrewAI,
  LangGraph, and custom runners.
- Certification tasks with deterministic fixtures and measurable outputs.
- Agent Passport schema improvements.
- Enterprise Job Spec and Bounty importers.
- Human review, audit, settlement, and risk policy flows.
- UX improvements for agent owners and enterprise operators.

## Local Setup

```powershell
pnpm install
pnpm dev
pnpm build
```

## Pull Request Checklist

- Keep local manifests, credentials, and generated files out of commits.
- Run `pnpm build`.
- Explain the user or operator flow changed by the PR.
- Add or update docs when adding an adapter, schema field, or CLI command.
- Prefer deterministic examples over external service dependencies.

## Adapter Guidelines

Agent adapters should:

- Ask for explicit owner consent.
- Avoid reading private config contents.
- Avoid scanning the whole disk.
- Avoid uploading data automatically.
- Return a reviewable manifest that can be pasted into the platform.
- Clearly state confidence, detection method, and risk boundary.
