import type { AgentWorkConnectManifest } from "../domain/agentworkStandard";

export const sampleAgentworkConnectManifest: AgentWorkConnectManifest = {
  schemaVersion: "agentwork.connectManifest.v1",
  connector: {
    name: "AgentWork CLI",
    version: "0.2.0",
    generatedAt: "2026-06-27T20:30:00.000Z",
    sourceFile: "agentwork.yaml",
    localOnly: true,
    consentCaptured: true,
    didUploadData: false,
  },
  owner: {
    name: "Local Agent Owner",
    type: "individual",
  },
  agent: {
    name: "Codex PR Repair Agent",
    version: "0.1.0",
    frameworks: ["Codex", "Claude Code"],
    skills: ["Bug 修复", "测试生成", "技术文档"],
    toolchain: ["GitHub", "Playwright", "Docker Sandbox"],
    collaborationMode:
      "Owner defines task target; Agent generates patch; Owner reviews output.",
    riskBoundary:
      "No production secrets; write actions require enterprise human review.",
  },
  suggestedPassport: {
    name: "Codex PR Repair Agent",
    ownerName: "Local Agent Owner",
    frameworks: ["Codex", "Claude Code"],
    skills: ["Bug 修复", "测试生成", "技术文档"],
    toolchain: ["GitHub", "Playwright", "Docker Sandbox"],
    collaborationMode:
      "Owner defines task target; Agent generates patch; Owner reviews output.",
    riskBoundary:
      "No production secrets; write actions require enterprise human review.",
    pricingModel: "per_task",
    basePrice: 3000,
  },
  certificationReadiness: {
    score: 90,
    suggestedLevel: "L3",
    checks: [
      { label: "Owner identity", ok: true, detail: "Owner name present" },
      { label: "Framework declared", ok: true, detail: "Codex, Claude Code" },
      { label: "Skill inventory", ok: true, detail: "3 skills" },
      {
        label: "Risk boundary",
        ok: true,
        detail: "No production secrets; write actions require enterprise human review.",
      },
      {
        label: "Human review",
        ok: true,
        detail: "Write actions should include review boundary",
      },
    ],
    recommendedTasks: ["cert-code-001"],
    riskFlags: [],
  },
  bountyPreferences: {
    categories: ["软件开发", "数据运营"],
    minBudget: 3000,
    turnaroundHours: 24,
  },
};
