import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  Database,
  FileSearch,
  FileText,
  History,
  Network,
  Search,
  ShieldCheck,
  Store,
  Terminal,
  UploadCloud,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  activeBountyJobId,
  codexAgentId,
  dxrpJobId,
  hermesAgentId,
  memantoJobId,
  seedAgents,
  seedAuditEvents,
  seedBountyOpportunities,
  seedBountySources,
  seedDeliveries,
  seedJobs,
  seedMatches,
  seedOwners,
  seedSettlements,
} from "./data/seedData";
import type {
  AgentOwner,
  AgentPassport,
  AuditEvent,
  BountyOpportunity,
  BountySource,
  DeliveryRecord,
  EnterpriseJob,
  MatchCandidate,
  SettlementRecord,
} from "./domain/types";
import {
  acceptDelivery,
  acceptMatch,
  buildExchangeReport,
  generateMatches,
  settlePayment,
  submitDelivery,
  submitJob,
} from "./services/exchangeService";
import { formatMoney } from "./services/money";

type View = "radar" | "market" | "agents" | "delivery" | "audit";

const navItems: Array<{ id: View; label: string; icon: typeof Activity }> = [
  { id: "radar", label: "Bounty radar", icon: Search },
  { id: "market", label: "Task market", icon: Store },
  { id: "agents", label: "Agent desk", icon: Network },
  { id: "delivery", label: "Delivery", icon: UploadCloud },
  { id: "audit", label: "Audit log", icon: History },
];

function App() {
  const [view, setView] = useState<View>("radar");
  const [opportunities, setOpportunities] = useState<BountyOpportunity[]>(seedBountyOpportunities);
  const [jobs, setJobs] = useState<EnterpriseJob[]>(seedJobs);
  const [matches, setMatches] = useState<MatchCandidate[]>(seedMatches);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(seedDeliveries);
  const [settlements, setSettlements] = useState<SettlementRecord[]>(seedSettlements);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(seedAuditEvents);
  const [selectedJobId, setSelectedJobId] = useState(activeBountyJobId);

  const agents = seedAgents;
  const owners = seedOwners;

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || jobs[0],
    [jobs, selectedJobId],
  );
  const selectedOpportunity = useMemo(
    () => opportunities.find((item) => item.routeJobId === selectedJob?.id),
    [opportunities, selectedJob],
  );
  const selectedMatches = useMemo(
    () => matches.filter((match) => match.jobId === selectedJob?.id),
    [matches, selectedJob],
  );
  const selectedDeliveries = useMemo(
    () => deliveries.filter((delivery) => delivery.jobId === selectedJob?.id),
    [deliveries, selectedJob],
  );
  const selectedSettlements = useMemo(
    () => settlements.filter((settlement) => settlement.jobId === selectedJob?.id),
    [settlements, selectedJob],
  );
  const report = useMemo(
    () => buildExchangeReport(agents, jobs, matches, settlements),
    [agents, jobs, matches, settlements],
  );
  const usdPipeline = useMemo(
    () =>
      opportunities
        .filter((item) => item.currency === "USD" && item.status !== "rejected")
        .reduce((sum, item) => sum + item.rewardAmount, 0),
    [opportunities],
  );
  const publishableCount = opportunities.filter((item) =>
    ["collected", "verified"].includes(item.status),
  ).length;

  const hermes = agents.find((agent) => agent.id === hermesAgentId);
  const codex = agents.find((agent) => agent.id === codexAgentId);

  function pushAudit(event: AuditEvent) {
    setAuditEvents((current) => [event, ...current]);
  }

  function createAudit(
    action: string,
    objectType: AuditEvent["objectType"],
    objectId: string,
    detail: string,
    actor = "AgentWork Exchange",
  ): AuditEvent {
    return {
      id: `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      objectType,
      objectId,
      detail,
    };
  }

  function handlePublishOpportunity(opportunityId: string) {
    const opportunity = opportunities.find((item) => item.id === opportunityId);
    if (!opportunity || opportunity.status === "rejected") return;

    if (opportunity.routeJobId) {
      setSelectedJobId(opportunity.routeJobId);
      setOpportunities((current) =>
        current.map((item) =>
          item.id === opportunity.id ? { ...item, status: "published", updatedAt: new Date().toISOString() } : item,
        ),
      );
      pushAudit(
        createAudit(
          "Published existing bounty route",
          "opportunity",
          opportunity.id,
          `${opportunity.title} is already mapped to a platform job and was opened in the market.`,
        ),
      );
      setView("market");
      return;
    }

    const created = submitJob({
      company: opportunity.repository,
      title: `${opportunity.title} [${opportunity.rewardLabel} bounty]`,
      category: opportunity.tags[0] || "software bounty",
      goal: opportunity.summary,
      requiredSkills: opportunity.requiredSkills,
      inputMaterials: [opportunity.sourceUrl],
      expectedDeliverables: [
        "Bounty ownership and duplicate-risk ledger",
        "Minimal reproducible report, test, or patch plan",
        "Submission checklist for maintainer approval",
      ],
      acceptanceCriteria: [
        "Payout and acceptance route are verified before work starts",
        "No public GitHub claim, fork, PR, or comment before owner approval",
        "Agent output includes reproducible evidence and explicit handoff notes",
      ],
      riskLevel: opportunity.difficulty === "high" || opportunity.duplicateRisk === "high" ? "high" : "medium",
      minCertificationLevel: opportunity.difficulty === "high" ? "L3" : "L2",
      budget: opportunity.rewardAmount,
      currency: opportunity.currency,
      dueInHours: 72,
      requiresHumanReview: true,
    });
    const generated = generateMatches(created.job, agents, owners);
    setJobs((current) => [created.job, ...current]);
    setMatches((current) => [...generated.matches, ...current]);
    setOpportunities((current) =>
      current.map((item) =>
        item.id === opportunity.id
          ? {
              ...item,
              routeJobId: created.job.id,
              status: "published",
              updatedAt: new Date().toISOString(),
            }
          : item,
      ),
    );
    setSelectedJobId(created.job.id);
    setAuditEvents((current) => [
      generated.audit,
      created.audit,
      createAudit(
        "Converted bounty opportunity to market task",
        "opportunity",
        opportunity.id,
        `${opportunity.title} was published with ${generated.matches.length} candidate Agent matches.`,
      ),
      ...current,
    ]);
    setView("market");
  }

  function handleOpenJob(jobId: string) {
    setSelectedJobId(jobId);
    setView("agents");
  }

  function handleRecordApprovalRequest() {
    if (!selectedJob) return;
    pushAudit(
      createAudit(
        "Prepared owner approval request",
        "job",
        selectedJob.id,
        `Hermes prepared the approval request for "${selectedJob.title}" locally. Owner review is still required before any public GitHub action.`,
        "Hermes Bounty Scout",
      ),
    );
    setView("audit");
  }

  function handleClearApprovalGate() {
    if (!selectedJob) return;
    setJobs((current) =>
      current.map((item) => (item.id === selectedJob.id ? { ...item, status: "in_trial" } : item)),
    );
    setOpportunities((current) =>
      current.map((item) =>
        item.routeJobId === selectedJob.id ? { ...item, status: "in_progress", updatedAt: new Date().toISOString() } : item,
      ),
    );
    pushAudit(
      createAudit(
        "Cleared approval gate",
        "job",
        selectedJob.id,
        `Owner cleared the review gate for "${selectedJob.title}". Codex can now prepare the approved implementation or reproducibility lane.`,
        "Platform Human Review",
      ),
    );
  }

  function handleAcceptMatch(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    const job = match ? jobs.find((item) => item.id === match.jobId) : undefined;
    if (!match || !job) return;
    const result = acceptMatch(job, match);
    setJobs((current) => current.map((item) => (item.id === result.job.id ? result.job : item)));
    setOpportunities((current) =>
      current.map((item) =>
        item.routeJobId === result.job.id ? { ...item, status: "in_progress", updatedAt: new Date().toISOString() } : item,
      ),
    );
    pushAudit(result.audit);
  }

  function handleSubmitDelivery(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    const job = match ? jobs.find((item) => item.id === match.jobId) : undefined;
    const agent = match ? agents.find((item) => item.id === match.agentId) : undefined;
    if (!match || !job || !agent) return;

    if (job.requiresHumanReview && job.status !== "in_trial" && job.status !== "delivered") {
      pushAudit(
        createAudit(
          "Blocked delivery before approval",
          "job",
          job.id,
          `The platform prevented delivery for "${job.title}" because the owner approval gate has not been cleared.`,
          "Risk Guardrail",
        ),
      );
      setView("audit");
      return;
    }

    const result = submitDelivery(job, match);
    const settlement = {
      ...result.settlement,
      ownerId: agent.ownerId,
    };
    setJobs((current) => current.map((item) => (item.id === result.job.id ? result.job : item)));
    setDeliveries((current) => [result.delivery, ...current]);
    setSettlements((current) => [settlement, ...current]);
    setOpportunities((current) =>
      current.map((item) =>
        item.routeJobId === result.job.id ? { ...item, status: "delivered", updatedAt: new Date().toISOString() } : item,
      ),
    );
    pushAudit(result.audit);
    setView("delivery");
  }

  function handleAcceptDelivery(deliveryId: string) {
    const delivery = deliveries.find((item) => item.id === deliveryId);
    const job = delivery ? jobs.find((item) => item.id === delivery.jobId) : undefined;
    const settlement = delivery
      ? settlements.find((item) => item.jobId === delivery.jobId && item.agentId === delivery.agentId)
      : undefined;
    if (!delivery || !job) return;
    if (!settlement) {
      pushAudit(
        createAudit(
          "Blocked artifact acceptance before priced delivery",
          "delivery",
          delivery.id,
          "This dispatch artifact is an internal routing record. A priced final delivery must be submitted before settlement acceptance.",
          "Settlement Guardrail",
        ),
      );
      setView("audit");
      return;
    }
    const result = acceptDelivery(job, delivery, settlement);
    setJobs((current) => current.map((item) => (item.id === result.job.id ? result.job : item)));
    setDeliveries((current) =>
      current.map((item) => (item.id === result.delivery.id ? result.delivery : item)),
    );
    setSettlements((current) =>
      current.map((item) => (item.id === result.settlement.id ? result.settlement : item)),
    );
    pushAudit(result.audit);
  }

  function handleSettle(settlementId: string) {
    const settlement = settlements.find((item) => item.id === settlementId);
    const job = settlement ? jobs.find((item) => item.id === settlement.jobId) : undefined;
    if (!settlement || !job || settlement.status !== "ready_to_settle") return;
    const result = settlePayment(job, settlement);
    setJobs((current) => current.map((item) => (item.id === result.job.id ? result.job : item)));
    setSettlements((current) =>
      current.map((item) => (item.id === result.settlement.id ? result.settlement : item)),
    );
    setOpportunities((current) =>
      current.map((item) =>
        item.routeJobId === result.job.id ? { ...item, status: "settled", updatedAt: new Date().toISOString() } : item,
      ),
    );
    pushAudit(result.audit);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AW</div>
          <div>
            <strong>AgentWork Exchange</strong>
            <span>Agent bounty marketplace</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => setView(item.id)}>
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <ShieldCheck size={16} />
          Approval-gated execution / local Agent passports
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">GitHub bounty collection to Agent delivery</p>
            <h1>AgentWork Exchange operations desk</h1>
          </div>
          <button className="secondary-button" onClick={() => setView("radar")}>
            <FileSearch size={16} />
            Scan bounty pool
          </button>
        </header>

        <section className="dashboard-grid">
          <Metric title="Collected bounties" value={opportunities.length} note={`${publishableCount} ready to publish`} icon={Database} />
          <Metric title="USD reward pool" value={formatMoney(usdPipeline, "USD")} note="Rejected tasks excluded" icon={WalletCards} />
          <Metric title="Agent matches" value={matches.length} note={`${report.averageMatchScore} avg match score`} icon={BadgeCheck} />
          <Metric title="Deliveries" value={deliveries.length} note={`${report.acceptedJobs} accepted jobs`} icon={UploadCloud} />
        </section>

        <PipelineStrip />

        {view === "radar" && (
          <RadarView
            sources={seedBountySources}
            opportunities={opportunities}
            onPublish={handlePublishOpportunity}
            onOpenJob={(jobId) => {
              setSelectedJobId(jobId);
              setView("market");
            }}
          />
        )}

        {view === "market" && (
          <MarketView
            jobs={jobs}
            opportunities={opportunities}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            onOpenJob={handleOpenJob}
          />
        )}

        {view === "agents" && selectedJob && (
          <AgentDesk
            job={selectedJob}
            opportunity={selectedOpportunity}
            agents={agents}
            owners={owners}
            hermes={hermes}
            codex={codex}
            matches={selectedMatches}
            deliveries={selectedDeliveries}
            onAcceptMatch={handleAcceptMatch}
            onSubmitDelivery={handleSubmitDelivery}
            onAcceptDelivery={handleAcceptDelivery}
            onRecordApprovalRequest={handleRecordApprovalRequest}
            onClearApprovalGate={handleClearApprovalGate}
          />
        )}

        {view === "delivery" && (
          <DeliveryDesk
            jobs={jobs}
            agents={agents}
            owners={owners}
            deliveries={deliveries}
            settlements={settlements}
            selectedJobId={selectedJobId}
            onSelectJob={(jobId) => {
              setSelectedJobId(jobId);
              setView("agents");
            }}
            onAcceptDelivery={handleAcceptDelivery}
            onSettle={handleSettle}
          />
        )}

        {view === "audit" && <AuditSection events={auditEvents} />}

        <footer className="page-footer">
          Selected job: {selectedJob?.title || "None"} / External write actions remain approval-gated.
        </footer>
      </main>
    </div>
  );
}

function Metric({
  title,
  value,
  note,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  note: string;
  icon: typeof Activity;
}) {
  return (
    <article className="metric-card tone-blue">
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function PipelineStrip() {
  const steps = [
    { label: "Collect", detail: "GitHub and bounty feeds", icon: Search },
    { label: "Verify", detail: "Payout, duplicate, risk", icon: ShieldCheck },
    { label: "Publish", detail: "AgentWork market task", icon: Store },
    { label: "Assign", detail: "Hermes + Codex lanes", icon: Bot },
    { label: "Deliver", detail: "Artifacts, acceptance, payout", icon: UploadCloud },
  ];
  return (
    <section className="pipeline-strip">
      {steps.map((step) => {
        const Icon = step.icon;
        return (
          <div className="pipeline-step" key={step.label}>
            <Icon size={17} />
            <strong>{step.label}</strong>
            <span>{step.detail}</span>
          </div>
        );
      })}
    </section>
  );
}

function RadarView({
  sources,
  opportunities,
  onPublish,
  onOpenJob,
}: {
  sources: BountySource[];
  opportunities: BountyOpportunity[];
  onPublish: (opportunityId: string) => void;
  onOpenJob: (jobId: string) => void;
}) {
  return (
    <div className="operations-grid">
      <section className="panel source-panel">
        <div className="section-title">
          <Database size={18} />
          <h2>Bounty sources</h2>
          <span className="count-pill">{sources.length}</span>
        </div>
        <div className="source-grid">
          {sources.map((source) => (
            <article className="source-card" key={source.id}>
              <div>
                <strong>{source.name}</strong>
                <span>{source.kind} / {source.scanCadence}</span>
              </div>
              <small>{source.url}</small>
              <div className="mini-metrics">
                <span>{source.collectedCount} collected</span>
                <span>{source.publishedCount} published</span>
                <span className={`status-pill source-${source.status}`}>{source.status}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel opportunity-panel">
        <div className="section-title">
          <FileSearch size={18} />
          <h2>Collected opportunities</h2>
          <span className="count-pill">{opportunities.length}</span>
        </div>
        <div className="opportunity-list">
          {opportunities.map((opportunity) => (
            <article className="opportunity-card" key={opportunity.id}>
              <div className="opportunity-main">
                <div>
                  <span className={`status-pill status-${opportunity.status}`}>{opportunity.status}</span>
                  <strong>{opportunity.title}</strong>
                  <small>{opportunity.repository} / {opportunity.bountyProvider}</small>
                </div>
                <div className="reward-pill">{opportunity.rewardLabel}</div>
              </div>
              <p>{opportunity.summary}</p>
              {opportunity.rejectionReason && <small className="warning-text">{opportunity.rejectionReason}</small>}
              <div className="risk-row">
                <RiskBadge label="payout" value={opportunity.payoutConfidence} />
                <RiskBadge label="duplicate" value={opportunity.duplicateRisk} />
                <RiskBadge label="difficulty" value={opportunity.difficulty} />
                <span>verification {opportunity.verificationScore}</span>
              </div>
              <div className="tag-row">
                {opportunity.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="connector-actions">
                {opportunity.routeJobId ? (
                  <button className="primary-button" onClick={() => onOpenJob(opportunity.routeJobId as string)}>
                    <Store size={15} />
                    Open market task
                  </button>
                ) : (
                  <button
                    className="primary-button"
                    disabled={opportunity.status === "rejected"}
                    onClick={() => onPublish(opportunity.id)}
                  >
                    <UploadCloud size={15} />
                    Publish to market
                  </button>
                )}
                <a className="link-button" href={opportunity.sourceUrl} target="_blank" rel="noreferrer">
                  Source
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function RiskBadge({ label, value }: { label: string; value: "low" | "medium" | "high" }) {
  return <span className={`risk-badge risk-${value}`}>{label}: {value}</span>;
}

function MarketView({
  jobs,
  opportunities,
  selectedJobId,
  onSelectJob,
  onOpenJob,
}: {
  jobs: EnterpriseJob[];
  opportunities: BountyOpportunity[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  onOpenJob: (jobId: string) => void;
}) {
  const selectedJob = jobs.find((job) => job.id === selectedJobId) || jobs[0];
  const selectedOpportunity = opportunities.find((item) => item.routeJobId === selectedJob?.id);
  return (
    <div className="split-grid">
      <section className="panel demand-panel">
        <div className="section-title">
          <BriefcaseBusiness size={18} />
          <h2>Published market tasks</h2>
          <span className="count-pill">{jobs.length}</span>
        </div>
        <div className="job-list">
          {jobs.map((job) => (
            <button
              key={job.id}
              className={`job-card ${selectedJobId === job.id ? "active" : ""}`}
              onClick={() => onSelectJob(job.id)}
            >
              <span className={`status-pill status-${job.status}`}>{job.status}</span>
              <strong>{job.title}</strong>
              <small>{job.company} / {job.category}</small>
              <p>{job.goal}</p>
              <em>
                Budget {formatMoney(job.budget, job.currency)} / minimum {job.minCertificationLevel}
              </em>
            </button>
          ))}
        </div>
      </section>

      {selectedJob && (
        <section className="panel thesis-panel">
          <div className="section-title">
            <Store size={18} />
            <h2>Market listing</h2>
            <span className={`status-pill status-${selectedJob.status}`}>{selectedJob.status}</span>
          </div>
          <div className="selected-job">
            <strong>{selectedJob.title}</strong>
            <span>{selectedJob.company} / {formatMoney(selectedJob.budget, selectedJob.currency)} / {selectedJob.dueInHours}h</span>
            <p>{selectedJob.goal}</p>
          </div>
          {selectedOpportunity && (
            <div className="source-summary">
              <span>Source: {selectedOpportunity.sourcePlatform} / {selectedOpportunity.bountyProvider}</span>
              <span>Verification: {selectedOpportunity.verificationScore}</span>
              <span>Reward: {selectedOpportunity.rewardLabel}</span>
            </div>
          )}
          <div className="detail-grid">
            <InfoList title="Inputs" items={selectedJob.inputMaterials} />
            <InfoList title="Deliverables" items={selectedJob.expectedDeliverables} />
            <InfoList title="Acceptance" items={selectedJob.acceptanceCriteria} />
          </div>
          <button className="primary-button" onClick={() => onOpenJob(selectedJob.id)}>
            <Network size={16} />
            Assign to Agents
          </button>
        </section>
      )}
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="info-list">
      <strong>{title}</strong>
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

function AgentDesk({
  job,
  opportunity,
  agents,
  owners,
  hermes,
  codex,
  matches,
  deliveries,
  onAcceptMatch,
  onSubmitDelivery,
  onAcceptDelivery,
  onRecordApprovalRequest,
  onClearApprovalGate,
}: {
  job: EnterpriseJob;
  opportunity?: BountyOpportunity;
  agents: AgentPassport[];
  owners: AgentOwner[];
  hermes?: AgentPassport;
  codex?: AgentPassport;
  matches: MatchCandidate[];
  deliveries: DeliveryRecord[];
  onAcceptMatch: (matchId: string) => void;
  onSubmitDelivery: (matchId: string) => void;
  onAcceptDelivery: (deliveryId: string) => void;
  onRecordApprovalRequest: () => void;
  onClearApprovalGate: () => void;
}) {
  return (
    <div className="operations-grid">
      <section className="panel exchange-desk">
        <div className="section-title">
          <Network size={18} />
          <h2>Agent assignment desk</h2>
          <span className={`status-pill status-${job.status}`}>{job.status}</span>
        </div>
        <div className="selected-job">
          <strong>{job.title}</strong>
          <span>
            {job.company} / {formatMoney(job.budget, job.currency)} / {job.dueInHours}h / minimum {job.minCertificationLevel}
          </span>
          <p>{job.goal}</p>
        </div>

        <div className="standard-block">
          <div className="subsection-title">
            <AlertTriangle size={17} />
            <h3>Approval gate</h3>
          </div>
          <p className="lane-footnote">
            External GitHub actions stay blocked until the owner approves the selected bounty target, disclosure route, and PR/comment plan.
          </p>
          <pre className="code-block">{getApprovalDraft(job)}</pre>
          <div className="connector-actions">
            <button className="secondary-button" onClick={onRecordApprovalRequest}>
              <ClipboardCheck size={16} />
              Log Hermes route
            </button>
            <button className="primary-button" onClick={onClearApprovalGate}>
              <CheckCircle2 size={16} />
              Clear gate after approval
            </button>
          </div>
        </div>

        <div className="subsection-title">
          <ClipboardCheck size={16} />
          <h3>Matched agents</h3>
        </div>
        <div className="match-list">
          {matches.length === 0 && <div className="empty-state compact">No Agent meets the certification and skill threshold yet.</div>}
          {matches.map((match) => {
            const agent = agents.find((item) => item.id === match.agentId);
            const owner = owners.find((item) => item.id === agent?.ownerId);
            return (
              <article className="match-card" key={match.id}>
                <div>
                  <strong>{agent?.name || "Unknown Agent"}</strong>
                  <span>
                    Match {match.score} / quote {formatMoney(match.quotedPrice, match.currency || job.currency)} / owner {owner?.name || "unknown"}
                  </span>
                  <p>{match.reasons.join(" | ")}</p>
                  <small>{match.constraints.join(" | ")}</small>
                </div>
                <button className="secondary-button" onClick={() => onAcceptMatch(match.id)}>
                  <CheckCircle2 size={15} />
                  Accept trial
                </button>
                <button className="primary-button" onClick={() => onSubmitDelivery(match.id)}>
                  <FileText size={15} />
                  Submit delivery
                </button>
              </article>
            );
          })}
        </div>

        <DispatchArtifacts deliveries={deliveries} onAcceptDelivery={onAcceptDelivery} />
        <CliReplay job={job} />
      </section>

      <section className="agent-bench">
        {opportunity && (
          <article className="panel opportunity-summary">
            <div className="section-title">
              <FileSearch size={18} />
              <h2>Bounty context</h2>
              <span className={`status-pill status-${opportunity.status}`}>{opportunity.status}</span>
            </div>
            <strong>{opportunity.rewardLabel} / {opportunity.repository}</strong>
            <p>{opportunity.summary}</p>
            <div className="risk-row">
              <RiskBadge label="payout" value={opportunity.payoutConfidence} />
              <RiskBadge label="duplicate" value={opportunity.duplicateRisk} />
              <RiskBadge label="difficulty" value={opportunity.difficulty} />
            </div>
          </article>
        )}
        <AgentLane title="Hermes lane" agent={hermes} role="Bounty scouting, duplicate-risk filtering, approval notes" />
        <AgentLane title="OpenAI Codex lane" agent={codex} role="Repository inspection, tests, patch/report after approval" />
      </section>
    </div>
  );
}

function AgentLane({
  title,
  agent,
  role,
}: {
  title: string;
  agent?: AgentPassport;
  role: string;
}) {
  return (
    <section className="panel trust-panel">
      <div className="section-title">
        <Bot size={18} />
        <h2>{title}</h2>
        <span className={`level-badge level-${agent?.certificationLevel || "L0"}`}>
          {agent?.certificationLevel || "L0"}
        </span>
      </div>
      <div className="agent-card">
        <strong>{agent?.name}</strong>
        <small>{role}</small>
        <p>{agent?.collaborationMode}</p>
        <em>{agent?.skills.join(" / ")}</em>
      </div>
      <ul>
        <li>Boundary: {agent?.riskBoundary}</li>
        <li>Benchmark: {agent?.benchmarkScore} / Success: {Math.round((agent?.successRate || 0) * 100)}%</li>
      </ul>
    </section>
  );
}

function DispatchArtifacts({
  deliveries,
  onAcceptDelivery,
}: {
  deliveries: DeliveryRecord[];
  onAcceptDelivery: (deliveryId: string) => void;
}) {
  return (
    <>
      <div className="subsection-title">
        <FileText size={16} />
        <h3>Dispatch artifacts</h3>
      </div>
      <div className="delivery-list">
        {deliveries.length === 0 && <div className="empty-state compact">No delivery or dispatch artifact yet.</div>}
        {deliveries.map((delivery) => (
          <article className="delivery-card" key={delivery.id}>
            <strong>{delivery.summary}</strong>
            <span>Quality {delivery.qualityScore} / {delivery.status}</span>
            <p>{delivery.artifacts.join(" | ")}</p>
            <small>{delivery.humanReviewNotes}</small>
            {delivery.status !== "accepted" && (
              <button className="secondary-button" onClick={() => onAcceptDelivery(delivery.id)}>
                <BadgeCheck size={15} />
                Accept artifact
              </button>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function CliReplay({ job }: { job: EnterpriseJob }) {
  const cliReplay =
    job.id === memantoJobId
      ? `pnpm agentwork scan --json
pnpm agentwork tasks --json
pnpm agentwork connect --file .\\agentwork-dispatch\\hermes-memanto-scout.agentwork.yaml --json
pnpm agentwork certify --file .\\agentwork-dispatch\\hermes-memanto-scout.agentwork.yaml --task cert-research-001 --json
pnpm agentwork accept bounty-memanto-bug-challenge-100usd --file .\\agentwork-dispatch\\hermes-memanto-scout.agentwork.yaml --json
pnpm agentwork connect --file .\\agentwork-dispatch\\codex-memanto-implementer.agentwork.yaml --json
pnpm agentwork certify --file .\\agentwork-dispatch\\codex-memanto-implementer.agentwork.yaml --task cert-agent-memory-001 --json
pnpm agentwork accept bounty-memanto-bug-challenge-100usd --file .\\agentwork-dispatch\\codex-memanto-implementer.agentwork.yaml --json`
      : job.id === dxrpJobId
        ? `pnpm agentwork scan --json
pnpm agentwork tasks --json
pnpm agentwork connect --file .\\agentwork-dispatch\\hermes-dxrp-scout.agentwork.yaml --json
pnpm agentwork accept bounty-dxrp-party-system-50usd --file .\\agentwork-dispatch\\hermes-dxrp-scout.agentwork.yaml --json
pnpm agentwork connect --file .\\agentwork-dispatch\\codex-dxrp-implementer.agentwork.yaml --json
pnpm agentwork accept bounty-dxrp-party-system-50usd --file .\\agentwork-dispatch\\codex-dxrp-implementer.agentwork.yaml --json`
        : `pnpm agentwork scan --json
pnpm agentwork tasks --json
pnpm agentwork accept <task-id> --file .\\agentwork.yaml --json`;

  return (
    <div className="standard-block">
      <div className="subsection-title">
        <Terminal size={17} />
        <h3>Local CLI replay</h3>
      </div>
      <pre className="code-block">{cliReplay}</pre>
    </div>
  );
}

function DeliveryDesk({
  jobs,
  agents,
  owners,
  deliveries,
  settlements,
  selectedJobId,
  onSelectJob,
  onAcceptDelivery,
  onSettle,
}: {
  jobs: EnterpriseJob[];
  agents: AgentPassport[];
  owners: AgentOwner[];
  deliveries: DeliveryRecord[];
  settlements: SettlementRecord[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  onAcceptDelivery: (deliveryId: string) => void;
  onSettle: (settlementId: string) => void;
}) {
  return (
    <div className="split-grid">
      <section className="panel delivery-panel">
        <div className="section-title">
          <UploadCloud size={18} />
          <h2>Deliveries</h2>
          <span className="count-pill">{deliveries.length}</span>
        </div>
        <div className="delivery-list">
          {deliveries.map((delivery) => {
            const job = jobs.find((item) => item.id === delivery.jobId);
            const agent = agents.find((item) => item.id === delivery.agentId);
            return (
              <article className={`delivery-card ${selectedJobId === delivery.jobId ? "active" : ""}`} key={delivery.id}>
                <strong>{job?.title || delivery.jobId}</strong>
                <span>{agent?.name || "Unknown Agent"} / quality {delivery.qualityScore} / {delivery.status}</span>
                <p>{delivery.summary}</p>
                <small>{delivery.humanReviewNotes}</small>
                <div className="connector-actions">
                  <button className="secondary-button" onClick={() => onSelectJob(delivery.jobId)}>
                    <Network size={15} />
                    Open agent desk
                  </button>
                  {delivery.status !== "accepted" && (
                    <button className="primary-button" onClick={() => onAcceptDelivery(delivery.id)}>
                      <BadgeCheck size={15} />
                      Accept
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel settlement-panel">
        <div className="section-title">
          <WalletCards size={18} />
          <h2>Settlement queue</h2>
          <span className="count-pill">{settlements.length}</span>
        </div>
        <div className="settlement-list">
          {settlements.length === 0 && <div className="empty-state compact">No priced delivery has reached settlement yet.</div>}
          {settlements.map((settlement) => {
            const job = jobs.find((item) => item.id === settlement.jobId);
            const agent = agents.find((item) => item.id === settlement.agentId);
            const owner = owners.find((item) => item.id === settlement.ownerId);
            return (
              <article className="settlement-card" key={settlement.id}>
                <span className={`status-pill status-${settlement.status}`}>{settlement.status}</span>
                <strong>{job?.title || settlement.jobId}</strong>
                <small>{agent?.name || "Unknown Agent"} / owner {owner?.name || "unknown"}</small>
                <div className="settlement-money">
                  <span>Customer {formatMoney(settlement.enterprisePaid, settlement.currency || job?.currency)}</span>
                  <span>Platform {formatMoney(settlement.platformFee, settlement.currency || job?.currency)}</span>
                  <span>Owner {formatMoney(settlement.ownerPayout, settlement.currency || job?.currency)}</span>
                </div>
                <button
                  className="primary-button"
                  disabled={settlement.status !== "ready_to_settle"}
                  onClick={() => onSettle(settlement.id)}
                >
                  <CheckCircle2 size={15} />
                  Settle payout
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function AuditSection({ events }: { events: AuditEvent[] }) {
  return (
    <section className="panel audit-panel">
      <div className="section-title">
        <History size={18} />
        <h2>Audit log</h2>
        <span className="count-pill">{events.length}</span>
      </div>
      <div className="audit-list">
        {events.map((event) => (
          <article className="audit-event" key={event.id}>
            <div className="audit-icon">
              <History size={15} />
            </div>
            <div>
              <strong>{event.action}</strong>
              <span>
                {event.actor} / {event.objectType}:{event.objectId}
              </span>
              <p>{event.detail}</p>
              <small>{event.timestamp}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getApprovalDraft(job?: EnterpriseJob) {
  if (job?.id === memantoJobId) {
    return `I found the Memanto 100 USD BountyHub challenge, but I will not open a public claim until the duplicate scan identifies a low-overlap flaw.

Proposed route:
- Hermes: review the issue comments and active PR queue, then select one non-duplicate memory flaw, setup friction, or reproducibility gap.
- Codex: inspect the repository and create the smallest reproducible failing test, script, report, or patch.
- Owner review: approve the target and disclosure route before any GitHub comment, fork, PR, or social post.

If the flaw is security-sensitive, I will use private vulnerability reporting or the maintainer's security email instead of a public PR.`;
  }

  if (job?.id === dxrpJobId) {
    return `This bounty may already be assigned, so the platform should not open a competing PR unless the maintainer approves a backup implementer.

Hermes route:
- Confirm assignment state and contributor activity.
- Prepare a concise backup application.
- Keep all public comments behind owner approval.

Codex route after approval:
- Implement only the Stage 1 Party System scope.
- Submit a draft PR with reproducible test notes and clear exclusions.`;
  }

  return `AgentWork approval draft:
- Hermes verifies the bounty source, payout route, duplicate risk, and maintainer acceptance process.
- Codex prepares implementation only after the task is published, matched, and owner-approved.
- No public GitHub comment, fork, PR, exploit detail, or outreach is allowed before the review gate is cleared.`;
}

export default App;
