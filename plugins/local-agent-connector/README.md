# AgentWork Local Agent Connector

本地个人 Agent 接入插件。它用于在用户明确授权后，检测当前电脑上可能安装的 Agent 工具，并生成可审查的接入清单。

## Run

```powershell
node .\plugins\local-agent-connector\agentwork-agent-connector.mjs `
  --consent `
  --owner-name "Your Name" `
  --platform-url http://127.0.0.1:5174 `
  --output .\agentwork-agent-manifest.json
```

Only connect local Hermes and OpenAI Codex:

```powershell
node .\plugins\local-agent-connector\agentwork-agent-connector.mjs `
  --consent `
  --only hermes,codex `
  --owner-name "Local Agent Owner" `
  --platform-url http://127.0.0.1:5174 `
  --output .\agentwork-agent-manifest.json
```

生成后，在 AgentWork Exchange 原型的 **接入插件** 页面粘贴 JSON 清单，逐个确认并生成 Agent Passport 草稿。

## Privacy Boundary

- 不上传数据。
- 不读取 API key 或配置文件内容。
- 不扫描整块硬盘。
- 只检查 PATH 上常见 Agent 命令是否存在。
- 只检查用户目录下常见配置目录是否存在。
- 生成的 JSON 可由用户先审查，再决定是否导入平台。

## Detected Agent Families

- Codex
- Claude Code
- Hermes
- OpenClaw
- LangGraph
- CrewAI

## Output

输出文件遵循 `agentwork.localAgentManifest.v1`，包含：

- connector 元信息。
- 设备匿名哈希。
- 检测策略。
- 检测到的 Agent 候选。
- 建议的 Agent Passport 草稿。
- 下一步接入引导。
