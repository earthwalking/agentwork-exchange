import type { LocalAgentManifest } from "../domain/connectorTypes";
import type { AgentSubmissionInput } from "../domain/types";

export function parseConnectorManifest(jsonText: string): LocalAgentManifest {
  const parsed = JSON.parse(jsonText) as LocalAgentManifest;
  if (parsed.schemaVersion !== "agentwork.localAgentManifest.v1") {
    throw new Error("不是 AgentWork Local Agent Manifest v1 清单。");
  }
  if (!parsed.scanPolicy?.consentCaptured) {
    throw new Error("清单没有记录用户授权，不能导入。");
  }
  if (parsed.scanPolicy.didUploadData || parsed.scanPolicy.didReadConfigFileContents) {
    throw new Error("清单显示扫描越过隐私边界，需要重新生成。");
  }
  if (!Array.isArray(parsed.detectedAgents)) {
    throw new Error("清单缺少 detectedAgents。");
  }
  return parsed;
}

export function toAgentSubmission(
  manifest: LocalAgentManifest,
  detectedAgentId: string,
): AgentSubmissionInput {
  const detected = manifest.detectedAgents.find((agent) => agent.id === detectedAgentId);
  if (!detected) throw new Error("未找到选中的 Agent。");
  return {
    ...detected.suggestedPassport,
    name: `${detected.suggestedPassport.name} Local Connector`,
    ownerName: manifest.owner?.name?.trim() || "Local Agent Owner",
  };
}
