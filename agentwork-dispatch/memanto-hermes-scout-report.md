# Hermes Scout Report: Memanto #770

## Current Signal

- Repository: moorcheh-ai/memanto
- Issue: https://github.com/moorcheh-ai/memanto/issues/770
- Reward: 100 USD via BountyHub
- Live state checked: 2026-06-29
- Repository language: Python
- Issue state: open, 130+ comments
- Open PR queue: very crowded, many PRs blocked

## Do Not Pursue

These areas are already heavily covered by active PRs or by the user's existing work:

- Hermes tag variants and prompt boundary handling: earthwalking already has PR #901 open.
- Setup/plugin dependency fixes: PR #773 and related setup PRs already exist.
- Broad security audit reports: multiple reports already cover JWT/default secrets, hardcoded credentials, unauthenticated UI endpoints, path traversal, CORS, file writes, upload limits, and rate limiting.
- Multi-scope search import/path fixes: multiple PRs already cover search_multi_scope and namespace parsing.
- Malformed recall/result shape handling: many PRs cover CLI, MCP, LangGraph, Hermes, CrewAI, namespace listing, export, analysis, conflict reports, and admin list responses.
- Memory validation disabled: several PRs and comments already target this.
- TypeScript SDK lifecycle hang: active PRs already target stopped child process and health polling paths.
- Conversation extraction JSON array parsing: PR #1264 and adjacent PRs already cover this.

## Candidate Low-Overlap Lanes

Hermes did not approve a public claim yet. These are only candidate lanes for Codex inspection:

1. Documentation-to-code drift in installed integration examples.
   - Check whether docs quickstarts call commands or APIs that no longer exist.
   - Safer than exploit work; may qualify as setup friction or UX roadblock.

2. Windows-specific path and shell handling outside already claimed JSON/memory areas.
   - Avoid Claude/Hermes tag logic and avoid existing setup dependency claims.
   - Look for hardcoded POSIX paths, shell commands, or path separators in CLI connect/migrate flows.

3. Uncovered example regression tests.
   - Focus on examples that are not already in open PR titles: research_pipeline, custom_memory_saver, memanto_base_store, or lifecycle-hooks examples.
   - Deliverable could be a failing test/report if code fix is too broad.

4. Safe consistency report instead of code patch.
   - If no low-overlap bug survives inspection, prepare a `docs/bounty_reports/` report proposing test gaps and duplicate map.
   - This should only proceed if maintainer/BountyHub accepts report-style submissions for #770.

## Codex Entry Conditions

Codex may begin repository inspection only after the owner clears this target:

- Selected lane: one of the candidate lanes above.
- Duplicate check: confirm no active PR already covers the same file/function.
- Disclosure route: public PR/report for non-sensitive bugs, private vulnerability reporting for sensitive flaws.
- Public action: no comment, fork, PR, or claim before owner approval.

## Recommendation

Proceed with Codex inspection only for lane 1 or lane 2. Do not open a PR yet. Expected payout remains uncertain because #770 is extremely competitive despite being a real 100 USD bounty.
