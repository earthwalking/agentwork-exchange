import { BriefcaseBusiness, Plus, Wand2 } from "lucide-react";
import { useState } from "react";
import type {
  CertificationLevel,
  Currency,
  EnterpriseJob,
  JobSubmissionInput,
  RiskLevel,
} from "../domain/types";
import { formatMoney } from "../services/money";

interface JobDemandPanelProps {
  jobs: EnterpriseJob[];
  selectedJobId: string;
  onSelectJob: (jobId: string) => void;
  onSubmitJob: (input: JobSubmissionInput) => void;
  onGenerateMatches: (jobId: string) => void;
}

const levels: CertificationLevel[] = ["L0", "L1", "L2", "L3", "L4", "L5"];
const risks: RiskLevel[] = ["low", "medium", "high"];
const currencies: Currency[] = ["CNY", "USD"];

export function JobDemandPanel({
  jobs,
  selectedJobId,
  onSelectJob,
  onSubmitJob,
  onGenerateMatches,
}: JobDemandPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [skills, setSkills] = useState("Bug 修复、测试生成");
  const [materials, setMaterials] = useState("GitHub issue、复现视频");
  const [deliverables, setDeliverables] = useState("Pull Request、测试结果、变更说明");
  const [criteria, setCriteria] = useState("测试通过、无新增控制台错误、可复现修复");
  const [form, setForm] = useState<JobSubmissionInput>({
    company: "",
    title: "",
    category: "软件开发",
    goal: "",
    requiredSkills: [],
    inputMaterials: [],
    expectedDeliverables: [],
    acceptanceCriteria: [],
    riskLevel: "medium",
    minCertificationLevel: "L3",
    budget: 8000,
    currency: "CNY",
    dueInHours: 72,
    requiresHumanReview: true,
  });

  function submit() {
    if (!form.company.trim() || !form.title.trim()) return;
    onSubmitJob({
      ...form,
      requiredSkills: splitText(skills),
      inputMaterials: splitText(materials),
      expectedDeliverables: splitText(deliverables),
      acceptanceCriteria: splitText(criteria),
    });
    setShowForm(false);
  }

  return (
    <section className="panel demand-panel">
      <div className="section-title">
        <BriefcaseBusiness size={18} />
        <h2>企业任务与 Job Spec</h2>
        <button className="secondary-button compact-button" onClick={() => setShowForm(!showForm)}>
          <Plus size={15} />
          发布任务
        </button>
      </div>

      {showForm && (
        <div className="inline-form">
          <label>
            企业
            <input
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              placeholder="例如：Northstar SaaS"
            />
          </label>
          <label>
            任务标题
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="例如：修复 React 表单回归"
            />
          </label>
          <label>
            类目
            <input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
          </label>
          <label>
            最低认证
            <select
              value={form.minCertificationLevel}
              onChange={(event) =>
                setForm({
                  ...form,
                  minCertificationLevel: event.target.value as CertificationLevel,
                })
              }
            >
              {levels.map((level) => (
                <option key={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            预算
            <input
              type="number"
              value={form.budget}
              onChange={(event) => setForm({ ...form, budget: Number(event.target.value) })}
            />
          </label>
          <label>
            币种
            <select
              value={form.currency || "CNY"}
              onChange={(event) =>
                setForm({ ...form, currency: event.target.value as Currency })
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
          <label>
            截止小时
            <input
              type="number"
              value={form.dueInHours}
              onChange={(event) => setForm({ ...form, dueInHours: Number(event.target.value) })}
            />
          </label>
          <label>
            风险等级
            <select
              value={form.riskLevel}
              onChange={(event) => setForm({ ...form, riskLevel: event.target.value as RiskLevel })}
            >
              {risks.map((risk) => (
                <option key={risk}>{risk}</option>
              ))}
            </select>
          </label>
          <label>
            技能
            <input value={skills} onChange={(event) => setSkills(event.target.value)} />
          </label>
          <label className="wide-field">
            任务目标
            <textarea
              rows={2}
              value={form.goal}
              onChange={(event) => setForm({ ...form, goal: event.target.value })}
              placeholder="定义业务结果，不要只描述工具"
            />
          </label>
          <label className="wide-field">
            输入材料
            <input value={materials} onChange={(event) => setMaterials(event.target.value)} />
          </label>
          <label className="wide-field">
            交付物
            <input value={deliverables} onChange={(event) => setDeliverables(event.target.value)} />
          </label>
          <label className="wide-field">
            验收标准
            <input value={criteria} onChange={(event) => setCriteria(event.target.value)} />
          </label>
          <label className="check-row wide-field">
            <input
              type="checkbox"
              checked={form.requiresHumanReview}
              onChange={(event) =>
                setForm({ ...form, requiresHumanReview: event.target.checked })
              }
            />
            <span>关键动作必须企业人审</span>
          </label>
          <button className="primary-button wide-field" onClick={submit}>
            发布 Job Spec
          </button>
        </div>
      )}

      <div className="job-list">
        {jobs.map((job) => (
          <button
            key={job.id}
            className={`job-card ${selectedJobId === job.id ? "active" : ""}`}
            onClick={() => onSelectJob(job.id)}
          >
            <span className={`status-pill status-${job.status}`}>{statusLabel(job.status)}</span>
            <strong>{job.title}</strong>
            <small>
              {job.company} · {job.category}
            </small>
            <p>{job.goal}</p>
            <em>
              预算 {formatMoney(job.budget, job.currency)} · 最低 {job.minCertificationLevel}
            </em>
          </button>
        ))}
      </div>

      <button className="primary-button full-button" onClick={() => onGenerateMatches(selectedJobId)}>
        <Wand2 size={16} />
        为当前任务生成候选匹配
      </button>
    </section>
  );
}

function splitText(text: string) {
  return text
    .split(/[，、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusLabel(status: EnterpriseJob["status"]) {
  const labels: Record<EnterpriseJob["status"], string> = {
    draft: "草稿",
    open: "开放匹配",
    matched: "已匹配",
    in_trial: "试工中",
    delivered: "已交付",
    accepted: "已验收",
    settled: "已结算",
  };
  return labels[status];
}
