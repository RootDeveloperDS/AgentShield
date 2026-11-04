export interface AutonomousStepTrace {
  step: number;
  name: string;
  category: "REASONING" | "CRYPTO" | "FIREWALL" | "SETTLEMENT";
  timestamp: string;
  status: "SUCCESS" | "BLOCKED" | "WARNING" | "INFO";
  title: string;
  summary: string;
  details: Record<string, any>;
}

export interface AIProcurementDecision {
  recipient: string;
  service: string;
  amountMinor: number;
  currency: string;
  reasoning: string;
  model: string;
  isSimulated: boolean;
  prompt: string;
}

export interface AutonomousAgentResult {
  scenario: "LEGITIMATE_PROCUREMENT" | "PROMPT_INJECTION_ATTACK";
  goal: string;
  agentId: string;
  agentName: string;
  llmDecision: AIProcurementDecision;
  intent?: {
    intentId: string;
    agentId: string;
    recipient: string;
    service: string;
    amountMinor: number;
    currency: string;
    createdAt: string;
    expiresAt: string;
    nonce: string;
  };
  signatureBase64?: string;
  verificationOutcome: {
    decision: "APPROVED" | "REQUIRES_HUMAN_APPROVAL" | "REJECTED";
    reason: string;
    reasonCode?: string;
  };
  paypalOutcome?: {
    orderId?: string;
    captureId?: string;
    status: string;
    isSimulatedSandbox: boolean;
  };
  steps: AutonomousStepTrace[];
  completedAt: string;
  summary: {
    title: string;
    isFirewallProtected: boolean;
    description: string;
  };
}

export interface AgentStatusInfo {
  model: string;
  provider: string;
  isConfigured: boolean;
  paypalConfigured: boolean;
  agentId: string;
}
