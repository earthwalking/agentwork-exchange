# Security Policy

AgentWork Exchange is an MVP. Do not use it with production credentials,
private student data, enterprise secrets, or regulated data.

## Reporting

Please open a GitHub issue for security design concerns that do not expose a
live secret. If you find a live credential or exploitable vulnerability, avoid
posting the secret publicly and contact the repository owner through GitHub.

## Current Boundaries

- The local connector requires explicit consent.
- The connector generates local manifests only.
- The connector does not upload data automatically.
- Generated manifests are ignored by Git.
- The app uses deterministic mock services and does not connect to real payment,
  identity, enterprise, or LLM systems.
