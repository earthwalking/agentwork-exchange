import type { LocalAgentManifest } from "../domain/connectorTypes";

export const sampleConnectorManifest: LocalAgentManifest = {
  schemaVersion: "agentwork.localAgentManifest.v1",
  connector: {
    name: "AgentWork Local Agent Connector",
    version: "0.1.0",
    runId: "sample-run",
    generatedAt: "2026-06-27T16:58:00.000Z",
    privacyMode: "local-manifest-only",
  },
  device: {
    platform: "win32",
    osRelease: "sample",
    hostnameHash: "sample-host-hash",
    homeHash: "sample-home-hash",
  },
  owner: {
    name: "Sample Agent Owner",
  },
  scanPolicy: {
    userConsentRequired: true,
    consentCaptured: true,
    inspectedPathExecutables: true,
    inspectedKnownConfigDirs: true,
    didReadConfigFileContents: false,
    didScanWholeDisk: false,
    didUploadData: false,
  },
  detectedAgents: [
    {
      id: "codex-sample",
      displayName: "Codex",
      framework: "Codex",
      detection: {
        confidence: "high",
        methods: ["path-executable", "known-config-dir"],
        executablePath: "C:\\Users\\owner\\AppData\\Local\\Programs\\codex\\codex.cmd",
        configDirs: [{ path: "C:\\Users\\owner\\.codex", fileCountEstimate: 12 }],
      },
      suggestedPassport: {
        name: "Codex",
        frameworks: ["Codex"],
        skills: ["代码生成", "代码修复", "测试生成", "文档生成"],
        toolchain: ["Codex", "GitHub", "Playwright"],
        collaborationMode: "Owner 定义任务目标，Agent 在本机或受控沙箱运行，Owner 复核结果后提交平台。",
        riskBoundary: "默认不上传本机密钥；企业写入、发送、部署等动作必须通过平台人审。",
        pricingModel: "per_task",
        basePrice: 3000,
      },
      onboardingHint: "建议先用 GitHub PR 修复、测试生成或文档补齐任务做 L2/L3 认证。",
      status: "needs-owner-review",
    },
    {
      id: "claude-code-sample",
      displayName: "Claude Code",
      framework: "Claude Code",
      detection: {
        confidence: "medium",
        methods: ["known-config-dir"],
        configDirs: [{ path: "C:\\Users\\owner\\.claude", fileCountEstimate: 6 }],
      },
      suggestedPassport: {
        name: "Claude Code",
        frameworks: ["Claude Code"],
        skills: ["代码修复", "代码迁移", "脚本自动化", "技术文档"],
        toolchain: ["Claude Code", "GitHub"],
        collaborationMode: "Owner 先确认代码边界，Agent 生成补丁，Owner 复核后提交。",
        riskBoundary: "不接触生产密钥；写入代码仓库必须通过 PR 和企业 reviewer。",
        pricingModel: "per_task",
        basePrice: 3600,
      },
      onboardingHint: "建议先提交脱敏代码仓库样例，走人审写入认证。",
      status: "needs-owner-review",
    },
  ],
};
