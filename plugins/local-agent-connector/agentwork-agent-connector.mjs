#!/usr/bin/env node
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir, hostname, platform, release } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

const VERSION = "0.1.1";

const KNOWN_AGENTS = [
  {
    id: "codex",
    displayName: "Codex",
    framework: "Codex",
    commands: ["codex", "codex.cmd", "codex.exe"],
    configDirs: [".codex"],
    defaultSkills: ["代码生成", "代码修复", "测试生成", "文档生成"],
    onboardingHint: "建议先用 GitHub PR 修复、测试生成或文档补齐任务做 L2/L3 认证。",
  },
  {
    id: "claude-code",
    displayName: "Claude Code",
    framework: "Claude Code",
    commands: ["claude", "claude.cmd", "claude.exe", "claude-code", "claude-code.cmd"],
    configDirs: [".claude", join(".config", "claude")],
    defaultSkills: ["代码修复", "代码迁移", "脚本自动化", "技术文档"],
    onboardingHint: "建议先提交脱敏代码仓库样例，走人审写入认证。",
  },
  {
    id: "hermes",
    displayName: "Hermes",
    framework: "Hermes",
    commands: ["hermes", "hermes.cmd", "hermes.exe"],
    configDirs: [
      ".hermes",
      join(".config", "hermes"),
      join("AppData", "Local", "Hermes"),
      join("AppData", "Roaming", "Hermes"),
    ],
    defaultSkills: ["任务编排", "业务研究", "资料整理", "多步骤工作流"],
    onboardingHint: "建议先用业务研究或资料整理任务做只读生产认证。",
  },
  {
    id: "openclaw",
    displayName: "OpenClaw",
    framework: "OpenClaw",
    commands: ["openclaw", "openclaw.cmd", "openclaw.exe", "claw", "claw.cmd"],
    configDirs: [".openclaw", join(".config", "openclaw")],
    defaultSkills: ["工具调用", "报价抽取", "流程自动化", "表格处理"],
    onboardingHint: "建议先用沙箱样本数据完成报价抽取或表格处理试工。",
  },
  {
    id: "langgraph",
    displayName: "LangGraph Agent",
    framework: "LangGraph",
    commands: ["langgraph", "langgraph.cmd"],
    configDirs: [join(".config", "langgraph")],
    defaultSkills: ["状态机工作流", "多节点 Agent", "业务流程自动化"],
    onboardingHint: "建议提交工作流图和标准输入输出样例。",
  },
  {
    id: "crewai",
    displayName: "CrewAI Agent",
    framework: "CrewAI",
    commands: ["crewai", "crewai.cmd"],
    configDirs: [".crewai", join(".config", "crewai")],
    defaultSkills: ["多 Agent 协作", "研究任务", "内容生成", "流程自动化"],
    onboardingHint: "建议先禁用外部写入动作，做 L1/L2 认证。",
  },
];

function parseArgs(argv) {
  const args = {
    consent: false,
    output: "agentwork-agent-manifest.json",
    platformUrl: "http://127.0.0.1:5174",
    includeConfigs: true,
    includePath: true,
    ownerName: "",
    only: [],
    json: false,
    help: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--consent") args.consent = true;
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--no-configs") args.includeConfigs = false;
    else if (arg === "--no-path") args.includePath = false;
    else if (arg === "--output") args.output = argv[++i] || args.output;
    else if (arg === "--platform-url") args.platformUrl = argv[++i] || args.platformUrl;
    else if (arg === "--owner-name") args.ownerName = argv[++i] || "";
    else if (arg === "--only") args.only = (argv[++i] || "").split(",").map((item) => item.trim()).filter(Boolean);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log(`AgentWork Local Agent Connector v${VERSION}

Usage:
  node agentwork-agent-connector.mjs --consent --output agentwork-agent-manifest.json

Options:
  --consent                Required. Confirms the user wants to scan this computer.
  --output <path>          Write manifest JSON. Default: agentwork-agent-manifest.json
  --platform-url <url>     Platform URL shown in onboarding instructions.
  --owner-name <name>      Optional Agent Owner name to include in the manifest.
  --only <ids>             Optional comma-separated filter, for example hermes,codex.
  --json                   Print manifest JSON to stdout.
  --no-path                Do not inspect executables in PATH.
  --no-configs             Do not inspect known config directory existence.
  --help                   Show help.

Privacy:
  This tool does not upload data, read API keys, open config files, or scan the whole disk.
  It only checks executable names on PATH and whether known agent config directories exist.
`);
}

function pathEntries() {
  return (process.env.PATH || "")
    .split(platform() === "win32" ? ";" : ":")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function executableCandidates(command) {
  if (platform() !== "win32") return [command];
  const extensions = (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM")
    .split(";")
    .map((ext) => ext.toLowerCase());
  const lower = command.toLowerCase();
  if (extensions.some((ext) => lower.endsWith(ext.toLowerCase()))) return [command];
  return [command, ...extensions.map((ext) => `${command}${ext.toLowerCase()}`)];
}

function findExecutable(commands) {
  for (const dir of pathEntries()) {
    for (const command of commands) {
      for (const candidate of executableCandidates(command)) {
        const fullPath = join(dir, candidate);
        if (existsSync(fullPath)) return fullPath;
      }
    }
  }
  return undefined;
}

function findConfigDirs(configDirs) {
  const home = homedir();
  return configDirs
    .map((dir) => join(home, dir))
    .filter((dir) => existsSync(dir) && safeIsDirectory(dir))
    .map((dir) => ({ path: dir, fileCountEstimate: safeFileCount(dir) }));
}

function safeIsDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function safeFileCount(path) {
  try {
    return readdirSync(path).slice(0, 200).length;
  } catch {
    return 0;
  }
}

function hashValue(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

function confidence(executablePath, configMatches) {
  if (executablePath && configMatches.length > 0) return "high";
  if (executablePath || configMatches.length > 0) return "medium";
  return "none";
}

function detectAgents(args) {
  const selectedAgents = args.only.length > 0
    ? KNOWN_AGENTS.filter((agent) => matchesOnlyFilter(agent, args.only))
    : KNOWN_AGENTS;

  return selectedAgents.map((agent) => {
    const executablePath = args.includePath ? findExecutable(agent.commands) : undefined;
    const configMatches = args.includeConfigs ? findConfigDirs(agent.configDirs) : [];
    const conf = confidence(executablePath, configMatches);
    if (conf === "none") return undefined;

    return {
      id: `${agent.id}-${hashValue(`${agent.id}:${executablePath || configMatches[0]?.path || "config"}`)}`,
      displayName: agent.displayName,
      framework: agent.framework,
      detection: {
        confidence: conf,
        methods: [
          executablePath ? "path-executable" : undefined,
          configMatches.length > 0 ? "known-config-dir" : undefined,
        ].filter(Boolean),
        executablePath,
        configDirs: configMatches,
      },
      suggestedPassport: {
        name: agent.displayName,
        frameworks: [agent.framework],
        skills: agent.defaultSkills,
        toolchain: [agent.displayName, executablePath ? basename(executablePath) : "local-config"],
        collaborationMode: "Owner 定义任务目标，Agent 在本机或受控沙箱运行，Owner 复核结果后提交平台。",
        riskBoundary: "默认不上传本机密钥；企业写入、发送、部署等动作必须通过平台人审。",
        pricingModel: "per_task",
        basePrice: 3000,
      },
      onboardingHint: agent.onboardingHint,
      status: "needs-owner-review",
    };
  }).filter(Boolean);
}

function matchesOnlyFilter(agent, filters) {
  const aliases = [agent.id, agent.displayName, agent.framework];
  if (agent.id === "codex") aliases.push("OpenAI Codex", "OpenAI-Codex");
  return filters.some((filter) =>
    aliases.some((alias) => normalizeAgentName(alias) === normalizeAgentName(filter)),
  );
}

function normalizeAgentName(value) {
  return String(value)
    .toLowerCase()
    .replace(/^openai[\s-]+/, "")
    .replace(/\s+/g, "-");
}

function buildManifest(args) {
  const detectedAgents = detectAgents(args);
  return {
    schemaVersion: "agentwork.localAgentManifest.v1",
    connector: {
      name: "AgentWork Local Agent Connector",
      version: VERSION,
      runId: randomUUID(),
      generatedAt: new Date().toISOString(),
      privacyMode: "local-manifest-only",
    },
    device: {
      platform: platform(),
      osRelease: release(),
      hostnameHash: hashValue(hostname()),
      homeHash: hashValue(homedir()),
    },
    owner: {
      name: args.ownerName,
    },
    scanPolicy: {
      userConsentRequired: true,
      consentCaptured: args.consent,
      inspectedPathExecutables: args.includePath,
      inspectedKnownConfigDirs: args.includeConfigs,
      didReadConfigFileContents: false,
      didScanWholeDisk: false,
      didUploadData: false,
    },
    detectedAgents,
    onboarding: {
      platformUrl: args.platformUrl,
      nextSteps: [
        "Open the AgentWork Exchange platform.",
        "Go to 接入插件.",
        "Paste or import this manifest.",
        "Review each detected Agent before creating Agent Passport drafts.",
        "Run L1-L3 certification tasks before any enterprise matching.",
      ],
    },
  };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    return;
  }
  if (!args.consent) {
    console.error("Refusing to scan without explicit --consent.");
    console.error("Run with --help to inspect the privacy policy and usage.");
    process.exit(2);
  }

  const manifest = buildManifest(args);
  const json = JSON.stringify(manifest, null, 2);

  if (args.output) {
    const outputPath = resolve(args.output);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, json, "utf8");
  }

  if (args.json) console.log(json);
  else {
    console.log(`AgentWork connector manifest written to ${resolve(args.output)}`);
    console.log(`Detected ${manifest.detectedAgents.length} candidate Agent installation(s).`);
    console.log(`Open ${args.platformUrl} and paste/import the manifest under 接入插件.`);
  }
}

main();
