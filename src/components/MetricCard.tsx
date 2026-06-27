import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  note: string;
  icon: LucideIcon;
  tone?: "blue" | "green" | "amber" | "red" | "slate";
}

export function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "slate",
}: MetricCardProps) {
  return (
    <section className={`metric-card tone-${tone}`}>
      <div className="metric-icon" aria-hidden="true">
        <Icon size={18} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </section>
  );
}
