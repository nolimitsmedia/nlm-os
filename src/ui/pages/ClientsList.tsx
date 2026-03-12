// apps/web/src/ui/pages/ClientsList.tsx
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient, fetchClients, type Client } from "../../api";
import { Link, useSearchParams } from "react-router-dom";
import "./ClientsList.css";

function Modal({
  open,
  title,
  subtitle,
  children,
  onClose,
  busy = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (busy) return;
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div
      className="nlmModalOverlay"
      onMouseDown={() => {
        if (busy) return;
        onClose();
      }}
      aria-hidden="true"
    >
      <div
        className="nlmModal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="nlmModalHeader">
          <div>
            <div className="nlmModalTitle">{title}</div>
            {subtitle ? <div className="nlmModalSub">{subtitle}</div> : null}
          </div>

          <button
            className="nlmIconBtn"
            onClick={() => {
              if (busy) return;
              onClose();
            }}
            aria-label="Close"
            title={busy ? "Saving…" : "Close"}
            style={{
              opacity: busy ? 0.6 : 1,
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div className="nlmModalBody">{children}</div>
      </div>
    </div>
  );
}

type ClientStatus = "active" | "at_risk" | "inactive";
type ClientSourceFilter = "all" | "whmcs" | "local";

function money(value: any) {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function getClientSource(client: Partial<Client>): "whmcs" | "local" {
  return client.whmcs_client_id ? "whmcs" : "local";
}

function getSourceLabel(client: Partial<Client>) {
  return getClientSource(client) === "whmcs"
    ? "WHMCS Synced"
    : "Local / Manual";
}

export default function ClientsList() {
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const wantNew = params.get("new") === "1";
  const sourceFilter = (params.get("src") || "all") as ClientSourceFilter;

  const qc = useQueryClient();

  const {
    data: clients = [],
    isLoading,
    isError,
  } = useQuery<Client[]>({
    queryKey: ["clients", q],
    queryFn: () => fetchClients(q),
  });

  const [newName, setNewName] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<ClientStatus>("active");
  const [formError, setFormError] = React.useState("");
  const nameRef = React.useRef<HTMLInputElement | null>(null);

  const createMut = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });

      setNewName("");
      setNewStatus("active");
      setFormError("");

      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e: any) => {
      setFormError(e?.message || "Failed to create client");
    },
  });

  function closeModal() {
    if (createMut.isPending) return;
    const next = new URLSearchParams(params);
    next.delete("new");
    setParams(next, { replace: true });
  }

  React.useEffect(() => {
    if (!wantNew) return;

    setFormError("");
    setNewName("");
    setNewStatus("active");

    setTimeout(() => nameRef.current?.focus(), 0);
  }, [wantNew]);

  function submitCreate() {
    if (createMut.isPending) return;

    const name = newName.trim();
    if (!name) {
      setFormError("Client name is required.");
      return;
    }

    setFormError("");
    createMut.mutate({ name, status: newStatus });
  }

  const [localQ, setLocalQ] = React.useState(q);

  React.useEffect(() => {
    setLocalQ(q);
  }, [q]);

  React.useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params);

      const cleaned = localQ.trim();
      if (cleaned) next.set("q", cleaned);
      else next.delete("q");

      setParams(next, { replace: true });
    }, 250);

    return () => clearTimeout(t);
  }, [localQ, params, setParams]);

  function openCreateModal() {
    const next = new URLSearchParams(params);
    next.set("new", "1");
    setParams(next, { replace: true });
  }

  function clearSearch() {
    setLocalQ("");
  }

  function setSourceFilterValue(value: ClientSourceFilter) {
    const next = new URLSearchParams(params);
    if (value === "all") next.delete("src");
    else next.set("src", value);
    setParams(next, { replace: true });
  }

  const counts = React.useMemo(() => {
    const total = clients.length;
    const whmcs = clients.filter((c) => getClientSource(c) === "whmcs").length;
    const local = clients.filter((c) => getClientSource(c) === "local").length;
    const active = clients.filter(
      (c) => String(c.status || "active") === "active",
    ).length;
    return { total, whmcs, local, active };
  }, [clients]);

  const filteredClients = React.useMemo(() => {
    if (sourceFilter === "all") return clients;
    return clients.filter((c) => getClientSource(c) === sourceFilter);
  }, [clients, sourceFilter]);

  return (
    <div className="nlmClientsPage">
      <div className="nlmClientsHeader">
        <div>
          <h1 className="h1">Clients</h1>
          <div className="nlmClientsSub">
            Open a client to view Client 360, billing, tickets, projects, and
            more.
          </div>
        </div>

        <div className="nlmClientsActions">
          <div className="nlmSearchWrap">
            <span className="nlmSearchIcon">⌕</span>
            <input
              className="nlmSearch"
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              placeholder="Search clients, email, WHMCS ID…"
              aria-label="Search clients"
            />
            {localQ.trim() ? (
              <button
                className="nlmSearchClear"
                onClick={clearSearch}
                title="Clear"
              >
                ✕
              </button>
            ) : null}
          </div>

          <button className="nlmNewClientBtn" onClick={openCreateModal}>
            + New Client
          </button>
        </div>
      </div>

      {!isLoading && !isError ? (
        <>
          <div className="nlmClientsSummaryRow">
            <div className="nlmStatCard">
              <div className="nlmStatLabel">Total Clients</div>
              <div className="nlmStatValue">{counts.total}</div>
            </div>
            <div className="nlmStatCard">
              <div className="nlmStatLabel">WHMCS Synced</div>
              <div className="nlmStatValue">{counts.whmcs}</div>
            </div>
            <div className="nlmStatCard">
              <div className="nlmStatLabel">Local / Manual</div>
              <div className="nlmStatValue">{counts.local}</div>
            </div>
            <div className="nlmStatCard">
              <div className="nlmStatLabel">Active</div>
              <div className="nlmStatValue">{counts.active}</div>
            </div>
          </div>

          <div className="nlmFilterBar">
            <div
              className="nlmFilterGroup"
              role="tablist"
              aria-label="Client source filters"
            >
              <button
                className={`nlmFilterChip ${sourceFilter === "all" ? "isActive" : ""}`}
                onClick={() => setSourceFilterValue("all")}
                type="button"
              >
                All Clients <span>{counts.total}</span>
              </button>
              <button
                className={`nlmFilterChip ${sourceFilter === "whmcs" ? "isActive" : ""}`}
                onClick={() => setSourceFilterValue("whmcs")}
                type="button"
              >
                WHMCS Synced <span>{counts.whmcs}</span>
              </button>
              <button
                className={`nlmFilterChip ${sourceFilter === "local" ? "isActive" : ""}`}
                onClick={() => setSourceFilterValue("local")}
                type="button"
              >
                Local / Manual <span>{counts.local}</span>
              </button>
            </div>

            <div className="nlmFilterNote">
              Best view: show all clients, then visually label WHMCS-synced and
              local records.
            </div>
          </div>
        </>
      ) : null}

      {isLoading && <div className="nlmHint">Loading clients…</div>}
      {isError && <div className="nlmHint">Failed to load clients.</div>}

      {!isLoading && !isError && filteredClients.length === 0 ? (
        <div className="nlmEmpty">
          <div className="nlmEmptyTitle">No clients found</div>
          <div className="nlmEmptySub">
            Try a different search or filter, or create a new client profile.
          </div>
          <div style={{ height: 10 }} />
          <button className="nlmNewClientBtn" onClick={openCreateModal}>
            + Create your first client
          </button>
        </div>
      ) : (
        <div className="grid">
          {filteredClients.map((c) => {
            const source = getClientSource(c);
            const sourceLabel = getSourceLabel(c);
            const status = String(c.status || "active");

            return (
              <Link key={c.id} to={`/clients/${c.id}`} className="clientCard">
                <div className="clientTopRow">
                  <div className="clientIdentityWrap">
                    <div className="clientName">{c.name}</div>
                    <div className="clientMeta">
                      {(c.whmcs_client_id
                        ? `WHMCS #${c.whmcs_client_id}`
                        : "Client 360") +
                        (c.whmcs_email ? ` • ${c.whmcs_email}` : " →")}
                    </div>
                  </div>

                  <div className={`pill ${status}`}>
                    {status.replace("_", " ")}
                  </div>
                </div>

                <div className="clientBadgeRow">
                  <span className={`clientSourceBadge ${source}`}>
                    {sourceLabel}
                  </span>
                  {c.whmcs_email ? (
                    <span className="clientMiniBadge">Billing Linked</span>
                  ) : null}
                </div>

                <div className="clientStatsRow">
                  <div className="clientStatBox">
                    <span className="clientStatLabel">MRR</span>
                    <strong>{money(c.mrr ?? 0)}</strong>
                  </div>
                  <div className="clientStatBox">
                    <span className="clientStatLabel">Balance</span>
                    <strong>{money(c.balance_due ?? 0)}</strong>
                  </div>
                  <div className="clientStatBox">
                    <span className="clientStatLabel">Open Inv</span>
                    <strong>{Number(c.open_invoices ?? 0)}</strong>
                  </div>
                  <div className="clientStatBox">
                    <span className="clientStatLabel">Services</span>
                    <strong>{Number(c.active_services ?? 0)}</strong>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={wantNew}
        title="Create new client"
        subtitle="Add a new organization to Client 360"
        onClose={closeModal}
        busy={createMut.isPending}
      >
        <div className="nlmFormGrid">
          <label className="nlmField">
            <span className="nlmLabel">Client name</span>
            <input
              ref={nameRef}
              className="nlmInput"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitCreate();
              }}
              placeholder="e.g. Acme Dental Group"
              autoFocus
              disabled={createMut.isPending}
            />
          </label>

          <label className="nlmField">
            <span className="nlmLabel">Status</span>
            <select
              className="nlmSelect"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as ClientStatus)}
              disabled={createMut.isPending}
            >
              <option value="active">Active</option>
              <option value="at_risk">At Risk</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          {formError ? <div className="nlmError">{formError}</div> : null}

          <div className="nlmModalFooter">
            <button
              className="nlmBtnSecondary"
              onClick={closeModal}
              disabled={createMut.isPending}
            >
              Cancel
            </button>

            <button
              className="nlmBtnPrimary"
              onClick={submitCreate}
              disabled={createMut.isPending || !newName.trim()}
            >
              {createMut.isPending ? "Creating…" : "Create client"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
