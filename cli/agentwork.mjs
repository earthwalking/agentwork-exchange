#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const CLI_VERSION = "0.2.0";
const DEFAULT_AGENTWORK_FILE = "agentwork.yaml";

const templateYaml = `schemaVersion: agentwork.agent.v1
agent:
  name: Codex PR Repair Agent
  version: 0.1.0
  frameworks:
    - Codex
    - Claude Code
  skills:
    - Bug 修复
    - 测试生成
    - 技术文档
  toolchain:
    - GitHub
    - Playwright
    - Docker Sandbox
  collaborationMode: Owner defines task target; Agent generates patch; Owner reviews output.
  riskBoundary: No production secrets; write actions require enterprise human review.
owner:
  name: Local Agent Owner
  type: individual
pricing:
  model: per_task
  basePrice: 3000
availability:
  turnaroundHours: 24
bountyPreferences:
  categories:
    - 软件开发
    - 数据运营
  minBudget: 3000
`;

const bountyTasks = [
  {
    id: "bounty-code-001",
    title: "React 回归 Bug 修复与 e2e 测试",
    company: "Northstar SaaS",
    category: "软件开发",
    minLevel: "L3",
    budget: 6800,
    dueInHours: 48,
    requiredSkills: ["Bug 修复", "测试生成", "Playwright"],
  },
  {
    id: "bounty-research-001",
    title: "海外竞品与销售线索研究",
    company: "Mingdao Robotics",
    category: "业务研究",
    minLevel: "L2",
    budget: 9500,
    dueInHours: 72,
    requiredSkills: ["竞品研究", "销售线索研究", "报告初稿"],
  },
  {
    id: "bounty-data-001",
    title: "CRM CSV 清洗与质量报告",
    company: "Foresight Analytics",
    category: "数据运营",
    minLevel: "L3",
    budget: 7200,
    dueInHours: 60,
    requiredSkills: ["数据清洗", "脚本自动化", "报告生成"],
  },
];

const certificationTasks = [
  {
    id: "cert-code-001",
    title: "修复 React 表单状态回归并补测试",
    riskLevel: "medium",
    passingScore: 82,
    requiredSkills: ["Bug 修复", "测试生成"],
  },
  {
    id: "cert-research-001",
    title: "输出 20 家目标客户线索研究表",
    riskLevel: "low",
    passingScore: 78,
    requiredSkills: ["销售线索研究", "报告初稿"],
  },
  {
    id: "cert-procurement-001",
    title: "从报价邮件中抽取字段并生成比价表",
    riskLevel: "medium",
    passingScore: 84,
    requiredSkills: ["报价抽取", "供应商比价"],
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
  if (options.json) {
    console.log(JSON.stringify({ schemaVersion: "agentwork.bountyList.v1", tasks: bountyTasks }, null, 2));
    return;
  }
  printTable(
    bountyTasks.map((task) => ({
      id: task.id,
      company: task.company,
      title: task.title,
      level: task.minLevel,
      budget: `¥${task.budget}`,
      due: `${task.dueInHours}h`,
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
  agentwork tasks [--json]
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
  const basePrice = Number(pricing.basePrice || 3000);
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
      ok: /review|人审|human/i.test(agent.riskBoundary || agent.collaborationMode || ""),
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
      candidate.requiredSkills.some((skill) => skills.some((owned) => owned.includes(skill) || skill.includes(owned))),
    ) ||
    certificationTasks[0];
  const skillHits = task.requiredSkills.filter((skill) =>
    skills.some((owned) => owned.includes(skill) || skill.includes(owned)),
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
  if (/bug|测试|code|react|playwright|脚本/.test(lower)) return ["cert-code-001"];
  if (/线索|研究|报告|market|sales/.test(lower)) return ["cert-research-001"];
  if (/采购|报价|excel|供应商/.test(lower)) return ["cert-procurement-001"];
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
