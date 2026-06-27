import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Download,
  PlugZap,
  ShieldCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { sampleConnectorManifest } from "../data/sampleConnectorManifest";
import type { LocalAgentManifest } from "../domain/connectorTypes";
import type { AgentSubmissionInput } from "../domain/types";
import {
  parseConnectorManifest,
  toAgentSubmission,
} from "../services/connectorImportService";

interface ConnectorPanelProps {
  onOnboardAgent: (input: AgentSubmissionInput) => void;
}

const command = `node .\\plugins\\local-agent-connector\\agentwork-agent-connector.mjs --consent --owner-name "Your Name" --platform-url http://127.0.0.1:5174 --output .\\agentwork-agent-manifest.json`;

export function ConnectorPanel({ onOnboardAgent }: ConnectorPanelProps) {
  const [manifestText, setManifestText] = useState(
    JSON.stringify(sampleConnectorManifest, null, 2),
  );
  const [manifest, setManifest] = useState<LocalAgentManifest | undefined>(
    sampleConnectorManifest,
  );
  const [error, setError] = useState("");
  const importedCount = manifest?.detectedAgents.length || 0;

  const privacyChecks = useMemo(() => {
    if (!manifest) return [];
    return [
      {
        label: "用户授权",
        ok: manifest.scanPolicy.consentCaptured,
      },
      {
        label: "未读取配置内容",
        ok: !manifest.scanPolicy.didReadConfigFileContents,
      },
      {
        label: "未扫描整盘",
        ok: !manifest.scanPolicy.didScanWholeDisk,
      },
      {
        label: "未自动上传",
        ok: !manifest.scanPolicy.didUploadData,
      },
    ];
  }, [manifest]);

  function parseManifest() {
    try {
      const parsed = parseConnectorManifest(manifestText);
      setManifest(parsed);
      setError("");
    } catch (err) {
      setManifest(undefined);
      setError(err instanceof Error ? err.message : "清单解析失败。");
    }
  }

  function onboardAgent(agentId: string) {
    if (!manifest) return;
    const input = toAgentSubmission(manifest, agentId);
    onOnboardAgent(input);
  }

  async function copyCommand() {
    await navigator.clipboard.writeText(command);
  }

  return (
    <section className="panel connector-panel">
      <div className="section-title">
        <PlugZap size={18} />
        <h2>个人 Agent 接入插件</h2>
        <span className="count-pill">{importedCount} detected</span>
      </div>

      <div className="connector-layout">
        <div className="connector-guide">
          <h3>1. 在个人电脑本地运行连接器</h3>
          <p>
            连接器只生成本地 JSON 清单，不上传数据。用户可以先审查清单，再决定是否导入平台。
          </p>
          <pre>{command}</pre>
          <div className="connector-actions">
            <button className="secondary-button" onClick={copyCommand}>
              <Clipboard size={15} />
              复制命令
            </button>
            <a
              className="secondary-link"
              href="/plugins/local-agent-connector/agentwork-agent-connector.mjs"
              download
            >
              <Download size={15} />
              下载脚本
            </a>
          </div>

          <h3>2. 粘贴或导入扫描清单</h3>
          <textarea
            value={manifestText}
            onChange={(event) => setManifestText(event.target.value)}
            rows={16}
          />
          <button className="primary-button full-button" onClick={parseManifest}>
            解析本地清单
          </button>
          {error && (
            <div className="connector-error">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className="connector-results">
          <h3>隐私边界检查</h3>
          <div className="privacy-grid">
            {privacyChecks.map((check) => (
              <div className={`privacy-check ${check.ok ? "ok" : "bad"}`} key={check.label}>
                <ShieldCheck size={15} />
                <span>{check.label}</span>
                <strong>{check.ok ? "通过" : "阻断"}</strong>
              </div>
            ))}
          </div>

          <h3>检测到的个人 Agent</h3>
          <div className="detected-agent-list">
            {!manifest && <div className="empty-state compact">等待有效清单。</div>}
            {manifest?.detectedAgents.map((agent) => (
              <article className="detected-agent-card" key={agent.id}>
                <div>
                  <strong>{agent.displayName}</strong>
                  <span>
                    {agent.framework} · {agent.detection.confidence} ·{" "}
                    {agent.detection.methods.join(" / ")}
                  </span>
                  <p>{agent.onboardingHint}</p>
                  <small>
                    {agent.detection.executablePath || agent.detection.configDirs?.[0]?.path ||
                      "本地配置候选"}
                  </small>
                </div>
                <button className="primary-button" onClick={() => onboardAgent(agent.id)}>
                  <CheckCircle2 size={15} />
                  生成 Passport
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
