import type {
  AgentOwner,
  AgentPassport,
  AgentSubmissionInput,
  AuditEvent,
  CertificationLevel,
  CertificationRun,
  CertificationTask,
  DeliveryRecord,
  EnterpriseJob,
  ExchangeReport,
  JobSubmissionInput,
  MatchCandidate,
  SettlementRecord,
} from "../domain/types";

const levelRank: Record<CertificationLevel, number> = {
  L0: 0,
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

const nowIso = () => new Date().toISOString();

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export function submitAgent(
  input: AgentSubmissionInput,
): { owner: AgentOwner; agent: AgentPassport; audit: AuditEvent } {
  const owner: AgentOwner = {
    id: makeId("owner"),
    name: input.ownerName,
    type: "individual",
    location: "Remote",
    reputationScore: 70,
    completedJobs: 0,
    payoutAccountStatus: "pending",
  };

  const agent: AgentPassport = {
    id: makeId("agent"),
    name: input.name,
    ownerId: owner.id,
    frameworks: input.frameworks,
    version: "0.1.0",
    status: "draft",
    certificationLevel: "L0",
    skills: input.skills,
    toolchain: input.toolchain,
    collaborationMode: input.collaborationMode,
    riskBoundary: input.riskBoundary,
    benchmarkScore: 0,
    successRate: 0,
    avgTurnaroundHours: 24,
    pricingModel: input.pricingModel,
    basePrice: input.basePrice,
    tags: [...input.frameworks, ...input.skills.slice(0, 2)].map((tag) =>
      tag.toLowerCase().replace(/\s+/g, "-"),
    ),
  };

  return {
    owner,
    agent,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: owner.name,
      action: "提交 Agent Passport",
      objectType: "agent",
      objectId: agent.id,
      detail: `${agent.name} 已进入 L0 待认证状态。`,
    },
  };
}

export function runCertification(
  agent: AgentPassport,
  task: CertificationTask,
): { agent: AgentPassport; run: CertificationRun; audit: AuditEvent } {
  const skillMatch = task.requiredSkills.filter((skill) =>
    agent.skills.some((agentSkill) => agentSkill.includes(skill) || skill.includes(agentSkill)),
  ).length;
  const toolBonus = Math.min(agent.toolchain.length * 2, 10);
  const frameworkBonus = agent.frameworks.some((framework) =>
    ["Codex", "Claude Code"].includes(framework),
  )
    ? 8
    : 5;
  const riskPenalty = task.riskLevel === "high" ? 10 : task.riskLevel === "medium" ? 4 : 0;
  const base = 58 + skillMatch * 16 + toolBonus + frameworkBonus - riskPenalty;
  const score = clamp(base, 52, 96);
  const pass = score >= task.passingScore;
  const recommendedLevel = inferLevel(score, task.riskLevel, agent.riskBoundary);
  const updatedAgent: AgentPassport = {
    ...agent,
    status: pass ? "certified" : "certifying",
    certificationLevel: pass ? recommendedLevel : agent.certificationLevel,
    benchmarkScore: pass ? Math.max(agent.benchmarkScore, score) : agent.benchmarkScore,
    successRate: pass ? Math.max(agent.successRate, score / 110) : agent.successRate,
  };

  const run: CertificationRun = {
    id: makeId("cert-run"),
    agentId: agent.id,
    taskId: task.id,
    startedAt: nowIso(),
    completedAt: nowIso(),
    score,
    pass,
    findings: [
      skillMatch > 0
        ? `匹配 ${skillMatch}/${task.requiredSkills.length} 个关键技能。`
        : "关键技能匹配不足，需要人工复核。",
      pass
        ? `建议认证为 ${recommendedLevel}，可进入对应风险边界任务。`
        : "未达通过线，建议补充样例和工具调用记录。",
      agent.riskBoundary.includes("人审") || agent.riskBoundary.includes("reviewer")
        ? "风险边界包含人审节点。"
        : "建议补充人审或回滚机制。",
    ],
    recommendedLevel,
  };

  return {
    agent: updatedAgent,
    run,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: "Certification Engine",
      action: pass ? "通过认证试工" : "认证试工未通过",
      objectType: "agent",
      objectId: agent.id,
      detail: `${agent.name} 在「${task.title}」中得分 ${score}，推荐等级 ${recommendedLevel}。`,
    },
  };
}

export function submitJob(input: JobSubmissionInput): {
  job: EnterpriseJob;
  audit: AuditEvent;
} {
  const job: EnterpriseJob = {
    ...input,
    id: makeId("job"),
    status: "open",
    createdAt: nowIso(),
  };

  return {
    job,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: input.company,
      action: "发布企业任务",
      objectType: "job",
      objectId: job.id,
      detail: `${job.title} 已进入开放匹配池，预算 ${job.budget} 元。`,
    },
  };
}

export function generateMatches(
  job: EnterpriseJob,
  agents: AgentPassport[],
  owners: AgentOwner[],
): { matches: MatchCandidate[]; audit: AuditEvent } {
  const matches = agents
    .filter((agent) => levelRank[agent.certificationLevel] >= levelRank[job.minCertificationLevel])
    .map((agent) => scoreMatch(job, agent, owners.find((owner) => owner.id === agent.ownerId)))
    .filter((candidate) => candidate.score >= 58)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    matches,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: "Matching Engine",
      action: "生成候选匹配",
      objectType: "job",
      objectId: job.id,
      detail:
        matches.length > 0
          ? `为「${job.title}」生成 ${matches.length} 个候选 Agent。`
          : `未找到满足 ${job.minCertificationLevel} 和技能要求的 Agent。`,
    },
  };
}

export function acceptMatch(
  job: EnterpriseJob,
  match: MatchCandidate,
): { job: EnterpriseJob; audit: AuditEvent } {
  const updatedJob: EnterpriseJob = { ...job, status: "in_trial" };
  return {
    job: updatedJob,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: job.company,
      action: "接受匹配并进入试工",
      objectType: "match",
      objectId: match.id,
      detail: `企业接受匹配，报价 ${match.quotedPrice} 元，预计 ${match.estimatedHours} 小时。`,
    },
  };
}

export function submitDelivery(
  job: EnterpriseJob,
  match: MatchCandidate,
): {
  job: EnterpriseJob;
  delivery: DeliveryRecord;
  settlement: SettlementRecord;
  audit: AuditEvent;
} {
  const qualityScore = clamp(match.score - (job.riskLevel === "medium" ? 2 : 0), 70, 96);
  const delivery: DeliveryRecord = {
    id: makeId("delivery"),
    jobId: job.id,
    agentId: match.agentId,
    submittedAt: nowIso(),
    status: "final_output",
    summary: `已按验收标准提交 ${job.expectedDeliverables.join("、")}。`,
    artifacts: job.expectedDeliverables.map((item) =>
      item.toLowerCase().replace(/\s+/g, "_").replace(/[^\w\u4e00-\u9fa5]/g, ""),
    ),
    qualityScore,
    humanReviewNotes: job.requiresHumanReview
      ? "等待企业 reviewer 确认交付。"
      : "低风险任务可直接验收。",
  };
  const platformFee = Math.round(match.quotedPrice * match.marginRate);
  const settlement: SettlementRecord = {
    id: makeId("settlement"),
    jobId: job.id,
    agentId: match.agentId,
    ownerId: "",
    enterprisePaid: match.quotedPrice,
    platformFee,
    ownerPayout: match.quotedPrice - platformFee,
    status: "pending_acceptance",
  };

  return {
    job: { ...job, status: "delivered" },
    delivery,
    settlement,
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: "Secure Runtime",
      action: "提交交付物",
      objectType: "delivery",
      objectId: delivery.id,
      detail: `${job.title} 已完成交付，质量分 ${qualityScore}。`,
    },
  };
}

export function acceptDelivery(
  job: EnterpriseJob,
  delivery: DeliveryRecord,
  settlement: SettlementRecord,
): {
  job: EnterpriseJob;
  delivery: DeliveryRecord;
  settlement: SettlementRecord;
  audit: AuditEvent;
} {
  return {
    job: { ...job, status: "accepted" },
    delivery: { ...delivery, status: "accepted", humanReviewNotes: "企业验收通过，进入结算。" },
    settlement: { ...settlement, status: "ready_to_settle" },
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: job.company,
      action: "验收交付",
      objectType: "delivery",
      objectId: delivery.id,
      detail: `${job.company} 接受交付，准备向 Agent Owner 分账。`,
    },
  };
}

export function settlePayment(
  job: EnterpriseJob,
  settlement: SettlementRecord,
): { job: EnterpriseJob; settlement: SettlementRecord; audit: AuditEvent } {
  return {
    job: { ...job, status: "settled" },
    settlement: { ...settlement, status: "settled" },
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: "Settlement Engine",
      action: "完成结算分账",
      objectType: "settlement",
      objectId: settlement.id,
      detail: `企业支付 ${settlement.enterprisePaid} 元，平台服务费 ${settlement.platformFee} 元，Owner 分账 ${settlement.ownerPayout} 元。`,
    },
  };
}

export function buildExchangeReport(
  agents: AgentPassport[],
  jobs: EnterpriseJob[],
  matches: MatchCandidate[],
  settlements: SettlementRecord[],
): ExchangeReport {
  const acceptedJobs = jobs.filter((job) => ["accepted", "settled"].includes(job.status)).length;
  const averageMatchScore =
    matches.length === 0
      ? 0
      : Math.round(matches.reduce((sum, match) => sum + match.score, 0) / matches.length);
  return {
    totalAgents: agents.length,
    certifiedAgents: agents.filter((agent) => levelRank[agent.certificationLevel] >= 1).length,
    openJobs: jobs.filter((job) => job.status === "open").length,
    matchedJobs: jobs.filter((job) => ["matched", "in_trial", "delivered"].includes(job.status)).length,
    acceptedJobs,
    grossTransactionValue: settlements.reduce((sum, settlement) => sum + settlement.enterprisePaid, 0),
    platformRevenue: settlements.reduce((sum, settlement) => sum + settlement.platformFee, 0),
    averageMatchScore,
  };
}

export function levelLabel(level: CertificationLevel) {
  const labels: Record<CertificationLevel, string> = {
    L0: "L0 未认证",
    L1: "L1 沙箱试工",
    L2: "L2 只读生产",
    L3: "L3 人审写入",
    L4: "L4 受控自动执行",
    L5: "L5 高合规托管",
  };
  return labels[level];
}

function scoreMatch(
  job: EnterpriseJob,
  agent: AgentPassport,
  owner?: AgentOwner,
): MatchCandidate {
  const requiredMatches = job.requiredSkills.filter((skill) =>
    agent.skills.some((agentSkill) => skill.includes(agentSkill) || agentSkill.includes(skill)),
  );
  const categoryBonus = agent.tags.some((tag) => job.category.toLowerCase().includes(tag)) ? 8 : 0;
  const levelBonus = (levelRank[agent.certificationLevel] - levelRank[job.minCertificationLevel]) * 5;
  const ownerBonus = owner ? owner.reputationScore / 10 + Math.min(owner.completedJobs, 30) / 5 : 5;
  const speedBonus = job.dueInHours >= agent.avgTurnaroundHours ? 8 : -6;
  const budgetFit = agent.basePrice <= job.budget ? 10 : -8;
  const score = clamp(
    42 +
      requiredMatches.length * 14 +
      categoryBonus +
      levelBonus +
      ownerBonus +
      speedBonus +
      budgetFit +
      agent.benchmarkScore / 8,
    45,
    98,
  );
  const quotedPrice = clamp(
    Math.min(job.budget, Math.max(agent.basePrice, job.budget * (score / 115))),
    Math.round(agent.basePrice * 0.85),
    job.budget,
  );

  return {
    id: makeId("match"),
    jobId: job.id,
    agentId: agent.id,
    score,
    quotedPrice,
    estimatedHours: Math.max(4, Math.round(agent.avgTurnaroundHours * (100 / Math.max(score, 60)))),
    marginRate: score >= 90 ? 0.22 : 0.2,
    reasons: [
      `${requiredMatches.length}/${job.requiredSkills.length} 个技能匹配`,
      `${levelLabel(agent.certificationLevel)} 满足最低 ${levelLabel(job.minCertificationLevel)}`,
      `历史成功率 ${Math.round(agent.successRate * 100)}%，基准分 ${agent.benchmarkScore}`,
    ],
    constraints: [
      agent.riskBoundary,
      job.requiresHumanReview ? "企业验收和高风险动作必须人审。" : "低风险任务可走快速验收。",
    ],
  };
}

function inferLevel(score: number, riskLevel: string, boundary: string): CertificationLevel {
  if (score >= 94 && riskLevel !== "high" && boundary.includes("私有")) return "L5";
  if (score >= 90 && riskLevel !== "high") return "L4";
  if (score >= 84 && (boundary.includes("人审") || boundary.includes("reviewer"))) return "L3";
  if (score >= 78) return "L2";
  if (score >= 70) return "L1";
  return "L0";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
