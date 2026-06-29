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
      action: "Submitted Agent Passport",
      objectType: "agent",
      objectId: agent.id,
      detail: `${agent.name} entered L0 certification queue.`,
    },
  };
}

export function runCertification(
  agent: AgentPassport,
  task: CertificationTask,
): { agent: AgentPassport; run: CertificationRun; audit: AuditEvent } {
  const skillMatch = task.requiredSkills.filter((skill) =>
    agent.skills.some((agentSkill) => fuzzyIncludes(agentSkill, skill) || fuzzyIncludes(skill, agentSkill)),
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
      `${skillMatch}/${task.requiredSkills.length} required skills matched.`,
      pass
        ? `Recommended certification level: ${recommendedLevel}.`
        : "Below passing score; add tool evidence and reviewed examples.",
      includesReviewBoundary(agent.riskBoundary)
        ? "Risk boundary includes human review."
        : "Risk boundary should explicitly include human review.",
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
      action: pass ? "Passed certification task" : "Certification task needs work",
      objectType: "agent",
      objectId: agent.id,
      detail: `${agent.name} scored ${score} on "${task.title}" and was recommended for ${recommendedLevel}.`,
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
      action: "Published enterprise job",
      objectType: "job",
      objectId: job.id,
      detail: `${job.title} entered the matching pool with budget ${job.budget}.`,
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
      action: "Generated candidate matches",
      objectType: "job",
      objectId: job.id,
      detail:
        matches.length > 0
          ? `Generated ${matches.length} candidate Agent matches for "${job.title}".`
          : `No Agent met ${job.minCertificationLevel} and skill requirements for "${job.title}".`,
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
      action: "Accepted match for trial",
      objectType: "match",
      objectId: match.id,
      detail: `Accepted quoted price ${match.quotedPrice} with estimated ${match.estimatedHours} hours.`,
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
    summary: `Submitted ${job.expectedDeliverables.join(", ")}.`,
    artifacts: job.expectedDeliverables.map((item) =>
      item.toLowerCase().replace(/\s+/g, "_").replace(/[^\w-]/g, ""),
    ),
    qualityScore,
    humanReviewNotes: job.requiresHumanReview
      ? "Waiting for enterprise reviewer acceptance."
      : "Low-risk task can move to acceptance review.",
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
    currency: match.currency || job.currency,
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
      action: "Submitted delivery",
      objectType: "delivery",
      objectId: delivery.id,
      detail: `${job.title} delivery submitted with quality score ${qualityScore}.`,
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
    delivery: { ...delivery, status: "accepted", humanReviewNotes: "Accepted by enterprise reviewer." },
    settlement: { ...settlement, status: "ready_to_settle" },
    audit: {
      id: makeId("audit"),
      timestamp: nowIso(),
      actor: job.company,
      action: "Accepted delivery",
      objectType: "delivery",
      objectId: delivery.id,
      detail: `${job.company} accepted the delivery and released it to settlement.`,
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
      action: "Completed settlement",
      objectType: "settlement",
      objectId: settlement.id,
      detail: `Enterprise paid ${settlement.enterprisePaid}; platform fee ${settlement.platformFee}; owner payout ${settlement.ownerPayout}.`,
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
    L0: "L0 Unverified",
    L1: "L1 Sandbox Trial",
    L2: "L2 Read-only/Approval Gate",
    L3: "L3 Human-reviewed Write",
    L4: "L4 Controlled Automation",
    L5: "L5 High-compliance Delegation",
  };
  return labels[level];
}

function scoreMatch(
  job: EnterpriseJob,
  agent: AgentPassport,
  owner?: AgentOwner,
): MatchCandidate {
  const requiredMatches = job.requiredSkills.filter((skill) =>
    agent.skills.some((agentSkill) => fuzzyIncludes(agentSkill, skill) || fuzzyIncludes(skill, agentSkill)),
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
    currency: job.currency,
    estimatedHours: Math.max(4, Math.round(agent.avgTurnaroundHours * (100 / Math.max(score, 60)))),
    marginRate: score >= 90 ? 0.22 : 0.2,
    reasons: [
      `${requiredMatches.length}/${job.requiredSkills.length} required skills matched.`,
      `${levelLabel(agent.certificationLevel)} meets minimum ${levelLabel(job.minCertificationLevel)}.`,
      `Historical success ${Math.round(agent.successRate * 100)}%; benchmark ${agent.benchmarkScore}.`,
    ],
    constraints: [
      agent.riskBoundary,
      job.requiresHumanReview
        ? "Enterprise acceptance and high-risk actions require human review."
        : "Low-risk task can use fast acceptance.",
    ],
  };
}

function inferLevel(score: number, riskLevel: string, boundary: string): CertificationLevel {
  if (score >= 94 && riskLevel !== "high" && /private|compliance/i.test(boundary)) return "L5";
  if (score >= 90 && riskLevel !== "high") return "L4";
  if (score >= 84 && includesReviewBoundary(boundary)) return "L3";
  if (score >= 78) return "L2";
  if (score >= 70) return "L1";
  return "L0";
}

function includesReviewBoundary(text: string) {
  return /review|human|approval|reviewer/i.test(text);
}

function fuzzyIncludes(a: string, b: string) {
  return a.toLowerCase().includes(b.toLowerCase());
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}
