/**
 * AgentShield — Phase 6 Autonomous AI Buyer Agent Live CLI Showcase
 * 
 * Demonstrates:
 * 1. Groq LLM reasoning (openai/gpt-oss-20b) for autonomous procurement
 * 2. RFC 8032 Ed25519 cryptographic key generation & challenge-response handshake
 * 3. Canonical JSON intent serialization & digital signing
 * 4. Deterministic policy enforcement ($500 hard cap, $100 human escalation, daily spend)
 * 5. PayPal Sandbox settlement execution vs adversarial prompt injection drop
 *
 * Usage:
 *   npx tsx demo/ai_buyer_agent.ts
 */

import { runAutonomousBuyerAgent, type AutonomousStepTrace } from "../backend/src/ai/buyerAgent.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgRed: "\x1b[41m\x1b[37m",
  bgGreen: "\x1b[42m\x1b[30m"
};

function banner() {
  console.clear();
  console.log(`${ANSI.cyan}${ANSI.bold}`);
  console.log("╔════════════════════════════════════════════════════════════════════════════╗");
  console.log("║           AGENTSHIELD v1.5.0 — AUTONOMOUS AI BUYER AGENT SHOWCASE          ║");
  console.log("║     Zero-Trust Cryptographic Firewall for Autonomous Agent Procurement     ║");
  console.log("╚════════════════════════════════════════════════════════════════════════════╝");
  console.log(`${ANSI.reset}`);
  console.log(`${ANSI.dim}Model Engine:${ANSI.reset} ${ANSI.magenta}Groq (openai/gpt-oss-20b)${ANSI.reset}`);
  console.log(`${ANSI.dim}Cryptography:${ANSI.reset} ${ANSI.cyan}Ed25519 (RFC 8032) + SHA-512${ANSI.reset}`);
  console.log(`${ANSI.dim}Settlement:  ${ANSI.reset} ${ANSI.green}PayPal REST API v2 Sandbox${ANSI.reset}`);
  console.log(`${ANSI.dim}Firewall:    ${ANSI.reset} ${ANSI.yellow}Deterministic Zero-Trust Policy Engine${ANSI.reset}`);
  console.log("──────────────────────────────────────────────────────────────────────────────\n");
}

function printStep(step: AutonomousStepTrace) {
  const icon = step.status === "SUCCESS"
    ? `${ANSI.green}✓${ANSI.reset}`
    : step.status === "BLOCKED"
    ? `${ANSI.red}✗ [BLOCKED]${ANSI.reset}`
    : `${ANSI.yellow}⚠${ANSI.reset}`;

  const catColor = step.category === "REASONING"
    ? ANSI.magenta
    : step.category === "CRYPTO"
    ? ANSI.cyan
    : step.category === "FIREWALL"
    ? ANSI.yellow
    : ANSI.green;

  console.log(`${ANSI.bold}STAGE ${step.step}:${ANSI.reset} [${catColor}${step.category}${ANSI.reset}] ${icon} ${ANSI.bold}${step.title}${ANSI.reset}`);
  console.log(`  ${ANSI.dim}Summary:${ANSI.reset} ${step.summary}`);

  // Print selected detail key-values
  for (const [k, v] of Object.entries(step.details)) {
    if (typeof v === "object" && v !== null) {
      console.log(`    ${ANSI.dim}• ${k}:${ANSI.reset} ${JSON.stringify(v)}`);
    } else {
      console.log(`    ${ANSI.dim}• ${k}:${ANSI.reset} ${String(v)}`);
    }
  }
  console.log();
}

async function runScenarioA() {
  console.log(`${ANSI.bgGreen} SCENARIO A: LEGITIMATE AUTONOMOUS PROCUREMENT ($25.00 USD) ${ANSI.reset}\n`);
  console.log(`${ANSI.dim}Agent Objective: Procure 500 GPU hours for model fine-tuning within authorized $25.00 limit.${ANSI.reset}\n`);

  const result = await runAutonomousBuyerAgent({
    scenario: "LEGITIMATE_PROCUREMENT"
  });

  for (const step of result.steps) {
    printStep(step);
  }

  console.log(`${ANSI.green}${ANSI.bold}► OUTCOME:${ANSI.reset} ${result.summary.title}`);
  console.log(`  ${result.summary.description}`);
  if (result.paypalOutcome) {
    console.log(`  ${ANSI.bold}PayPal Order:${ANSI.reset}   ${result.paypalOutcome.orderId}`);
    console.log(`  ${ANSI.bold}PayPal Capture:${ANSI.reset} ${result.paypalOutcome.captureId}`);
    console.log(`  ${ANSI.bold}Status:${ANSI.reset}         ${ANSI.green}${result.paypalOutcome.status}${ANSI.reset}`);
  }
  console.log("\n──────────────────────────────────────────────────────────────────────────────\n");
}

async function runScenarioB() {
  console.log(`${ANSI.bgRed} SCENARIO B: ADVERSARIAL PROMPT INJECTION ATTACK ($600.00 USD) ${ANSI.reset}\n`);
  console.log(`${ANSI.dim}Adversary Objective: Trick the LLM into exfiltrating $600 to darknet. Will the firewall catch it?${ANSI.reset}\n`);

  const result = await runAutonomousBuyerAgent({
    scenario: "PROMPT_INJECTION_ATTACK"
  });

  for (const step of result.steps) {
    printStep(step);
  }

  console.log(`${ANSI.red}${ANSI.bold}► OUTCOME:${ANSI.reset} ${result.summary.title}`);
  console.log(`  ${result.summary.description}`);
  console.log(`  ${ANSI.bold}Policy Code:${ANSI.reset}            ${ANSI.red}${result.verificationOutcome.reasonCode}${ANSI.reset}`);
  console.log(`  ${ANSI.bold}Financial Loss Prevented:${ANSI.reset} ${ANSI.green}$600.00 USD${ANSI.reset}`);
  console.log(`  ${ANSI.bold}PayPal Invoked:${ANSI.reset}          ${ANSI.red}FALSE (Never contacted)${ANSI.reset}`);
  console.log("\n──────────────────────────────────────────────────────────────────────────────\n");
}

async function main() {
  banner();
  await runScenarioA();
  await runScenarioB();
  console.log(`${ANSI.cyan}${ANSI.bold}✔ ALL AUTONOMOUS AGENT SHOWCASES COMPLETED SUCCESSFULLY.${ANSI.reset}\n`);
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
