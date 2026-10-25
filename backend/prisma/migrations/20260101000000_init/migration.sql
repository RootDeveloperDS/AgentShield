CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING_VERIFICATION', 'REJECTED', 'AWAITING_APPROVAL', 'READY_FOR_PAYMENT', 'ORDER_CREATED', 'AWAITING_BUYER_APPROVAL', 'CAPTURE_PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REQUIRES_RECONCILIATION');

CREATE TABLE "Agent" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentIntent" (
  "id" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "service" TEXT NOT NULL,
  "amountMinor" BIGINT NOT NULL,
  "currency" TEXT NOT NULL,
  "nonce" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "decisionReason" TEXT,
  "paypalOrderId" TEXT,
  "paypalCaptureId" TEXT,
  "createdRecordAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityId" TEXT,
  "message" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebhookEvent" (
  "id" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentIntent_nonce_key" ON "PaymentIntent"("nonce");
CREATE INDEX "PaymentIntent_agentId_idx" ON "PaymentIntent"("agentId");
CREATE INDEX "PaymentIntent_status_idx" ON "PaymentIntent"("status");
ALTER TABLE "PaymentIntent" ADD CONSTRAINT "PaymentIntent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
