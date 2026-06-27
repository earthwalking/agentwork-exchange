import type { AgentFramework, PricingModel } from "./types";

export interface LocalAgentManifest {
  schemaVersion: "agentwork.localAgentManifest.v1";
  connector: {
    name: string;
    version: string;
    runId: string;
    generatedAt: string;
    privacyMode: string;
  };
  device: {
    platform: string;
    osRelease: string;
    hostnameHash: string;
    homeHash: string;
  };
  owner?: {
    name?: string;
  };
  scanPolicy: {
    userConsentRequired: boolean;
    consentCaptured: boolean;
    inspectedPathExecutables?: boolean;
    inspectedKnownConfigDirs?: boolean;
    didReadConfigFileContents: boolean;
    didScanWholeDisk: boolean;
    didUploadData: boolean;
  };
  detectedAgents: LocalDetectedAgent[];
  onboarding?: {
    platformUrl: string;
    nextSteps: string[];
  };
}

export interface LocalDetectedAgent {
  id: string;
  displayName: string;
  framework: AgentFramework;
  detection: {
    confidence: "high" | "medium" | "low" | "none";
    methods: string[];
    executablePath?: string;
    configDirs?: Array<{
      path: string;
      fileCountEstimate: number;
    }>;
  };
  suggestedPassport: {
    name: string;
    frameworks: AgentFramework[];
    skills: string[];
    toolchain: string[];
    collaborationMode: string;
    riskBoundary: string;
    pricingModel: PricingModel;
    basePrice: number;
  };
  onboardingHint: string;
  status: string;
}
