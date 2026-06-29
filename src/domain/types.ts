export type AgentFramework =
  | "Codex"
  | "Claude Code"
  | "Hermes"
  | "OpenClaw"
  | "LangGraph"
  | "CrewAI"
  | "Custom Agent";

export type CertificationLevel =
  | "L0"
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "L5";

export type AgentStatus =
  | "draft"
  | "certifying"
  | "certified"
  | "matched"
  | "paused";

export type JobStatus =
  | "draft"
  | "open"
  | "matched"
  | "in_trial"
  | "delivered"
  | "accepted"
  | "settled";

export type RiskLevel = "low" | "medium" | "high";

export type PricingModel = "per_task" | "retainer" | "outcome" | "hourly";
export type Currency = "CNY" | "USD" | "RTC" | "MRWK" | "SATS" | "BCH" | "TOKEN";

export type BountySourceKind =
  | "GitHub"
  | "BountyHub"
  | "Algora"
  | "Bountysource"
  | "IssueHunt"
  | "Manual";

export type BountySourceStatus = "connected" | "manual" | "needs_auth";

export type BountyOpportunityStatus =
  | "collected"
  | "verified"
  | "published"
  | "claimed"
  | "in_progress"
  | "delivered"
  | "settled"
  | "rejected";

export interface BountySource {
  id: string;
  name: string;
  kind: BountySourceKind;
  url: string;
  scanCadence: string;
  lastScanAt: string;
  status: BountySourceStatus;
  collectedCount: number;
  publishedCount: number;
}

export interface BountyOpportunity {
  id: string;
  sourceId: string;
  sourcePlatform: BountySourceKind;
  repository: string;
  title: string;
  sourceUrl: string;
  bountyProvider: string;
  rewardAmount: number;
  currency: Currency;
  rewardLabel: string;
  status: BountyOpportunityStatus;
  collectedAt: string;
  updatedAt: string;
  deadline?: string;
  verificationScore: number;
  payoutConfidence: RiskLevel;
  duplicateRisk: RiskLevel;
  difficulty: RiskLevel;
  tags: string[];
  requiredSkills: string[];
  summary: string;
  rejectionReason?: string;
  routeJobId?: string;
}

export interface AgentOwner {
  id: string;
  name: string;
  type: "individual" | "studio" | "consultancy";
  location: string;
  reputationScore: number;
  completedJobs: number;
  payoutAccountStatus: "pending" | "verified";
}

export interface AgentPassport {
  id: string;
  name: string;
  ownerId: string;
  frameworks: AgentFramework[];
  version: string;
  status: AgentStatus;
  certificationLevel: CertificationLevel;
  skills: string[];
  toolchain: string[];
  collaborationMode: string;
  riskBoundary: string;
  benchmarkScore: number;
  successRate: number;
  avgTurnaroundHours: number;
  pricingModel: PricingModel;
  basePrice: number;
  tags: string[];
}

export interface CertificationTask {
  id: string;
  title: string;
  category: string;
  requiredSkills: string[];
  expectedOutput: string;
  riskLevel: RiskLevel;
  passingScore: number;
}

export interface CertificationRun {
  id: string;
  agentId: string;
  taskId: string;
  startedAt: string;
  completedAt: string;
  score: number;
  pass: boolean;
  findings: string[];
  recommendedLevel: CertificationLevel;
}

export interface EnterpriseJob {
  id: string;
  company: string;
  title: string;
  category: string;
  status: JobStatus;
  goal: string;
  requiredSkills: string[];
  inputMaterials: string[];
  expectedDeliverables: string[];
  acceptanceCriteria: string[];
  riskLevel: RiskLevel;
  minCertificationLevel: CertificationLevel;
  budget: number;
  currency?: Currency;
  dueInHours: number;
  requiresHumanReview: boolean;
  createdAt: string;
}

export interface MatchCandidate {
  id: string;
  jobId: string;
  agentId: string;
  score: number;
  quotedPrice: number;
  currency?: Currency;
  estimatedHours: number;
  marginRate: number;
  reasons: string[];
  constraints: string[];
}

export interface DeliveryRecord {
  id: string;
  jobId: string;
  agentId: string;
  submittedAt: string;
  status: "trial_output" | "final_output" | "accepted" | "revision_requested";
  summary: string;
  artifacts: string[];
  qualityScore: number;
  humanReviewNotes: string;
}

export interface SettlementRecord {
  id: string;
  jobId: string;
  agentId: string;
  ownerId: string;
  enterprisePaid: number;
  platformFee: number;
  ownerPayout: number;
  currency?: Currency;
  status: "pending_acceptance" | "ready_to_settle" | "settled";
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  objectType: "agent" | "job" | "match" | "delivery" | "settlement" | "opportunity" | "source";
  objectId: string;
  detail: string;
}

export interface ExchangeReport {
  totalAgents: number;
  certifiedAgents: number;
  openJobs: number;
  matchedJobs: number;
  acceptedJobs: number;
  grossTransactionValue: number;
  platformRevenue: number;
  averageMatchScore: number;
}

export interface AgentSubmissionInput {
  name: string;
  ownerName: string;
  frameworks: AgentFramework[];
  skills: string[];
  toolchain: string[];
  collaborationMode: string;
  riskBoundary: string;
  pricingModel: PricingModel;
  basePrice: number;
}

export interface JobSubmissionInput {
  company: string;
  title: string;
  category: string;
  goal: string;
  requiredSkills: string[];
  inputMaterials: string[];
  expectedDeliverables: string[];
  acceptanceCriteria: string[];
  riskLevel: RiskLevel;
  minCertificationLevel: CertificationLevel;
  budget: number;
  currency?: Currency;
  dueInHours: number;
  requiresHumanReview: boolean;
}
