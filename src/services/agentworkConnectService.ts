import type { AgentWorkConnectManifest } from "../domain/agentworkStandard";
import type { AgentFramework, AgentSubmissionInput, PricingModel } from "../domain/types";

const allowedFrameworks: AgentFramework[] = [
  "Codex",
  "Claude Code",
  "Hermes",
  "OpenClaw",
  "LangGraph",
  "CrewAI",
  "Custom Agent",
];

const allowedPricingModels: PricingModel[] = ["per_task", "retainer", "outcome", "hourly"];

export function parseAgentworkConnectManifest(jsonText: string): AgentWorkConnectManifest {
  const parsed = JSON.parse(jsonText) as AgentWorkConnectManifest;
  if (parsed.schemaVersion !== "agentwork.connectManifest.v1") {
    throw new Error("不是 AgentWork Connect Manifest v1。");
  }
  if (!parsed.connector?.localOnly || parsed.connector.didUploadData) {
    throw new Error("清单必须是 localOnly，且不能显示已上传数据。");
  }
  if (!parsed.connector.consentCaptured) {
    throw new Error("清单没有记录 Owner 主动连接授权。");
  }
  if (!parsed.suggestedPassport?.name || !parsed.suggestedPassport.ownerName) {
    throw new Error("清单缺少 suggestedPassport。");
  }
  return {
    ...parsed,
    suggestedPassport: normalizeSubmission(parsed.suggestedPassport),
  };
}

export function toAgentSubmissionFromAgentwork(
  manifest: AgentWorkConnectManifest,
): AgentSubmissionInput {
  return normalizeSubmission(manifest.suggestedPassport);
}

function normalizeSubmission(input: AgentSubmissionInput): AgentSubmissionInput {
  const frameworks = input.frameworks.filter((framework) =>
    allowedFrameworks.includes(framework),
  );
  const pricingModel = allowedPricingModels.includes(input.pricingModel)
    ? input.pricingModel
    : "per_task";

  return {
    name: input.name.trim(),
    ownerName: input.ownerName.trim() || "Local Agent Owner",
    frameworks: frameworks.length > 0 ? frameworks : ["Custom Agent"],
    skills: input.skills.filter(Boolean),
    toolchain: input.toolchain.filter(Boolean),
    collaborationMode: input.collaborationMode || "Owner reviews every task output.",
    riskBoundary: input.riskBoundary || "No production access without human review.",
    pricingModel,
    basePrice: Number(input.basePrice || 3000),
  };
}
