import { Bot, PlayCircle, Plus } from "lucide-react";
import { useState } from "react";
import type {
  AgentFramework,
  AgentPassport,
  AgentSubmissionInput,
  CertificationTask,
  PricingModel,
} from "../domain/types";
import { levelLabel } from "../services/exchangeService";

interface AgentSupplyPanelProps {
  agents: AgentPassport[];
  tasks: CertificationTask[];
  selectedAgentId: string;
  onSelectAgent: (agentId: string) => void;
  onSubmitAgent: (input: AgentSubmissionInput) => void;
  onRunCertification: (agentId: string, taskId: string) => void;
}

const frameworks: AgentFramework[] = [
  "Codex",
  "Claude Code",
  "Hermes",
  "OpenClaw",
  "LangGraph",
  "CrewAI",
  "Custom Agent",
];

const pricingModels: PricingModel[] = ["per_task", "retainer", "outcome", "hourly"];

export function AgentSupplyPanel({
  agents,
  tasks,
  selectedAgentId,
  onSelectAgent,
  onSubmitAgent,
  onRunCertification,
}: AgentSupplyPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AgentSubmissionInput>({
    name: "",
    ownerName: "",
    frameworks: ["Codex"],
    skills: ["Bug 修复"],
    toolchain: ["GitHub"],
    collaborationMode: "Owner 定义目标，Agent 生成结果，Owner 做质量复核。",
    riskBoundary: "不访问生产密钥；写入必须经过企业人审。",
    pricingModel: "per_task",
    basePrice: 3000,
  });
  const [skillText, setSkillText] = useState("Bug 修复、测试生成");
  const [toolText, setToolText] = useState("GitHub、Playwright、Docker Sandbox");

  function submit() {
    if (!form.name.trim() || !form.ownerName.trim()) return;
    onSubmitAgent({
      ...form,
      skills: splitText(skillText),
      toolchain: splitText(toolText),
    });
    setShowForm(false);
  }

  function toggleFramework(framework: AgentFramework) {
    setForm((current) => ({
      ...current,
      frameworks: current.frameworks.includes(framework)
        ? current.frameworks.filter((item) => item !== framework)
        : [...current.frameworks, framework],
    }));
  }

  return (
    <section className="panel supply-panel">
      <div className="section-title">
        <Bot size={18} />
        <h2>Agent 供给与认证</h2>
        <button className="secondary-button compact-button" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} />
          接入Agent
        </button>
      </div>

      {showForm && (
        <div className="inline-form">
          <label>
            Agent 名称
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="例如：Codex Migration Agent"
            />
          </label>
          <label>
            Owner / Operator
            <input
              value={form.ownerName}
              onChange={(event) => setForm({ ...form, ownerName: event.target.value })}
              placeholder="个人或工作室名称"
            />
          </label>
          <label>
            技能
            <input value={skillText} onChange={(event) => setSkillText(event.target.value)} />
          </label>
          <label>
            工具链
            <input value={toolText} onChange={(event) => setToolText(event.target.value)} />
          </label>
          <label>
            定价模式
            <select
              value={form.pricingModel}
              onChange={(event) =>
                setForm({ ...form, pricingModel: event.target.value as PricingModel })
              }
            >
              {pricingModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </label>
          <label>
            基础报价
            <input
              type="number"
              value={form.basePrice}
              onChange={(event) => setForm({ ...form, basePrice: Number(event.target.value) })}
            />
          </label>
          <fieldset className="wide-field">
            <legend>Agent 框架</legend>
            <div className="chip-grid">
              {frameworks.map((framework) => (
                <label key={framework} className="check-chip">
                  <input
                    type="checkbox"
                    checked={form.frameworks.includes(framework)}
                    onChange={() => toggleFramework(framework)}
                  />
                  <span>{framework}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="wide-field">
            协作方式
            <textarea
              rows={2}
              value={form.collaborationMode}
              onChange={(event) =>
                setForm({ ...form, collaborationMode: event.target.value })
              }
            />
          </label>
          <label className="wide-field">
            风险边界
            <textarea
              rows={2}
              value={form.riskBoundary}
              onChange={(event) => setForm({ ...form, riskBoundary: event.target.value })}
            />
          </label>
          <button className="primary-button wide-field" onClick={submit}>
            提交 Agent Passport
          </button>
        </div>
      )}

      <div className="agent-list">
        {agents.map((agent) => (
          <button
            key={agent.id}
            className={`agent-card ${selectedAgentId === agent.id ? "active" : ""}`}
            onClick={() => onSelectAgent(agent.id)}
          >
            <span className={`level-badge level-${agent.certificationLevel}`}>
              {levelLabel(agent.certificationLevel)}
            </span>
            <strong>{agent.name}</strong>
            <small>{agent.frameworks.join(" / ")}</small>
            <p>{agent.skills.join(" · ")}</p>
            <em>基准分 {agent.benchmarkScore || "-"} · 成功率 {Math.round(agent.successRate * 100)}%</em>
          </button>
        ))}
      </div>

      <div className="certification-box">
        <h3>认证试工任务</h3>
        <div className="cert-grid">
          {tasks.map((task) => (
            <article key={task.id}>
              <strong>{task.title}</strong>
              <span>{task.category} · 通过线 {task.passingScore}</span>
              <button
                className="text-button"
                onClick={() => onRunCertification(selectedAgentId, task.id)}
              >
                <PlayCircle size={15} />
                运行试工
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function splitText(text: string) {
  return text
    .split(/[，,、\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
