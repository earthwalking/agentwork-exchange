#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CLI_VERSION = "0.4.0";
const DEFAULT_AGENTWORK_FILE = "agentwork.yaml";

const templateYaml = `schemaVersion: agentwork.agent.v1
agent:
  name: Codex PR Repair Agent
  version: 0.1.0
  frameworks:
    - Codex
  skills:
    - C# implementation
    - GitHub PR workflow
    - test planning
  toolchain:
    - GitHub
    - AgentWork Exchange
  collaborationMode: Owner defines task target; Agent prepares patch; Owner reviews output.
  riskBoundary: No secrets; no public write actions without owner and platform review.
owner:
  name: Local Agent Owner
  type: individual
pricing:
  model: per_task
  basePrice: 30
availability:
  turnaroundHours: 24
bountyPreferences:
  categories:
    - software bounty
  minBudget: 50
`;

const bountyTasks = [
  {
    id: "bounty-memanto-bug-challenge-100usd",
    title: "Memanto Bug & Exploit Challenge",
    company: "moorcheh-ai/memanto",
    category: "agent memory bounty",
    minLevel: "L2",
    budget: 100,
    currency: "USD",
    dueInHours: 72,
    requiredSkills: [
      "GitHub bounty triage",
      "duplicate PR analysis",
      "agent memory evaluation",
      "bug reproduction",
      "Python test authoring",
      "GitHub PR workflow",
      "human approval",
    ],
    sourceUrl: "https://github.com/moorcheh-ai/memanto/issues/770",
    status: "review_gated_competitive",
    riskNotes: [
      "The bounty is high competition and has many existing comments and PRs.",
      "Find a low-overlap flaw before any public claim or PR.",
      "Use private vulnerability reporting or maintainer email for sensitive security findings.",
      "Owner approval is required before GitHub comments, forks, PRs, or social amplification.",
    ],
  },
  {
    id: "bounty-dxrp-party-system-50usd",
    title: "dxura/dxrp Party System backup dispatch",
    company: "dxura/dxrp",
    category: "software bounty",
    minLevel: "L2",
    budget: 50,
    currency: "USD",
    dueInHours: 72,
    requiredSkills: [
      "GitHub bounty triage",
      "maintainer communication",
      "C# implementation",
      "human approval",
    ],
    sourceUrl: "https://github.com/dxura/dxrp/issues/73",
    status: "approval_gated_backup",
    riskNotes: [
      "The issue requires maintainer approval before implementation.",
      "The issue is currently assigned, so this is a backup slot only.",
      "No public comment, competing PR, or code submission before approval.",
    ],
  },
  {
    id: "bounty-code-001",
    title: "React regression fix with e2e test",
    company: "Northstar SaaS",
    category: "software bounty",
    minLevel: "L3",
    budget: 6800,
    currency: "CNY",
    dueInHours: 48,
    requiredSkills: ["bug fix", "test generation", "Playwright"],
  },
  {
    id: "bounty-research-001",
    title: "Overseas competitor and lead research",
    company: "Mingdao Robotics",
    category: "business research",
    minLevel: "L2",
    budget: 9500,
    currency: "CNY",
    dueInHours: 72,
    requiredSkills: ["competitor research", "sales lead research", "report drafting"],
  },
  {
    id: "bounty-data-001",
    title: "CRM CSV cleanup and quality report",
    company: "Foresight Analytics",
    category: "data operations",
    minLevel: "L3",
    budget: 7200,
    currency: "CNY",
    dueInHours: 60,
    requiredSkills: ["data cleanup", "script automation", "report generation"],
  },
];

const bountySources = [
  {
    id: "source-github-search",
    name: "GitHub issue search",
    kind: "GitHub",
    url: "https://github.com/search?q=bounty+label%3Aopen&type=issues",
    scanCadence: "Manual MVP scan, then hourly connector",
    lastScanAt: "2026-06-29T10:10:00+08:00",
    status: "connected",
  },
  {
    id: "source-bountyhub",
    name: "BountyHub public tasks",
    kind: "BountyHub",
    url: "https://bountyhub.dev",
    scanCadence: "Manual URL verification in MVP",
    lastScanAt: "2026-06-29T10:12:00+08:00",
    status: "manual",
  },
  {
    id: "source-bountysource",
    name: "Bountysource issue feed",
    kind: "Bountysource",
    url: "https://www.bountysource.com/issues",
    scanCadence: "Daily crawler candidate",
    lastScanAt: "2026-06-29T10:15:00+08:00",
    status: "manual",
  },
];

const bountyOpportunities = [
  {
    id: "opp-memanto-770",
    sourceId: "source-bountyhub",
    repository: "moorcheh-ai/memanto",
    title: "Memanto Bug & Exploit Challenge",
    sourceUrl: "https://github.com/moorcheh-ai/memanto/issues/770",
    provider: "BountyHub",
    reward: 100,
    currency: "USD",
    status: "published",
    verificationScore: 86,
    payoutConfidence: "high",
    duplicateRisk: "high",
    difficulty: "high",
    routeTaskId: "bounty-memanto-bug-challenge-100usd",
  },
  {
    id: "opp-dxrp-73",
    sourceId: "source-github-search",
    repository: "dxura/dxrp",
    title: "Party System implementation",
    sourceUrl: "https://github.com/dxura/dxrp/issues/73",
    provider: "GitHub issue bounty",
    reward: 50,
    currency: "USD",
    status: "published",
    verificationScore: 78,
    payoutConfidence: "medium",
    duplicateRisk: "high",
    difficulty: "medium",
    routeTaskId: "bounty-dxrp-party-system-50usd",
  },
  {
    id: "opp-fluxer-calendar-125",
    sourceId: "source-github-search",
    repository: "fluxerapp/fluxer-meta",
    title: "User Calendars - Dev Bounty",
    sourceUrl: "https://github.com/fluxerapp/fluxer-meta/issues/21",
    provider: "GitHub issue bounty",
    reward: 125,
    currency: "USD",
    status: "verified",
    verificationScore: 72,
    payoutConfidence: "medium",
    duplicateRisk: "medium",
    difficulty: "medium",
  },
  {
    id: "opp-armory-pom-100",
    sourceId: "source-bountysource",
    repository: "armory3d/armory",
    title: "Parallax Occlusion Mapping",
    sourceUrl: "https://github.com/armory3d/armory/issues/2609",
    provider: "Bountysource",
    reward: 100,
    currency: "USD",
    status: "collected",
    verificationScore: 58,
    payoutConfidence: "medium",
    duplicateRisk: "medium",
    difficulty: "high",
  },
  {
    id: "opp-rustchain-rtc",
    sourceId: "source-github-search",
    repository: "Scottcjn/rustchain-bounties",
    title: "Rustchain task candidate",
    sourceUrl: "https://github.com/Scottcjn/rustchain-bounties/issues",
    provider: "Repository token bounty",
    reward: 100,
    currency: "RTC",
    status: "collected",
    verificationScore: 45,
    payoutConfidence: "low",
    duplicateRisk: "medium",
    difficulty: "medium",
  },
  {
    id: "opp-unsafelabs-864",
    sourceId: "source-github-search",
    repository: "UnsafeLabs/Bounty-Hunters",
    title: "T3 code 100 USD task",
    sourceUrl: "https://github.com/UnsafeLabs/Bounty-Hunters/issues/864",
    provider: "GitHub issue bounty",
    reward: 100,
    currency: "USD",
    status: "rejected",
    verificationScore: 28,
    payoutConfidence: "low",
    duplicateRisk: "high",
    difficulty: "medium",
    rejectionReason: "Insufficient task context and payout confidence.",
  },
];

const certificationTasks = [
  {
    id: "cert-agent-memory-001",
    title: "Find and reproduce an agent memory flaw",
    riskLevel: "high",
    passingScore: 84,
    requiredSkills: ["agent memory evaluation", "bug reproduction", "GitHub PR workflow"],
  },
  {
    id: "cert-code-001",
    title: "Repair a code issue and provide test evidence",
    riskLevel: "medium",
    passingScore: 82,
    requiredSkills: ["C# implementation", "GitHub PR workflow", "test planning"],
  },
  {
    id: "cert-research-001",
    title: "Produce a traceable research and approval note",
    riskLevel: "low",
    passingScore: 78,
    requiredSkills: ["GitHub bounty triage", "maintainer communication"],
  },
  {
    id: "cert-procurement-001",
    title: "Extract fields and produce a comparison table",
    riskLevel: "medium",
    passingScore: 84,
    requiredSkills: ["data extraction", "spreadsheet automation"],
  },
];

const knownFrameworks = new Set([
  "Codex",
  "Claude Code",
  "Hermes",
  "OpenClaw",
  "LangGraph",
  "CrewAI",
  "Custom Agent",
]);

function main() {
  const [command = "help", ...rest] = process.argv.slice(2);
  const options = parseArgs(rest);

  try {
    if (command === "init") return initCommand(options);
    if (command === "connect") return connectCommand(options);
    if (command === "certify") return certifyCommand(options);
    if (command === "scan") return scanCommand(options);
    if (command === "tasks") return tasksCommand(options);
    if (command === "accept") return acceptCommand(options);
    return helpCommand();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`AgentWork CLI error: ${message}`);
    process.exitCode = 1;
  }
}

function parseArgs(args) {
  const options = { _: [] };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      options._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function initCommand(options) {
  const output = resolve(String(options.output || DEFAULT_AGENTWORK_FILE));
  if (existsSync(output) && !options.force) {
    throw new Error(`${output} already exists. Re-run with --force to overwrite.`);
  }
  writeTextFile(output, templateYaml);
  console.log(`Created ${output}`);
  console.log("Next: agentwork connect --file agentwork.yaml");
}

function connectCommand(options) {
  const filePath = resolve(String(options.file || DEFAULT_AGENTWORK_FILE));
  const output = resolve(String(options.output || "agentwork-connect-manifest.json"));
  const manifest = readAgentworkYaml(filePath);
  const connectManifest = buildConnectManifest(manifest, filePath);
  writeJsonFile(output, connectManifest);
  if (options.json) {
    console.log(JSON.stringify(connectManifest, null, 2));
  } else {
    console.log(`Created ${output}`);
    console.log(
      `Suggested Passport: ${connectManifest.suggestedPassport.name} / readiness ${connectManifest.certificationReadiness.score}`,
    );
  }
}

function certifyCommand(options) {
  const filePath = resolve(String(options.file || DEFAULT_AGENTWORK_FILE));
  const output = resolve(String(options.output || "agentwork-certification-result.json"));
  const manifest = readAgentworkYaml(filePath);
  const connectManifest = buildConnectManifest(manifest, filePath);
  const result = runMockCertification(connectManifest, String(options.task || ""));
  writeJsonFile(output, result);
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Created ${output}`);
    console.log(`${result.task.title}: score ${result.score}, ${result.pass ? "PASS" : "NEEDS WORK"}`);
  }
}

function tasksCommand(options) {
  const payload = { schemaVersion: "agentwork.bountyList.v1", tasks: bountyTasks };
  if (options.output) writeJsonFile(resolve(String(options.output)), payload);
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  printTable(
    bountyTasks.map((task) => ({
      id: task.id,
      company: task.company,
      title: task.title,
      level: task.minLevel,
      budget: formatTaskBudget(task),
      due: `${task.dueInHours}h`,
      status: task.status || "open",
    })),
  );
}

function scanCommand(options) {
  const payload = {
    schemaVersion: "agentwork.bountyRadar.v1",
    generatedAt: new Date().toISOString(),
    mode: "mock-source-scan",
    guardrails: [
      "The scanner only lists candidate opportunities.",
      "Publishing, public comments, forks, PRs, and submissions require owner approval.",
      "Rejected opportunities should not be routed to Agents.",
    ],
    sources: bountySources,
    opportunities: bountyOpportunities,
  };
  if (options.output) writeJsonFile(resolve(String(options.output)), payload);
  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  printTable(
    bountyOpportunities.map((opportunity) => ({
      id: opportunity.id,
      repository: opportunity.repository,
      reward: formatCurrency(opportunity.reward, opportunity.currency),
      status: opportunity.status,
      payout: opportunity.payoutConfidence,
      duplicate: opportunity.duplicateRisk,
      verify: opportunity.verificationScore,
    })),
  );
}

function acceptCommand(options) {
  const taskId = options._[0];
  if (!taskId) throw new Error("Missing task id. Example: agentwork accept bounty-code-001");
  const bounty = bountyTasks.find((task) => task.id === taskId);
  if (!bounty) throw new Error(`Unknown bounty task: ${taskId}`);
  const filePath = resolve(String(options.file || DEFAULT_AGENTWORK_FILE));
  const output = resolve(String(options.output || "agentwork-task-acceptance.json"));
  const manifest = buildConnectManifest(readAgentworkYaml(filePath), filePath);
  const acceptance = {
    schemaVersion: "agentwork.taskAcceptance.v1",
    acceptedAt: new Date().toISOString(),
    bounty,
    agent: {
      name: manifest.suggestedPassport.name,
      ownerName: manifest.suggestedPassport.ownerName,
      frameworks: manifest.suggestedPassport.frameworks,
      skills: manifest.suggestedPassport.skills,
      readinessScore: manifest.certificationReadiness.score,
    },
    platformBoundary: {
      localOnly: true,
      uploadRequired: false,
      settlementRequiredBeforeProduction: true,
      humanReviewRequired: true,
      approvalGate:
        bounty.id === "bounty-memanto-bug-challenge-100usd"
          ? "Do not comment publicly, fork, open a PR, publish exploit details, or run social amplification until the owner approves a non-duplicate target and disclosure route."
          : bounty.id === "bounty-dxrp-party-system-50usd"
            ? "Do not code, comment publicly, or open a PR until the maintainer explicitly approves a backup implementer."
          : "Owner review required before public write actions.",
    },
  };
  writeJsonFile(output, acceptance);
  if (options.json) {
    console.log(JSON.stringify(acceptance, null, 2));
  } else {
    console.log(`Created ${output}`);
    console.log(`${manifest.suggestedPassport.name} accepted ${bounty.id}`);
  }
}

function helpCommand() {
  console.log(`AgentWork CLI ${CLI_VERSION}

Usage:
  agentwork init [--output agentwork.yaml] [--force]
  agentwork connect [--file agentwork.yaml] [--output agentwork-connect-manifest.json] [--json]
  agentwork certify [--file agentwork.yaml] [--task cert-code-001] [--output result.json] [--json]
  agentwork scan [--output bounty-radar.json] [--json]
  agentwork tasks [--output bounty-list.json] [--json]
  agentwork accept <task-id> [--file agentwork.yaml] [--output acceptance.json] [--json]

Privacy:
  The MVP CLI reads only the explicit agentwork.yaml file and writes local JSON artifacts.
  It does not scan the whole disk, read secrets, or upload data.`);
}

function readAgentworkYaml(filePath) {
  if (!existsSync(filePath)) throw new Error(`Cannot find ${filePath}. Run agentwork init first.`);
  const text = readFileSync(filePath, "utf8");
  const parsed = parseSimpleYaml(text);
  if (parsed.schemaVersion !== "agentwork.agent.v1") {
    throw new Error("schemaVersion must be agentwork.agent.v1");
  }
  if (!parsed.agent?.name) throw new Error("agent.name is required.");
  if (!parsed.owner?.name) throw new Error("owner.name is required.");
  return parsed;
}

function parseSimpleYaml(text) {
  const root = {};
  let currentSection = null;
  let currentArrayKey = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const withoutComment = rawLine.replace(/\s+#.*$/, "");
    if (!withoutComment.trim()) continue;
    const indent = withoutComment.match(/^\s*/)?.[0].length || 0;
    const line = withoutComment.trim();

    if (indent === 0) {
      currentArrayKey = null;
      const [key, value] = splitKeyValue(line);
      if (value === null) {
        root[key] = {};
        currentSection = key;
      } else {
        root[key] = parseScalar(value);
        currentSection = null;
      }
      continue;
    }

    if (indent === 2 && currentSection) {
      const [key, value] = splitKeyValue(line);
      if (value === null) {
        root[currentSection][key] = [];
        currentArrayKey = key;
      } else {
        root[currentSection][key] = parseScalar(value);
        currentArrayKey = null;
      }
      continue;
    }

    if (indent === 4 && currentSection && currentArrayKey && line.startsWith("- ")) {
      root[currentSection][currentArrayKey].push(parseScalar(line.slice(2).trim()));
      continue;
    }

    throw new Error(`Unsupported YAML line: ${rawLine}`);
  }

  return root;
}

function splitKeyValue(line) {
  const index = line.indexOf(":");
  if (index < 0) throw new Error(`Invalid YAML line: ${line}`);
  const key = line.slice(0, index).trim();
  const value = line.slice(index + 1).trim();
  return [key, value.length > 0 ? value : null];
}

function parseScalar(value) {
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if (value === "true") return true;
  if (value === "false") return false;
  return value.replace(/^["']|["']$/g, "");
}

function buildConnectManifest(manifest, sourceFile) {
  const agent = manifest.agent || {};
  const owner = manifest.owner || {};
  const pricing = manifest.pricing || {};
  const availability = manifest.availability || {};
  const bountyPreferences = manifest.bountyPreferences || {};
  const frameworks = normalizeFrameworks(asArray(agent.frameworks));
  const skills = asArray(agent.skills);
  const toolchain = asArray(agent.toolchain);
  const pricingModel = ["per_task", "retainer", "outcome", "hourly"].includes(pricing.model)
    ? pricing.model
    : "per_task";
  const basePrice = Number(pricing.basePrice || 30);
  const turnaroundHours = Number(availability.turnaroundHours || 24);
  const checks = [
    {
      label: "Owner identity",
      ok: Boolean(owner.name),
      detail: owner.name ? "Owner name present" : "Missing owner.name",
    },
    {
      label: "Framework declared",
      ok: frameworks.length > 0,
      detail: frameworks.join(", ") || "No framework",
    },
    {
      label: "Skill inventory",
      ok: skills.length >= 2,
      detail: `${skills.length} skills`,
    },
    {
      label: "Risk boundary",
      ok: Boolean(agent.riskBoundary),
      detail: agent.riskBoundary || "Missing riskBoundary",
    },
    {
      label: "Human review",
      ok: /review|human|approval/i.test(agent.riskBoundary || agent.collaborationMode || ""),
      detail: "Write actions should include review boundary",
    },
  ];
  const readinessScore = clamp(
    44 +
      Math.min(frameworks.length * 6, 12) +
      Math.min(skills.length * 5, 20) +
      Math.min(toolchain.length * 4, 16) +
      checks.filter((check) => check.ok).length * 4 +
      (turnaroundHours <= 24 ? 6 : 2),
    50,
    96,
  );

  return {
    schemaVersion: "agentwork.connectManifest.v1",
    connector: {
      name: "AgentWork CLI",
      version: CLI_VERSION,
      generatedAt: new Date().toISOString(),
      sourceFile,
      localOnly: true,
      consentCaptured: true,
      didUploadData: false,
    },
    owner: {
      name: String(owner.name || "Local Agent Owner"),
      type: String(owner.type || "individual"),
    },
    agent: {
      name: String(agent.name),
      version: String(agent.version || "0.1.0"),
      frameworks,
      skills,
      toolchain,
      collaborationMode: String(agent.collaborationMode || "Owner reviews all task outputs."),
      riskBoundary: String(agent.riskBoundary || "No production access without human review."),
    },
    suggestedPassport: {
      name: String(agent.name),
      ownerName: String(owner.name || "Local Agent Owner"),
      frameworks,
      skills,
      toolchain,
      collaborationMode: String(agent.collaborationMode || "Owner reviews all task outputs."),
      riskBoundary: String(agent.riskBoundary || "No production access without human review."),
      pricingModel,
      basePrice,
    },
    certificationReadiness: {
      score: readinessScore,
      suggestedLevel: scoreToLevel(readinessScore),
      checks,
      recommendedTasks: recommendCertificationTasks(skills),
      riskFlags: checks.filter((check) => !check.ok).map((check) => check.label),
    },
    bountyPreferences: {
      categories: asArray(bountyPreferences.categories),
      minBudget: Number(bountyPreferences.minBudget || 0),
      turnaroundHours,
    },
  };
}

function runMockCertification(connectManifest, taskId) {
  const skills = connectManifest.suggestedPassport.skills;
  const task =
    certificationTasks.find((candidate) => candidate.id === taskId) ||
    certificationTasks.find((candidate) =>
      candidate.requiredSkills.some((skill) =>
        skills.some((owned) => fuzzyIncludes(owned, skill) || fuzzyIncludes(skill, owned)),
      ),
    ) ||
    certificationTasks[0];
  const skillHits = task.requiredSkills.filter((skill) =>
    skills.some((owned) => fuzzyIncludes(owned, skill) || fuzzyIncludes(skill, owned)),
  ).length;
  const score = clamp(
    connectManifest.certificationReadiness.score + skillHits * 8 - (task.riskLevel === "medium" ? 3 : 0),
    50,
    98,
  );
  return {
    schemaVersion: "agentwork.certificationResult.v1",
    generatedAt: new Date().toISOString(),
    task,
    agent: connectManifest.suggestedPassport.name,
    score,
    pass: score >= task.passingScore,
    recommendedLevel: scoreToLevel(score),
    findings: [
      `${skillHits}/${task.requiredSkills.length} required skills matched`,
      connectManifest.certificationReadiness.riskFlags.length === 0
        ? "Risk boundary is ready for platform review"
        : `Needs improvement: ${connectManifest.certificationReadiness.riskFlags.join(", ")}`,
      "Mock result only; real certification will require sandbox evidence and reviewer acceptance.",
    ],
  };
}

function recommendCertificationTasks(skills) {
  const lower = skills.join(" ").toLowerCase();
  if (/agent memory|memory evaluation|reproduction|bug reproduction/.test(lower)) return ["cert-agent-memory-001"];
  if (/code|c#|github|pr|test|playwright/.test(lower)) return ["cert-code-001"];
  if (/research|triage|communication|maintainer|approval/.test(lower)) return ["cert-research-001"];
  if (/data|excel|spreadsheet|extract/.test(lower)) return ["cert-procurement-001"];
  return ["cert-code-001", "cert-research-001"];
}

function normalizeFrameworks(values) {
  const frameworks = values.filter((value) => knownFrameworks.has(value));
  return frameworks.length > 0 ? frameworks : ["Custom Agent"];
}

function scoreToLevel(score) {
  if (score >= 92) return "L4";
  if (score >= 84) return "L3";
  if (score >= 76) return "L2";
  if (score >= 68) return "L1";
  return "L0";
}

function asArray(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value == null || value === "") return [];
  return [String(value)];
}

function fuzzyIncludes(a, b) {
  return a.toLowerCase().includes(b.toLowerCase());
}

function formatTaskBudget(task) {
  return formatCurrency(task.budget, task.currency);
}

function formatCurrency(amount, currency = "CNY") {
  if (currency === "USD") return `$${amount}`;
  if (currency === "CNY") return `CNY ${amount}`;
  return `${amount} ${currency}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function writeTextFile(filePath, text) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, text, "utf8");
}

function writeJsonFile(filePath, value) {
  writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function printTable(rows) {
  const columns = Object.keys(rows[0] || {});
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String(row[column]).length)),
  );
  console.log(columns.map((column, index) => column.padEnd(widths[index])).join("  "));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  for (const row of rows) {
    console.log(columns.map((column, index) => String(row[column]).padEnd(widths[index])).join("  "));
  }
}

main();
