"use client";

import React, { useState } from "react";
import { TransactionRecord } from "./TransactionDetailModal";

interface HumanApprovalModalProps {
  transaction: TransactionRecord | null;
  onClose: () => void;
  onDecision: (id: string, approved: boolean) => Promise<void>;
}

export function HumanApprovalModal({
  transaction,
  onClose,
  onDecision
}: HumanApprovalModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!transaction) return null;

  const amountNumeric = Number(transaction.amountMinor) / 100;
  const formattedAmount = `$${amountNumeric.toFixed(2)} ${transaction.currency || "USD"}`;

  const handleDecision = async (approved: boolean) => {
    try {
      setSubmitting(true);
      await onDecision(transaction.id, approved);
      onClose();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3>Human Security Officer Sign-Off</h3>
            <span className="badge badge-amber">ESCALATED FOR APPROVAL</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          <p className="subtitle" style={{ margin: "0 0 16px" }}>
            This autonomous transaction exceeded the automated approval threshold of{" "}
            <strong>$100.00 USD</strong>. A human security officer must inspect and authorize the payment.
          </p>

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
              <span className="detail-label">Requested Amount</span>
              <span className="detail-value" style={{ color: "#fbbf24", fontSize: 16 }}>
                {formattedAmount}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Escalation Reason</span>
              <span className="detail-value" style={{ color: "#fb7185" }}>
                {transaction.decisionReason || "Exceeds automated approval limit"}
              </span>
            </div>
          </div>

          <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)", padding: 12, borderRadius: 8, fontSize: 12.5, color: "#fef3c7" }}>
            ⚠️ <strong>Action Required:</strong> Approving will execute the payment order via PayPal Sandbox REST API and record a signed administrative authorization in the PostgreSQL audit log.
          </div>

          {feedback && (
            <p style={{ color: "#fb7185", fontSize: 13, marginTop: 12 }}>
              {feedback}
            </p>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="button-danger"
            disabled={submitting}
            onClick={() => handleDecision(false)}
          >
            {submitting ? "Processing…" : "Reject Intent"}
          </button>
          <button
            className="button-primary"
            disabled={submitting}
            onClick={() => handleDecision(true)}
          >
            {submitting ? "Executing Payment…" : "Authorize & Execute Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
