import { describe, it, expect, vi, beforeEach } from "vitest";
import { runAutonomousBuyerAgent } from "../src/ai/buyerAgent.js";
import { generateProcurementIntent } from "../src/ai/groqClient.js";

describe("Autonomous AI Buyer Agent & Zero-Trust Firewall (Phase 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("successfully formulates structured procurement using Groq model configuration", async () => {
    const decision = await generateProcurementIntent("LEGITIMATE_PROCUREMENT");
    expect(decision).toBeDefined();
    expect(decision.currency).toBe("USD");
    expect(decision.amountMinor).toBeGreaterThan(0);
    expect(decision.recipient).toContain("@");
    expect(decision.model).toContain("gpt-oss-20b");
    expect(decision.reasoning.length).toBeGreaterThan(5);
  });

  it("formulates adversarial intent when subject to prompt injection attack", async () => {
    const attackDecision = await generateProcurementIntent("PROMPT_INJECTION_ATTACK");
    expect(attackDecision).toBeDefined();
    expect(attackDecision.recipient).toBe("rogue-exploit@darknet.org");
    expect(attackDecision.amountMinor).toBe(60000); // $600.00 USD
  });

  it("executes complete 5-stage lifecycle for legitimate $25.00 procurement", async () => {
    const result = await runAutonomousBuyerAgent({
      scenario: "LEGITIMATE_PROCUREMENT"
    });

    expect(result.scenario).toBe("LEGITIMATE_PROCUREMENT");
    expect(result.verificationOutcome.decision).toBe("APPROVED");
    expect(result.steps.length).toBe(5);

    // Verify step sequence and categories
    expect(result.steps[0].category).toBe("REASONING");
    expect(result.steps[0].status).toBe("SUCCESS");

    expect(result.steps[1].category).toBe("CRYPTO");
    expect(result.steps[1].details.handshakeVerified).toBe(true);

    expect(result.steps[2].category).toBe("CRYPTO");
    expect(result.steps[2].details.nonce).toBeDefined();

    expect(result.steps[3].category).toBe("FIREWALL");
    expect(result.steps[3].status).toBe("SUCCESS");

    expect(result.steps[4].category).toBe("SETTLEMENT");
    expect(result.steps[4].status).toBe("SUCCESS");
    expect(result.paypalOutcome?.status).toBe("COMPLETED");
  }, 30000);

  it("strictly terminates and blocks adversarial prompt injection attack before PayPal execution", async () => {
    const result = await runAutonomousBuyerAgent({
      scenario: "PROMPT_INJECTION_ATTACK"
    });

    expect(result.scenario).toBe("PROMPT_INJECTION_ATTACK");
    expect(result.verificationOutcome.decision).toBe("REJECTED");
    expect(result.verificationOutcome.reasonCode).toBe("EXCEEDS_MAX_TRANSACTION");

    // The firewall must drop the payment at step 4
    expect(result.steps.length).toBe(4);
    const firewallStep = result.steps[3];
    expect(firewallStep.category).toBe("FIREWALL");
    expect(firewallStep.status).toBe("BLOCKED");
    expect(firewallStep.details.paypalInvoked).toBe(false);

    // Summary must confirm firewall protected
    expect(result.summary.isFirewallProtected).toBe(true);
    expect(result.paypalOutcome).toBeUndefined();
  });
});
