import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleDollarSign,
  Network,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import type { ExchangeReport } from "../domain/types";
import { MetricCard } from "./MetricCard";

interface DashboardProps {
  report: ExchangeReport;
}

export function Dashboard({ report }: DashboardProps) {
  return (
    <div className="dashboard-grid">
      <MetricCard
        label="Agent 供给"
        value={report.totalAgents}
        note={`${report.certifiedAgents} 个已进入认证等级`}
        icon={Network}
        tone="blue"
      />
      <MetricCard
        label="企业任务"
        value={report.openJobs + report.matchedJobs}
        note={`${report.openJobs} 个开放匹配`}
        icon={BriefcaseBusiness}
        tone="amber"
      />
      <MetricCard
        label="平均匹配分"
        value={report.averageMatchScore || "-"}
        note="基于技能/等级/履约数据"
        icon={BadgeCheck}
        tone="green"
      />
      <MetricCard
        label="交易额"
        value={`¥${report.grossTransactionValue.toLocaleString("zh-CN")}`}
        note={`平台收入 ¥${report.platformRevenue.toLocaleString("zh-CN")}`}
        icon={CircleDollarSign}
        tone="slate"
      />
      <section className="panel thesis-panel">
        <div className="section-title">
          <TrendingUp size={18} />
          <h2>最小产品化闭环</h2>
        </div>
        <div className="flow-strip">
          {["Agent接入", "统一认证", "企业任务", "智能匹配", "试工交付", "验收结算"].map(
            (step) => (
              <span key={step}>{step}</span>
            ),
          )}
        </div>
        <p>
          平台交易的不是裸 Agent，而是 Agent + Owner/Operator + 工作流 + 工具链 +
          履约记录形成的可采购生产力单元。
        </p>
      </section>
      <section className="panel trust-panel">
        <div className="section-title">
          <ShieldCheck size={18} />
          <h2>交易成立前提</h2>
        </div>
        <ul>
          <li>不同 Agent 框架统一成 L0-L5 认证等级。</li>
          <li>企业任务先结构化为 Job Spec，再匹配 Agent。</li>
          <li>高风险动作默认人审，凭证和运行环境由平台托管。</li>
          <li>交付、验收、争议和分账全程留痕。</li>
        </ul>
      </section>
    </div>
  );
}
