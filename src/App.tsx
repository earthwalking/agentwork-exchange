import {
  Award,
  BadgeCheck,
  Bot,
  BriefcaseBusiness,
  History,
  LayoutDashboard,
  Network,
  PlugZap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AgentSupplyPanel } from "./components/AgentSupplyPanel";
import { AuditLog } from "./components/AuditLog";
import { BountyCertificationPanel } from "./components/BountyCertificationPanel";
import { ConnectorPanel } from "./components/ConnectorPanel";
import { Dashboard } from "./components/Dashboard";
import { ExchangeDesk } from "./components/ExchangeDesk";
import { JobDemandPanel } from "./components/JobDemandPanel";
import {
  seedAgents,
  seedAuditEvents,
  seedCertificationTasks,
  seedDeliveries,
  seedJobs,
  seedMatches,
  seedOwners,
  seedSettlements,
} from "./data/seedData";
import type {
  AgentOwner,
  AgentPassport,
  AgentSubmissionInput,
  AuditEvent,
  CertificationRun,
  DeliveryRecord,
  EnterpriseJob,
  JobSubmissionInput,
  MatchCandidate,
  SettlementRecord,
} from "./domain/types";
import {
  acceptDelivery,
  acceptMatch,
  buildExchangeReport,
  generateMatches,
  runCertification,
  settlePayment,
  submitAgent,
  submitDelivery,
  submitJob,
} from "./services/exchangeService";

type View = "dashboard" | "connector" | "bounty" | "agents" | "jobs" | "exchange" | "audit";

const navItems: Array<{ id: View; label: string; icon: typeof LayoutDashboard }> = [
  { id: "bounty", label: "Bounty认证", icon: Award },
  { id: "dashboard", label: "总览", icon: LayoutDashboard },
  { id: "connector", label: "接入插件", icon: PlugZap },
  { id: "agents", label: "Agent供给", icon: Bot },
  { id: "jobs", label: "企业任务", icon: BriefcaseBusiness },
  { id: "exchange", label: "交易台", icon: Network },
  { id: "audit", label: "审计", icon: History },
];

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [owners, setOwners] = useState<AgentOwner[]>(seedOwners);
  const [agents, setAgents] = useState<AgentPassport[]>(seedAgents);
  const [jobs, setJobs] = useState<EnterpriseJob[]>(seedJobs);
  const [matches, setMatches] = useState<MatchCandidate[]>(seedMatches);
  const [certRuns, setCertRuns] = useState<CertificationRun[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(seedDeliveries);
  const [settlements, setSettlements] = useState<SettlementRecord[]>(seedSettlements);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(seedAuditEvents);
  const [selectedAgentId, setSelectedAgentId] = useState(seedAgents[0].id);
  const [selectedJobId, setSelectedJobId] = useState(seedJobs[0].id);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId),
    [jobs, selectedJobId],
  );

  const report = useMemo(
    () => buildExchangeReport(agents, jobs, matches, settlements),
    [agents, jobs, matches, settlements],
  );

  function pushAudit(event: AuditEvent) {
    setAuditEvents((current) => [event, ...current]);
  }

  function handleSubmitAgent(input: AgentSubmissionInput) {
    const result = submitAgent(input);
    setOwners((current) => [result.owner, ...current]);
    setAgents((current) => [result.agent, ...current]);
    setSelectedAgentId(result.agent.id);
    pushAudit(result.audit);
  }

  function handleRunCertification(agentId: string, taskId: string) {
    const agent = agents.find((item) => item.id === agentId);
    const task = seedCertificationTasks.find((item) => item.id === taskId);
    if (!agent || !task) return;
    const result = runCertification(agent, task);
    setAgents((current) =>
      current.map((item) => (item.id === result.agent.id ? result.agent : item)),
    );
    setCertRuns((current) => [result.run, ...current]);
    pushAudit(result.audit);
  }

  function handleSubmitJob(input: JobSubmissionInput) {
    const result = submitJob(input);
    setJobs((current) => [result.job, ...current]);
    setSelectedJobId(result.job.id);
    pushAudit(result.audit);
    setView("exchange");
  }

  function handleGenerateMatches(jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return;
    const result = generateMatches(job, agents, owners);
    setMatches((current) => [
      ...result.matches,
      ...current.filter((match) => match.jobId !== jobId),
    ]);
    setJobs((current) =>
      current.map((item) => (item.id === jobId ? { ...item, status: "matched" } : item)),
    );
    pushAudit(result.audit);
    setView("exchange");
  }

  function handleAcceptMatch(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    const job = match ? jobs.find((item) => item.id === match.jobId) : undefined;
    if (!match || !job) return;
    const result = acceptMatch(job, match);
    setJobs((current) =>
      current.map((item) => (item.id === result.job.id ? result.job : item)),
    );
    pushAudit(result.audit);
  }

  function handleSubmitDelivery(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    const job = match ? jobs.find((item) => item.id === match.jobId) : undefined;
    const agent = match ? agents.find((item) => item.id === match.agentId) : undefined;
    if (!match || !job || !agent) return;
    const result = submitDelivery(job, match);
    const settlement = {
      ...result.settlement,
      ownerId: agent.ownerId,
    };
    setJobs((current) =>
      current.map((item) => (item.id === result.job.id ? result.job : item)),
    );
    setDeliveries((current) => [result.delivery, ...current]);
    setSettlements((current) => [settlement, ...current]);
    pushAudit(result.audit);
  }

  function handleAcceptDelivery(deliveryId: string) {
    const delivery = deliveries.find((item) => item.id === deliveryId);
    const job = delivery ? jobs.find((item) => item.id === delivery.jobId) : undefined;
    const settlement = delivery
      ? settlements.find((item) => item.jobId === delivery.jobId && item.agentId === delivery.agentId)
      : undefined;
    if (!delivery || !job || !settlement) return;
    const result = acceptDelivery(job, delivery, settlement);
    setJobs((current) =>
      current.map((item) => (item.id === result.job.id ? result.job : item)),
    );
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
    if (!settlement || !job) return;
    const result = settlePayment(job, settlement);
    setJobs((current) =>
      current.map((item) => (item.id === result.job.id ? result.job : item)),
    );
    setSettlements((current) =>
      current.map((item) => (item.id === result.settlement.id ? result.settlement : item)),
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
            <span>Certified Agent Workforce</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "active" : ""}
                onClick={() => setView(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-note">
          <BadgeCheck size={16} />
          L0-L5 certification / task matching / settlement
        </div>
      </aside>

      <main className="main">
        <header className="page-header">
          <div>
            <p className="eyebrow">最小产品化单元</p>
            <h1>Agent 劳动力交易平台 MVP</h1>
          </div>
          <button className="secondary-button" onClick={() => setView("exchange")}>
            打开交易台
          </button>
        </header>

        {view === "dashboard" && (
          <>
            <Dashboard report={report} />
            <div className="workspace-grid">
              <AgentSupplyPanel
                agents={agents}
                tasks={seedCertificationTasks}
                selectedAgentId={selectedAgentId}
                onSelectAgent={setSelectedAgentId}
                onSubmitAgent={handleSubmitAgent}
                onRunCertification={handleRunCertification}
              />
              <JobDemandPanel
                jobs={jobs}
                selectedJobId={selectedJobId}
                onSelectJob={setSelectedJobId}
                onSubmitJob={handleSubmitJob}
                onGenerateMatches={handleGenerateMatches}
              />
              <ExchangeDesk
                job={selectedJob}
                agents={agents}
                matches={matches}
                deliveries={deliveries}
                settlements={settlements}
                onAcceptMatch={handleAcceptMatch}
                onSubmitDelivery={handleSubmitDelivery}
                onAcceptDelivery={handleAcceptDelivery}
                onSettle={handleSettle}
              />
            </div>
          </>
        )}

        {view === "bounty" && (
          <BountyCertificationPanel
            jobs={jobs}
            certificationTasks={seedCertificationTasks}
            selectedAgentId={selectedAgentId}
            onOnboardAgent={handleSubmitAgent}
            onRunCertification={handleRunCertification}
            onGenerateMatches={handleGenerateMatches}
          />
        )}

        {view === "connector" && (
          <ConnectorPanel
            onOnboardAgent={(input) => {
              handleSubmitAgent(input);
              setView("agents");
            }}
          />
        )}

        {view === "agents" && (
          <AgentSupplyPanel
            agents={agents}
            tasks={seedCertificationTasks}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onSubmitAgent={handleSubmitAgent}
            onRunCertification={handleRunCertification}
          />
        )}

        {view === "jobs" && (
          <JobDemandPanel
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelectJob={setSelectedJobId}
            onSubmitJob={handleSubmitJob}
            onGenerateMatches={handleGenerateMatches}
          />
        )}

        {view === "exchange" && (
          <ExchangeDesk
            job={selectedJob}
            agents={agents}
            matches={matches}
            deliveries={deliveries}
            settlements={settlements}
            onAcceptMatch={handleAcceptMatch}
            onSubmitDelivery={handleSubmitDelivery}
            onAcceptDelivery={handleAcceptDelivery}
            onSettle={handleSettle}
          />
        )}

        {view === "audit" && <AuditLog events={auditEvents} />}

        <footer className="page-footer">
          认证运行 {certRuns.length} 次 · 当前任务 {selectedJob?.title || "未选择"} · 当前 Agent{" "}
          {agents.find((agent) => agent.id === selectedAgentId)?.name || "未选择"}
        </footer>
      </main>
    </div>
  );
}

export default App;
