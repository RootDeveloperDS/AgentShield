"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import type { ColDef, GridApi, GridReadyEvent } from "ag-grid-community";
import { agentShieldDarkTheme } from "./AgGridRegistry";

export interface AuditRecord {
  id: string;
  eventType: string;
  entityId?: string | null;
  message: string;
  createdAt: string;
}

interface AuditGridProps {
  apiBaseUrl?: string;
}

export function AuditGrid({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
}: AuditGridProps) {
  const gridRef = useRef<AgGridReact<AuditRecord>>(null);
  const [gridApi, setGridApi] = useState<GridApi<AuditRecord> | null>(null);
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [quickFilter, setQuickFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAuditEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/audit`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
      }
    } catch {
      // Backend unavailable
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchAuditEvents();
    if (!autoRefresh) return;
    const interval = setInterval(fetchAuditEvents, 5000);
    return () => clearInterval(interval);
  }, [fetchAuditEvents, autoRefresh]);

  const onGridReady = useCallback((params: GridReadyEvent<AuditRecord>) => {
    setGridApi(params.api);
    params.api.sizeColumnsToFit();
  }, []);

  const handleExportCsv = useCallback(() => {
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `agentshield_audit_trail_${Date.now()}.csv`
      });
    }
  }, [gridApi]);

  const filteredData = useMemo(() => {
    if (categoryFilter === "ALL") return events;
    return events.filter((e) => {
      const type = (e.eventType || "").toUpperCase();
      if (categoryFilter === "POLICY") return type.includes("POLICY");
      if (categoryFilter === "CRYPTO") return type.includes("SIGNATURE") || type.includes("CHALLENGE") || type.includes("NONCE");
      if (categoryFilter === "WEBHOOK") return type.includes("WEBHOOK") || type.includes("PAYPAL");
      return true;
    });
  }, [events, categoryFilter]);

  const columnDefs = useMemo<ColDef<AuditRecord>[]>(() => {
    return [
      {
        headerName: "Timestamp",
        field: "createdAt",
        minWidth: 170,
        sort: "desc",
        valueFormatter: (params) => {
          if (!params.value) return "—";
          const d = new Date(params.value);
          return isNaN(d.getTime()) ? String(params.value) : d.toLocaleString();
        }
      },
      {
        headerName: "Event Type",
        field: "eventType",
        minWidth: 220,
        cellRenderer: (params: any) => {
          const type = params.value || "";
          let badgeClass = "badge-sky";
          if (type.includes("DENIED") || type.includes("FAILED") || type.includes("REJECT") || type.includes("REPLAY")) {
            badgeClass = "badge-rose";
          } else if (type.includes("COMPLETED") || type.includes("VERIFIED") || type.includes("SUCCESS")) {
            badgeClass = "badge-emerald";
          } else if (type.includes("REVIEW") || type.includes("WARNING")) {
            badgeClass = "badge-amber";
          }

          return <span className={`badge ${badgeClass}`}>{type}</span>;
        }
      },
      {
        headerName: "Entity / Intent ID",
        field: "entityId",
        minWidth: 180,
        cellRenderer: (params: any) => (
          <span style={{ fontFamily: "monospace", color: "#9cb5d9" }}>
            {params.value || "SYSTEM"}
          </span>
        )
      },
      {
        headerName: "Audit Message & Context",
        field: "message",
        flex: 2,
        minWidth: 320,
        cellRenderer: (params: any) => (
          <span style={{ color: "#e2e8f0" }}>{params.value}</span>
        )
      }
    ];
  }, []);

  return (
    <div className="grid-container">
      <div className="grid-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <h2>Zero-Trust Cryptographic Audit Trail</h2>
          <span className="badge badge-sky">{filteredData.length} Events</span>
        </div>

        <div className="grid-actions">
          {/* Category Filter Tabs */}
          <div style={{ display: "inline-flex", background: "#08111e", padding: 3, borderRadius: 8, border: "1px solid #1c2e44" }}>
            {[
              { id: "ALL", label: "All" },
              { id: "CRYPTO", label: "Cryptographic" },
              { id: "POLICY", label: "Policy Engine" },
              { id: "WEBHOOK", label: "PayPal Webhooks" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCategoryFilter(tab.id)}
                style={{
                  background: categoryFilter === tab.id ? "#112036" : "transparent",
                  color: categoryFilter === tab.id ? "#38bdf8" : "#8da6c7",
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
              placeholder="Search audit trail..."
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              style={{ margin: 0, padding: "6px 12px", fontSize: 12.5 }}
            />
          </div>

          {/* Export to CSV (AG Grid Bounty Feature) */}
          <button className="button-secondary button-sm" onClick={handleExportCsv} title="Export audit trail to CSV">
            📥 CSV Export
          </button>

          {/* Manual Refresh */}
          <button
            className="button-secondary button-sm"
            onClick={fetchAuditEvents}
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
      <div style={{ height: 460, width: "100%" }}>
        <AgGridReact<AuditRecord>
          ref={gridRef}
          theme={agentShieldDarkTheme}
          rowData={filteredData}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true
          }}
          pagination={true}
          paginationPageSize={15}
          paginationPageSizeSelector={[15, 30, 50]}
          quickFilterText={quickFilter}
          onGridReady={onGridReady}
          animateRows={true}
          overlayNoRowsTemplate="<div style='background: #0b1524; color: #9cb5d9; padding: 20px; border-radius: 8px; font-size: 13.5px;'>No audit events recorded yet.</div>"
        />
      </div>
    </div>
  );
}
