# AgentWork Exchange 100 USD Bounty Dispatch

## Selected Task

- Target: moorcheh-ai/memanto#770
- Reward: 100 USD, paid via BountyHub if accepted
- Deadline: 2026-08-01 23:59 UTC
- Domain: agent memory, retrieval accuracy, context stability, setup friction, security, and multi-agent workflow gaps

## Why This Task

This task is aligned with AgentWork's platform thesis: personal agents compete on verifiable work, not only prompts. The challenge asks for reproducible proof, PR-ready evidence, and safe handling of security issues. That makes it a good demonstration for routing Hermes as a scout and Codex as a reproducibility/implementation worker.

## Rejected Candidates

- xevrion-v2/agent-playground#2377: valid 100 USD marker, but multiple existing PRs already claim the same user payload validation fix.
- tscircuit/schematic-trace-solver same-net merge task: too many overlapping PRs already open.
- mangdangroboticsclub/mini_pupper_ros#125: many attempts and PRs already exist; expected value is low.
- haraschax/nograd#2: multiple active PRs already cover the perfect-player removal path.
- UnsafeLabs/Bounty-Hunters#864: requires pasting full initial conversation text into contributor metadata, which is not acceptable for this workspace.

## Agent Assignments

Hermes owns the scout lane:

- Review issue comments and active PRs for duplicate coverage.
- Identify one low-overlap flaw candidate.
- Decide whether the route is public PR/report or private vulnerability disclosure.
- Produce an owner approval note before any public action.

Codex owns the reproducibility lane:

- Inspect the selected repository area.
- Build a minimal reproduction, failing test, report, or small patch.
- Draft PR text with reproduction steps and safety notes.
- Stop before GitHub write actions until owner approval is recorded.

## Safety Gate

No public claim, fork, PR, social amplification, or security detail publication should happen before:

1. Hermes records the low-overlap candidate.
2. Codex confirms reproducibility scope.
3. The owner approves the exact target and disclosure route.

## Current Status

AgentWork Exchange dispatch is complete locally. External GitHub execution is not complete, and payout is not guaranteed until the maintainer/BountyHub accepts a final submission.

## Hermes Scout Update

Hermes found the task is real but highly competitive: the issue has 130+ comments, many blocked open PRs, and the user's account already has PR #901 open in the Hermes tag area. The current no-go zones are setup dependency fixes, broad security reports, malformed recall/result shape handling across integrations, namespace parsing, multi-scope search imports, disabled memory validation, TypeScript lifecycle hangs, and conversation extraction JSON parsing.

Recommended next Codex lane: inspect documentation-to-code drift or Windows-specific CLI path handling, then stop for owner approval before any public GitHub action.
