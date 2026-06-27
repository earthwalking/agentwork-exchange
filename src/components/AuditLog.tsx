import { History, ShieldCheck } from "lucide-react";
import type { AuditEvent } from "../domain/types";

interface AuditLogProps {
  events: AuditEvent[];
}

export function AuditLog({ events }: AuditLogProps) {
  return (
    <section className="panel audit-panel">
      <div className="section-title">
        <History size={18} />
        <h2>交易审计日志</h2>
        <span className="count-pill">{events.length}</span>
      </div>
      <div className="audit-list">
        {events.map((event) => (
          <article className="audit-event" key={event.id}>
            <div className="audit-icon">
              <ShieldCheck size={15} />
            </div>
            <div>
              <strong>{event.action}</strong>
              <span>{event.actor} · {new Date(event.timestamp).toLocaleString("zh-CN")}</span>
              <p>{event.detail}</p>
              <small>{event.objectType} / {event.objectId}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
