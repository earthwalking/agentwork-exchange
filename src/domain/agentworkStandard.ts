import type { AgentSubmissionInput, CertificationLevel } from "./types";

export interface AgentWorkConnectCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface AgentWorkConnectManifest {
  schemaVersion: "agentwork.connectManifest.v1";
  connector: {
    name: string;
    version: string;
    generatedAt: string;
    sourceFile?: string;
    localOnly: boolean;
    consentCaptured: boolean;
    didUploadData: boolean;
  };
  owner: {
    name: string;
    type: string;
  };
  agent: {
    name: string;
    version: string;
    frameworks: AgentSubmissionInput["frameworks"];
    skills: string[];
    toolchain: string[];
    collaborationMode: string;
    riskBoundary: string;
  };
  suggestedPassport: AgentSubmissionInput;
  certificationReadiness: {
    score: number;
    suggestedLevel: CertificationLevel;
    checks: AgentWorkConnectCheck[];
    recommendedTasks: string[];
    riskFlags: string[];
  };
  bountyPreferences: {
    categories: string[];
    minBudget: number;
    turnaroundHours: number;
  };
}
