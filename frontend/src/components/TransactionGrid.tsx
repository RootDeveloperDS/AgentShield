"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { agentShieldDarkTheme } from "./AgGridRegistry";
import { StatusBadge } from "./StatusBadge";
import { TransactionRecord, TransactionDetailModal } from "./TransactionDetailModal";
import { HumanApprovalModal } from "./HumanApprovalModal";

interface TransactionGridProps {
  initialData?: TransactionRecord[];
  apiBaseUrl?: string;
}

export function TransactionGrid({
  initialData = [],
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
}: TransactionGridProps) {
  const gridRef = useRef<AgGridReact<TransactionRecord>>(null);
  const [gridApi, setGridApi] = useState<GridApi<TransactionRecord> | null>(null);
  const [rowData, setRowData] = useState<TransactionRecord[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRecord | null>(null);
  const [reviewingTransaction, setReviewingTransaction] = useState<TransactionRecord | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/transactions`);
      if (res.ok) {
        const data = await res.json();
        setRowData(data);
      }
    } catch {
      // Backend might be offline or starting up
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchTransactions();
    if (!autoRefresh) return;
    const interval = setInterval(fetchTransactions, 5000);
    return () => clearInterval(interval);
  }, [fetchTransactions, autoRefresh]);

  const onGridReady = useCallback((params: GridReadyEvent<TransactionRecord>) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

  const handleExportCsv = useCallback(() => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `agentshield_transactions_${Date.now()}.csv`
      });
    }
  }, [gridApi]);

  const handleDecision = async (id: string, approved: boolean) => {
    const res = await fetch(`${apiBaseUrl}/api/approvals/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved })
    });
    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || result.message || "Approval decision failed");
    }
    await fetchTransactions();
  };

  const filteredData = useMemo(() => {
    if (statusFilter === "ALL") return rowData;
    return rowData.filter((item) => (item.status || "").toUpperCase() === statusFilter);
  }, [rowData, statusFilter]);

  const columnDefs = useMemo<ColDef<TransactionRecord>[]>(() => {
    return [
      {
        headerName: "Intent ID",
        field: "id",
        minWidth: 170,
        cellRenderer: (params: any) => {
          if (!params.value) return "—";
          return (
            <button
              onClick={() => setSelectedTransaction(params.data)}
              style={{
                background: "transparent",
                border: 0,
                color: "#38bdf8",
                cursor: "pointer",
                padding: 0,
                fontFamily: "monospace",
                fontWeight: 600,
                textAlign: "left",
                textDecoration: "underline"
              }}
              title="Click to view cryptographic audit details"
            >
              {params.value.slice(0, 16)}…
            </button>
          );
        }
      },
      {
        headerName: "Status",
        field: "status",
        minWidth: 170,
        cellRenderer: (params: any) => <StatusBadge status={params.value} />
      },
      {
        headerName: "Agent ID",
        field: "agentId",
        minWidth: 150,
        cellRenderer: (params: any) => (
          <span style={{ fontFamily: "monospace", color: "#9cb5d9" }}>
            {params.value || "registered-agent"}
          </span>
        )
      },
      {
        headerName: "Recipient",
        field: "recipient",
        minWidth: 190,
        cellRenderer: (params: any) => (
          <span style={{ fontFamily: "monospace", color: "#cbd5e1" }}>
            {params.value}
          </span>
        )
      },
      {
        headerName: "Amount",
        field: "amountMinor",
        minWidth: 130,
        valueFormatter: (params) => {
          if (!params.value && params.value !== 0) return "—";
          const numeric = Number(params.value) / 100;
          return `$${numeric.toFixed(2)} ${params.data?.currency || "USD"}`;
        },
        cellStyle: { fontWeight: "700", color: "#fff" }
      },
      {
        headerName: "Created",
        field: "createdAt",
        minWidth: 160,
        valueFormatter: (params) => {
          if (!params.value) return "—";
          const d = new Date(params.value);
          return isNaN(d.getTime()) ? String(params.value) : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        }
      },
      {
        headerName: "Actions",
        minWidth: 160,
        sortable: false,
        filter: false,
        cellRenderer: (params: any) => {
          const item = params.data as TransactionRecord;
          if (!item) return null;
          const isReview = item.status === "FLAGGED_HUMAN_REVIEW";

          return (
            <div style={{ display: "flex", gap: 6, alignItems: "center", height: "100%" }}>
              <button
                className="button-secondary button-sm"
                onClick={() => setSelectedTransaction(item)}
              >
                Inspect
              </button>
              {isReview && (
                <button
                  className="button-primary button-sm"
                  style={{ background: "#d97706" }}
                  onClick={() => setReviewingTransaction(item)}
                >
                  Review
                </button>
              )}
            </div>
          );
        }
      }
    ];
  }, []);

  return (
    <div className="grid-container">
      <div className="grid-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2>Live Verified Transaction Ledger</h2>
          <span className="badge badge-sky">{filteredData.length} Records</span>
        </div>

        <div className="grid-actions">
          {/* Status Quick Filter Tabs */}
          <div style={{ display: "inline-flex", background: "#08111e", padding: 3, borderRadius: 8, border: "1px solid #1c2e44" }}>
            {[
              { id: "ALL", label: "All" },
              { id: "COMPLETED", label: "Completed" },
              { id: "FLAGGED_HUMAN_REVIEW", label: "Review" },
              { id: "REJECTED_POLICY", label: "Rejected" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: statusFilter === tab.id ? "#112036" : "transparent",
                  color: statusFilter === tab.id ? "#38bdf8" : "#8da6c7",
                  border: 0,
                  borderRadius: 6,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Filter Search */}
          <div className="grid-search">
            <input
              type="text"
              className="input-text"
              placeholder="Search by intent, agent, recipient..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{ margin: 0, padding: "6px 12px", fontSize: 12.5 }}
            />
          </div>

          {/* Export to CSV (AG Grid Bounty Feature) */}
          <button className="button-secondary button-sm" onClick={handleExportCsv} title="Export current grid to CSV">
            📥 CSV Export
          </button>

          {/* Manual Refresh */}
          <button
            className="button-secondary button-sm"
            onClick={fetchTransactions}
            disabled={loading}
          >
            {loading ? "⟳ Loading…" : "⟳ Refresh"}
          </button>

          {/* Auto Refresh Toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#8da6c7", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ width: "auto", margin: 0 }}
            />
            Live 5s Polling
          </label>
        </div>
      </div>

      {/* AG Grid Component */}
      <div style={{ height: 440, width: "100%" }}>
        <AgGridReact<TransactionRecord>
          ref={gridRef}
          theme={agentShieldDarkTheme}
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            flex: 1
          }}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          quickFilterText={quickFilter}
          onGridReady={onGridReady}
          rowSelection="single"
          animateRows={true}
          overlayNoRowsTemplate="<div style='background: #0b1524; color: #9cb5d9; padding: 20px; border-radius: 8px; font-size: 13.5px;'>No transactions recorded yet. Register an agent and submit an intent to begin testing.</div>"
        />
      </div>

      {/* Modals */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onReview={(tx) => setReviewingTransaction(tx)}
      />

      <HumanApprovalModal
        transaction={reviewingTransaction}
        onClose={() => setReviewingTransaction(null)}
        onDecision={handleDecision}
      />
    </div>
  );
}
