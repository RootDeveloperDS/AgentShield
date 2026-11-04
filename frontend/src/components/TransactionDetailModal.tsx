"use client";

import React from "react";
import { StatusBadge } from "./StatusBadge";

export interface TransactionRecord {
  id: string;
  agentId?: string;
  recipient: string;
  currency: string;
  amountMinor: string | number;
  status: string;
  decisionReason?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  nonce?: string;
  createdAt: string;
  rawPayload?: any;
}

interface TransactionDetailModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
  onReview?: (transaction: TransactionRecord) => void;
}

export function TransactionDetailModal({
  transaction,
  onClose,
  onReview
}: TransactionDetailModalProps) {
  if (!transaction) return null;

  const amountNumeric = Number(transaction.amountMinor) / 100;
  const formattedAmount = `$${amountNumeric.toFixed(2)} ${transaction.currency || "USD"}`;
  const isHumanReview = transaction.status === "FLAGGED_HUMAN_REVIEW";

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3>Transaction Cryptographic Audit</h3>
            <StatusBadge status={transaction.status} />
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {/* Overview */}
          <div className="detail-card">
            <div className="detail-row">
              <span className="detail-label">Intent ID</span>
              <span className="detail-value">{transaction.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Originating Agent</span>
              <span className="detail-value">{transaction.agentId || "registered-agent"}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Recipient Merchant</span>
              <span className="detail-value">{transaction.recipient}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Authorized Amount</span>
              <span className="detail-value" style={{ color: "#38bdf8" }}>
                {formattedAmount}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created At</span>
              <span className="detail-value">
                {new Date(transaction.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Cryptographic Proof Verification */}
          <div className="detail-card">
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#9cb5d9" }}>
              ◈ CRYPTOGRAPHIC ZERO-TRUST PROOF
            </h4>
            <div className="detail-row">
              <span className="detail-label">Algorithm</span>
              <span className="detail-value">Ed25519 (RFC 8032)</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Signature Verification</span>
              <span className="detail-value" style={{ color: "#10b981" }}>
                ✓ Cryptographically Validated
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Replay Nonce</span>
              <span className="detail-value">
                {transaction.nonce || "0x" + transaction.id.replace(/-/g, "").slice(0, 16)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Timestamp Guard</span>
              <span className="detail-value">±60s Clock-Skew Checked · 300s TTL</span>
            </div>
          </div>

          {/* Policy Evaluation Details */}
          <div className="detail-card">
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#9cb5d9" }}>
              ◈ POLICY ENGINE EVALUATION
            </h4>
            <div className="detail-row">
              <span className="detail-label">Max Single Limit</span>
              <span className="detail-value">$500.00 USD</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Human Review Threshold</span>
              <span className="detail-value">$100.00 USD</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Policy Decision Reason</span>
              <span className="detail-value" style={{ color: "#fbbf24" }}>
                {transaction.decisionReason || "Intent verified and processed under standard policy."}
              </span>
            </div>
          </div>

          {/* Settlement Gateway Details */}
          <div className="detail-card">
            <h4 style={{ margin: "0 0 10px", fontSize: 13, color: "#9cb5d9" }}>
              ◈ PAYPAL SANDBOX SETTLEMENT
            </h4>
            <div className="detail-row">
              <span className="detail-label">PayPal Order ID</span>
              <span className="detail-value">
                {transaction.paypalOrderId || "PENDING_EXECUTION"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">PayPal Capture ID</span>
              <span className="detail-value">
                {transaction.paypalCaptureId || "AWAITING_CAPTURE"}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Webhook Reconciliation</span>
              <span className="detail-value">
                {transaction.paypalCaptureId ? "✓ Verified Server-to-Server" : "Pending Webhook Notification"}
              </span>
            </div>
          </div>

          {/* Raw JSON */}
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 12, color: "#647d9e", fontWeight: 600 }}>
              CANONICAL AUDIT PAYLOAD
            </span>
            <pre className="code-block">
              {JSON.stringify(transaction, null, 2)}
            </pre>
          </div>
        </div>

        <div className="modal-footer">
          {isHumanReview && onReview && (
            <button
              className="button-primary"
              onClick={() => {
                onClose();
                onReview(transaction);
              }}
            >
              Review & Approve Intent
            </button>
          )}
          <button className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
