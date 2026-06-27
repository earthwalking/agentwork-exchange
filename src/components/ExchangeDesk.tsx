import {
  BadgeDollarSign,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  PackageCheck,
} from "lucide-react";
import type {
  AgentPassport,
  DeliveryRecord,
  EnterpriseJob,
  MatchCandidate,
  SettlementRecord,
} from "../domain/types";
import { formatMoney } from "../services/money";

interface ExchangeDeskProps {
  job?: EnterpriseJob;
  agents: AgentPassport[];
  matches: MatchCandidate[];
  deliveries: DeliveryRecord[];
  settlements: SettlementRecord[];
  onAcceptMatch: (matchId: string) => void;
  onSubmitDelivery: (matchId: string) => void;
  onAcceptDelivery: (deliveryId: string) => void;
  onSettle: (settlementId: string) => void;
}

export function ExchangeDesk({
  job,
  agents,
  matches,
  deliveries,
  settlements,
  onAcceptMatch,
  onSubmitDelivery,
  onAcceptDelivery,
  onSettle,
}: ExchangeDeskProps) {
  const jobMatches = job ? matches.filter((match) => match.jobId === job.id) : [];
  const jobDeliveries = job ? deliveries.filter((delivery) => delivery.jobId === job.id) : [];
  const jobSettlements = job ? settlements.filter((settlement) => settlement.jobId === job.id) : [];

  return (
    <section className="panel exchange-desk">
      <div className="section-title">
        <Handshake size={18} />
        <h2>匹配交易台</h2>
      </div>

      {!job ? (
        <div className="empty-state">请选择一个企业任务。</div>
      ) : (
        <>
          <div className="selected-job">
            <strong>{job.title}</strong>
            <span>{job.company} · {formatMoney(job.budget, job.currency)} · {job.dueInHours}h</span>
            <p>{job.acceptanceCriteria.join("；")}</p>
          </div>

          <div className="subsection-title">
            <ClipboardCheck size={16} />
            <h3>候选 Agent</h3>
          </div>
          <div className="match-list">
            {jobMatches.length === 0 && <div className="empty-state compact">尚未生成候选匹配。</div>}
            {jobMatches.map((match) => {
              const agent = agents.find((item) => item.id === match.agentId);
              return (
                <article className="match-card" key={match.id}>
                  <div>
                    <strong>{agent?.name || "Unknown Agent"}</strong>
                    <span>匹配分 {match.score} · 报价 {formatMoney(match.quotedPrice, match.currency || job.currency)}</span>
                    <p>{match.reasons.join("；")}</p>
                    <small>{match.constraints.join("；")}</small>
                  </div>
                  <button className="primary-button" onClick={() => onAcceptMatch(match.id)}>
                    <CheckCircle2 size={15} />
                    接受试工
                  </button>
                  <button className="secondary-button" onClick={() => onSubmitDelivery(match.id)}>
                    <PackageCheck size={15} />
                    提交交付
                  </button>
                </article>
              );
            })}
          </div>

          <div className="subsection-title">
            <PackageCheck size={16} />
            <h3>交付验收</h3>
          </div>
          <div className="delivery-list">
            {jobDeliveries.length === 0 && <div className="empty-state compact">暂无交付记录。</div>}
            {jobDeliveries.map((delivery) => (
              <article className="delivery-card" key={delivery.id}>
                <strong>{delivery.summary}</strong>
                <span>质量分 {delivery.qualityScore} · {delivery.status}</span>
                <p>{delivery.artifacts.join("、")}</p>
                <button className="primary-button" onClick={() => onAcceptDelivery(delivery.id)}>
                  <BadgeDollarSign size={15} />
                  验收通过
                </button>
              </article>
            ))}
          </div>

          <div className="subsection-title">
            <BadgeDollarSign size={16} />
            <h3>结算分账</h3>
          </div>
          <div className="settlement-list">
            {jobSettlements.length === 0 && <div className="empty-state compact">暂无结算记录。</div>}
            {jobSettlements.map((settlement) => (
              <article className="settlement-card" key={settlement.id}>
                <strong>企业支付 {formatMoney(settlement.enterprisePaid, settlement.currency || job.currency)}</strong>
                <span>
                  平台 {formatMoney(settlement.platformFee, settlement.currency || job.currency)} / Owner{" "}
                  {formatMoney(settlement.ownerPayout, settlement.currency || job.currency)}
                </span>
                <em>{settlement.status}</em>
                <button
                  className="primary-button"
                  disabled={settlement.status === "settled"}
                  onClick={() => onSettle(settlement.id)}
                >
                  完成分账
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
