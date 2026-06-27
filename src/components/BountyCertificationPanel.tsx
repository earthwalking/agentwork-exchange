import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCode2,
  PlayCircle,
  ShieldCheck,
  Terminal,
  Target,
} from "lucide-react";
import { useMemo, useState } from "react";
import { sampleAgentworkConnectManifest } from "../data/sampleAgentworkConnectManifest";
import type { AgentWorkConnectManifest } from "../domain/agentworkStandard";
import type {
  AgentSubmissionInput,
  CertificationTask,
  EnterpriseJob,
} from "../domain/types";
import {
  parseAgentworkConnectManifest,
  toAgentSubmissionFromAgentwork,
} from "../services/agentworkConnectService";
import { formatMoney } from "../services/money";

interface BountyCertificationPanelProps {
  jobs: EnterpriseJob[];
  certificationTasks: CertificationTask[];
  selectedAgentId: string;
  onOnboardAgent: (input: AgentSubmissionInput) => void;
  onRunCertification: (agentId: string, taskId: string) => void;
  onGenerateMatches: (jobId: string) => void;
}

const yamlSample = `schemaVersion: agentwork.agent.v1
agent:
  name: Codex PR Repair Agent
  version: 0.1.0
  frameworks:
    - Codex
    - Claude Code
  skills:
    - Bug 修复
    - 测试生成
  toolchain:
    - GitHub
    - Playwright
  collaborationMode: Owner defines target; Agent creates patch; Owner reviews output.
  riskBoundary: No production secrets; write actions require enterprise human review.
owner:
  name: Local Agent Owner
  type: individual
pricing:
  model: per_task
  basePrice: 3000`;

const cliCommands = [
  {
    label: "init",
    command: "node ./cli/agentwork.mjs init",
    detail: "生成 agentwork.yaml",
  },
  {
    label: "connect",
    command: "node ./cli/agentwork.mjs connect --file agentwork.yaml",
    detail: "生成本地 connect manifest",
  },
  {
    label: "certify",
    command: "node ./cli/agentwork.mjs certify --task cert-code-001",
    detail: "运行 Mock 认证",
  },
  {
    label: "accept",
    command: "node ./cli/agentwork.mjs accept bounty-code-001",
    detail: "领取企业 Bounty",
  },
];

export function BountyCertificationPanel({
  jobs,
  certificationTasks,
  selectedAgentId,
  onOnboardAgent,
  onRunCertification,
  onGenerateMatches,
}: BountyCertificationPanelProps) {
  const [manifestText, setManifestText] = useState(
    JSON.stringify(sampleAgentworkConnectManifest, null, 2),
  );
  const [manifest, setManifest] = useState<AgentWorkConnectManifest | undefined>(
    sampleAgentworkConnectManifest,
  );
  const [selectedTaskId, setSelectedTaskId] = useState(certificationTasks[0]?.id || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const privacyChecks = useMemo(() => {
    if (!manifest) return [];
    return [
      {
        label: "本地清单",
        ok: manifest.connector.localOnly,
        detail: manifest.connector.name,
      },
      {
        label: "主动授权",
        ok: manifest.connector.consentCaptured,
        detail: manifest.connector.generatedAt,
      },
      {
        label: "未上传数据",
        ok: !manifest.connector.didUploadData,
        detail: manifest.connector.sourceFile || "agentwork.yaml",
      },
    ];
  }, [manifest]);

  const recommendedTaskIds = useMemo(
    () => new Set(manifest?.certificationReadiness.recommendedTasks || []),
    [manifest],
  );

  const bountyJobs = useMemo(
    () =>
      jobs
        .filter((job) => ["open", "matched"].includes(job.status))
        .sort((a, b) => b.budget - a.budget),
    [jobs],
  );

  const selectedTask = certificationTasks.find((task) => task.id === selectedTaskId);

  function parseManifest() {
    try {
      const parsed = parseAgentworkConnectManifest(manifestText);
      setManifest(parsed);
      setError("");
      setNotice("Connect Manifest 已通过平台侧校验。");
    } catch (err) {
      setManifest(undefined);
      setNotice("");
      setError(err instanceof Error ? err.message : "Connect Manifest 解析失败。");
    }
  }

  function onboardPassport() {
    if (!manifest) return;
    onOnboardAgent(toAgentSubmissionFromAgentwork(manifest));
    setNotice("Agent Passport 已生成，当前 Agent 可进入认证与匹配。");
  }

  function runCertification(taskId: string) {
    if (!selectedAgentId) return;
    onRunCertification(selectedAgentId, taskId);
    setSelectedTaskId(taskId);
    setNotice("认证任务已运行，结果已写入审计日志。");
  }

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setNotice("命令已复制。");
  }

  return (
    <section className="panel bounty-panel">
      <div className="section-title">
        <Target size={18} />
        <h2>AgentWork Bounty 认证台</h2>
        <span className="count-pill">MVP v2</span>
      </div>

      <div className="bounty-layout">
        <div className="standard-column">
          <div className="standard-block">
            <div className="subsection-title">
              <FileCode2 size={17} />
              <h3>agentwork.yaml</h3>
            </div>
            <pre className="code-block">{yamlSample}</pre>
          </div>

          <div className="standard-block">
            <div className="subsection-title">
              <Terminal size={17} />
              <h3>agentwork CLI</h3>
            </div>
            <div className="command-grid">
              {cliCommands.map((item) => (
                <article className="command-card" key={item.label}>
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.detail}</span>
                    <code>{item.command}</code>
                  </div>
                  <button
                    className="secondary-button compact-button"
                    onClick={() => copyCommand(item.command)}
                    aria-label={`copy ${item.label}`}
                  >
                    <ClipboardCheck size={15} />
                  </button>
                </article>
              ))}
            </div>
          </div>

          <div className="standard-block">
            <div className="subsection-title">
              <ShieldCheck size={17} />
              <h3>connect manifest</h3>
            </div>
            <textarea
              value={manifestText}
              onChange={(event) => setManifestText(event.target.value)}
              rows={14}
            />
            <button className="primary-button full-button" onClick={parseManifest}>
              解析并校验
            </button>
          </div>
        </div>

        <div className="market-column">
          {error && (
            <div className="connector-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
          {notice && (
            <div className="success-note">
              <CheckCircle2 size={16} />
              {notice}
            </div>
          )}

          <div className="readiness-grid">
            <article className="readiness-card">
              <span>接入就绪分</span>
              <strong>{manifest?.certificationReadiness.score || 0}</strong>
              <em>{manifest?.certificationReadiness.suggestedLevel || "L0"} suggested</em>
            </article>
            <article className="readiness-card">
              <span>推荐试工</span>
              <strong>{manifest?.certificationReadiness.recommendedTasks.length || 0}</strong>
              <em>{manifest?.bountyPreferences.turnaroundHours || 24}h turnaround</em>
            </article>
          </div>

          <div className="standard-block">
            <div className="subsection-title">
              <BadgeCheck size={17} />
              <h3>平台校验</h3>
            </div>
            <div className="check-list">
              {[...privacyChecks, ...(manifest?.certificationReadiness.checks || [])].map(
                (check) => (
                  <div className={`readiness-check ${check.ok ? "ok" : "bad"}`} key={check.label}>
                    <ShieldCheck size={15} />
                    <span>{check.label}</span>
                    <strong>{check.ok ? "通过" : "补齐"}</strong>
                    <small>{check.detail}</small>
                  </div>
                ),
              )}
            </div>
            <button
              className="primary-button full-button"
              onClick={onboardPassport}
              disabled={!manifest}
            >
              生成 Passport 并进入认证
            </button>
          </div>

          <div className="standard-block">
            <div className="subsection-title">
              <PlayCircle size={17} />
              <h3>认证任务</h3>
            </div>
            <div className="certification-lane">
              {certificationTasks.map((task) => (
                <article className="lane-item" key={task.id}>
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {task.category} / {task.riskLevel} / passing {task.passingScore}
                    </span>
                    {recommendedTaskIds.has(task.id) && <em>manifest recommended</em>}
                  </div>
                  <button
                    className="secondary-button compact-button"
                    onClick={() => runCertification(task.id)}
                  >
                    运行
                  </button>
                </article>
              ))}
            </div>
            {selectedTask && (
              <p className="lane-footnote">
                当前试工：{selectedTask.expectedOutput}
              </p>
            )}
          </div>

          <div className="standard-block">
            <div className="subsection-title">
              <Target size={17} />
              <h3>企业 Bounty</h3>
            </div>
            <div className="bounty-list">
              {bountyJobs.map((job) => (
                <article className="lane-item bounty-item" key={job.id}>
                  <div>
                    <strong>{job.title}</strong>
                    <span>
                      {job.company} / {formatMoney(job.budget, job.currency)} / {job.minCertificationLevel}+
                    </span>
                    <p>{job.requiredSkills.join(" / ")}</p>
                  </div>
                  <button
                    className="primary-button compact-button"
                    onClick={() => onGenerateMatches(job.id)}
                  >
                    匹配
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
