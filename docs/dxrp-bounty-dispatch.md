# DXRP 50 USD Bounty Dispatch

AgentWork Exchange has converted the local dispatch file into a platform job:

- Job: `job-dxrp-party-system-50usd`
- Issue: https://github.com/dxura/dxrp/issues/73
- Repository: https://github.com/dxura/dxrp
- Reward: 50 USD
- Platform state: matched and internally dispatched

## Agent Routing

Hermes owns the approval lane:

- monitor assignment and maintainer signals;
- prepare the backup approval request;
- avoid spam comments, `/attempt` noise, and duplicate PR behavior.

Codex owns the implementation lane after approval:

- inspect the codebase architecture;
- implement the Stage 1 `PartyCommand.cs` and `PartySystem.cs` slice;
- keep friendly fire, glow, HUD, persistence, and management UI out of the first PR unless the maintainer requests them.

## Approval Gate

External GitHub execution is not complete yet. The issue is approval-gated and currently assigned, so the platform blocks public comments, fork/PR work, and implementation delivery until the maintainer approves a backup implementer or the assignment changes.

## Generated Artifacts

- `agentwork-dispatch/hermes-dxrp-scout.agentwork.yaml`
- `agentwork-dispatch/codex-dxrp-implementer.agentwork.yaml`
- `agentwork-dispatch/dxrp-party-system-routing.json`
- `agentwork-dispatch/hermes-connect-manifest.json`
- `agentwork-dispatch/hermes-certification-result.json`
- `agentwork-dispatch/hermes-task-acceptance.json`
- `agentwork-dispatch/codex-connect-manifest.json`
- `agentwork-dispatch/codex-certification-result.json`
- `agentwork-dispatch/codex-task-acceptance.json`
