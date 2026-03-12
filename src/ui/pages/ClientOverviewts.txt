// apps/web/src/ui/pages/ClientOverview.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchClientOverview,
  fetchTasks,
  fetchSops,
  createTask,
  createSop,
  fetchTaskAssignees,
  uploadTaskAttachments,
  type ClickUpAssignee,
} from "../../api";
import Toast from "../components/Toast";
import "../components/Toast.css";
import "./ClientOverview.css";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="statCard">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
    </div>
  );
}

type ToastState = {
  open: boolean;
  type: "success" | "error" | "info";
  message: string;
};

type NewTaskState = {
  title: string;
  description: string;
  assigneeId: string;
  files: File[];
};

const EMPTY_TOAST: ToastState = {
  open: false,
  type: "info",
  message: "",
};

const EMPTY_NEW_TASK: NewTaskState = {
  title: "",
  description: "",
  assigneeId: "",
  files: [],
};

function getAssigneeLabel(item: ClickUpAssignee) {
  return item.displayName || item.username || item.email || "Unassigned";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function ClientOverview() {
  const { clientId = "" } = useParams();
  const qc = useQueryClient();

  const [newTask, setNewTask] = useState<NewTaskState>(EMPTY_NEW_TASK);
  const [sopTitle, setSopTitle] = useState("");
  const [sopUrl, setSopUrl] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [toast, setToast] = useState<ToastState>(EMPTY_TOAST);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [addTaskUploadProgress, setAddTaskUploadProgress] = useState(0);

  const showToast = (
    type: ToastState["type"],
    message: string,
    sticky = false,
  ) => {
    setToast({ open: true, type, message });

    if (!sticky) {
      window.clearTimeout((showToast as any)._timer);
      (showToast as any)._timer = window.setTimeout(() => {
        setToast(EMPTY_TOAST);
      }, 3200);
    }
  };

  useEffect(() => {
    return () => {
      window.clearTimeout((showToast as any)._timer);
    };
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-overview", clientId],
    queryFn: () => fetchClientOverview(clientId),
    enabled: !!clientId,
  });

  const tasksQ = useQuery({
    queryKey: ["tasks", clientId],
    queryFn: () => fetchTasks(clientId),
    enabled: !!clientId,
    refetchInterval: clientId ? 8000 : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    staleTime: 2000,
  });

  const assigneesQ = useQuery({
    queryKey: ["task-assignees", clientId],
    queryFn: () => fetchTaskAssignees(clientId),
    enabled: !!clientId && isTaskDrawerOpen,
    staleTime: 60_000,
  });

  const sopsQ = useQuery({
    queryKey: ["sops", clientId],
    queryFn: () => fetchSops(clientId),
    enabled: !!clientId,
  });

  const s = data?.summary || {
    mrr: 0,
    balance_due: 0,
    open_invoices: 0,
    overdue_invoices: 0,
    active_services: 0,
  };

  const billing = data?.health?.billing || "unknown";
  const riskScore = data?.health?.riskScore ?? 0;

  const tasks = useMemo(() => (tasksQ.data as any)?.tasks || [], [tasksQ.data]);
  const assignees = useMemo(() => assigneesQ.data || [], [assigneesQ.data]);
  const sops = useMemo(() => (sopsQ.data as any)?.sops || [], [sopsQ.data]);

  const totalTasks = tasks.length;
  const openTaskCount = tasks.filter((t: any) => {
    const status = String(t?.status || "")
      .trim()
      .toLowerCase();
    return !["complete", "completed", "closed"].includes(status);
  }).length;

  async function refreshTasks() {
    await qc.invalidateQueries({ queryKey: ["tasks", clientId] });
  }

  function openTaskDrawer() {
    setTaskError("");
    setAddTaskUploadProgress(0);
    setIsTaskDrawerOpen(true);
  }

  function closeTaskDrawer() {
    if (isAddingTask) return;
    setTaskError("");
    setAddTaskUploadProgress(0);
    setNewTask(EMPTY_NEW_TASK);
    setIsTaskDrawerOpen(false);
  }

  function onTaskFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setNewTask((prev) => ({ ...prev, files: [...prev.files, ...files] }));
    event.target.value = "";
  }

  function removePendingTaskFile(index: number) {
    setNewTask((prev) => ({
      ...prev,
      files: prev.files.filter((_, idx) => idx !== index),
    }));
  }

  async function onAddTask() {
    const title = newTask.title.trim();
    if (!title || isAddingTask) return;

    setIsAddingTask(true);
    setTaskError("");
    setAddTaskUploadProgress(newTask.files.length ? 1 : 0);

    try {
      const selectedAssignee = assignees.find(
        (item) => String(item.id) === String(newTask.assigneeId || ""),
      );

      const created = await createTask({
        clientId,
        title,
        description: newTask.description.trim() || undefined,
        assigneeId: newTask.assigneeId || undefined,
        assignee: selectedAssignee
          ? getAssigneeLabel(selectedAssignee)
          : undefined,
      });

      const taskId =
        (created as any)?.task?.id ||
        (created as any)?.task?.clickup_task_id ||
        (created as any)?.id;

      let uploadMessageShown = false;

      if (taskId && newTask.files.length) {
        const uploadResult = await uploadTaskAttachments(
          taskId,
          newTask.files,
          {
            onProgress: setAddTaskUploadProgress,
          },
        );

        if (uploadResult?.warning) {
          showToast("info", uploadResult.warning, true);
          uploadMessageShown = true;
        } else if (uploadResult?.message) {
          showToast("success", uploadResult.message);
          uploadMessageShown = true;
        }
      }

      setNewTask(EMPTY_NEW_TASK);
      setIsTaskDrawerOpen(false);
      setAddTaskUploadProgress(0);

      if (!uploadMessageShown) {
        showToast("success", "Task added and synced successfully.");
      }

      await refreshTasks();
    } catch (e: any) {
      const message = e?.message || "Failed to create task.";
      setTaskError(message);
      showToast("error", message, true);
    } finally {
      setIsAddingTask(false);
    }
  }

  async function onAddSop() {
    const title = sopTitle.trim();
    const url = sopUrl.trim();
    if (!title || !url) return;

    await createSop({ clientId, title, url });

    setSopTitle("");
    setSopUrl("");

    await qc.invalidateQueries({ queryKey: ["sops", clientId] });
  }

  if (isLoading) return <div>Loading overview…</div>;
  if (isError) return <div>Failed to load overview.</div>;

  return (
    <>
      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(EMPTY_TOAST)}
      />

      <div className="overview">
        <div
          className="c360OverviewHeaderRow"
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.68,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              alignSelf: "center",
            }}
          >
            Billing Overview
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              className="statCard c360CompactStatCard"
              style={{ minWidth: 126 }}
            >
              <div className="statLabel">Billing Status</div>
              <div
                className="statValue"
                style={{ textTransform: "capitalize" }}
              >
                {billing}
              </div>
            </div>
            <div
              className="statCard c360CompactStatCard"
              style={{ minWidth: 126 }}
            >
              <div className="statLabel">Active Services</div>
              <div className="statValue">
                {Number((s as any).active_services ?? 0)}
              </div>
            </div>
          </div>
        </div>

        <div className="statsRow c360StatsRowCompact">
          <StatCard label="MRR" value={`$${Number(s.mrr).toLocaleString()}`} />
          <StatCard
            label="Balance Due"
            value={`$${Number(s.balance_due).toLocaleString()}`}
          />
          <StatCard label="Open Invoices" value={Number(s.open_invoices)} />
          <StatCard label="Overdue" value={Number(s.overdue_invoices)} />
        </div>

        <div className="grid2">
          <div className="panel">
            <div className="panelTitleRow">
              <div className="panelTitle">Billing Snapshot</div>
            </div>

            <div className="panelSub">
              Status: <b>{billing}</b> • Risk Score: <b>{riskScore}</b>
              {data?.note ? (
                <span style={{ display: "block", marginTop: 6, opacity: 0.8 }}>
                  {data.note}
                </span>
              ) : null}
            </div>

            <div className="panelBodyPlaceholder" />
          </div>

          <div className="panel">
            <div className="panelTitleRow">
              <div className="panelTitle">Timeline</div>
            </div>

            <div className="panelSub">Recent billing events</div>

            <div style={{ display: "grid", gap: 10, padding: "0 14px 14px" }}>
              {(data?.timeline || []).map((t: any) => (
                <div
                  key={t.id}
                  style={{
                    border: "1px solid var(--border)",
                    background: "var(--panel2)",
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <div style={{ fontWeight: 800 }}>{t.type}</div>
                  <div style={{ opacity: 0.75, fontSize: 12 }}>{t.when}</div>
                  <div style={{ marginTop: 6 }}>{t.note}</div>
                </div>
              ))}

              {!data?.timeline?.length && (
                <div style={{ opacity: 0.7 }}>No timeline events yet.</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panelTitleRow">
              <div className="panelTitle">Tasks</div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  {(tasksQ.data as any)?.provider
                    ? String((tasksQ.data as any).provider)
                    : ""}
                </div>

                <Link
                  to={`/clients/${clientId}/tasks`}
                  style={{
                    textDecoration: "none",
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(1,44,86,0.16)",
                    background: "#fff",
                    color: "#012c56",
                    fontWeight: 800,
                    fontSize: 12,
                  }}
                >
                  View All Tasks
                </Link>
              </div>
            </div>

            <div className="panelSub">
              ClickUp-connected task overlay
              <span style={{ marginLeft: 8, opacity: 0.75 }}>
                {tasksQ.isFetching ? "• Syncing…" : "• Auto-sync every 8s"}
              </span>
            </div>

            <div style={{ padding: "0 14px 14px", display: "grid", gap: 12 }}>
              <div className="overviewTaskSubRow">
                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Note: creating tasks requires login (Module 6).
                </div>

                <button
                  type="button"
                  className="overviewAddTaskBtn"
                  onClick={openTaskDrawer}
                  disabled={isAddingTask}
                >
                  {isAddingTask ? "Adding…" : "Add Task"}
                </button>
              </div>

              {!!taskError && (
                <div style={{ fontSize: 12, color: "#b42318" }}>
                  {taskError}
                </div>
              )}

              <div
                style={{
                  border: "1px solid var(--border)",
                  background: "var(--panel2)",
                  borderRadius: 14,
                  padding: 14,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      Task workspace
                    </div>
                    <div style={{ opacity: 0.72, fontSize: 13, marginTop: 4 }}>
                      View, search, filter, update, and manage all client tasks
                      on the dedicated Tasks page.
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "#fff",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#012c56",
                      }}
                    >
                      Total: {totalTasks}
                    </div>

                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "#fff",
                        border: "1px solid var(--border)",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#012c56",
                      }}
                    >
                      Open: {openTaskCount}
                    </div>
                  </div>
                </div>

                {tasksQ.isLoading && (
                  <div style={{ opacity: 0.7 }}>Loading task summary…</div>
                )}

                {tasksQ.isError && (
                  <div style={{ opacity: 0.7 }}>Failed to load tasks.</div>
                )}

                {!tasksQ.isLoading && !tasksQ.isError && !tasks.length && (
                  <div style={{ opacity: 0.7 }}>
                    No tasks yet. Add your first task above.
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <Link
                    to={`/clients/${clientId}/tasks`}
                    style={{
                      textDecoration: "none",
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(1,44,86,0.16)",
                      background: "#fff",
                      color: "#012c56",
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    Open Task Page
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panelTitleRow">
              <div className="panelTitle">SOPs</div>
            </div>

            <div className="panelSub">
              SharePoint-backed references (DB links now, sync later)
            </div>

            <div style={{ padding: "0 14px 14px", display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <input
                  value={sopTitle}
                  onChange={(e) => setSopTitle(e.target.value)}
                  placeholder="SOP title…"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "#fff",
                    color: "#000",
                    outline: "none",
                  }}
                />

                <input
                  value={sopUrl}
                  onChange={(e) => setSopUrl(e.target.value)}
                  placeholder="SOP URL (SharePoint link)…"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "#fff",
                    color: "#000",
                    outline: "none",
                  }}
                />

                <button
                  className="addTask"
                  onClick={onAddSop}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(253,157,0,0.3)",
                    background: "#002d57",
                    color: "var(--text)",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Add SOP Link
                </button>

                <div style={{ fontSize: 12, opacity: 0.7 }}>
                  Note: adding SOPs requires login (Module 6).
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                {sopsQ.isLoading && (
                  <div style={{ opacity: 0.7 }}>Loading SOPs…</div>
                )}

                {sopsQ.isError && (
                  <div style={{ opacity: 0.7 }}>Failed to load SOPs.</div>
                )}

                {!sops?.length && !sopsQ.isLoading && (
                  <div style={{ opacity: 0.7 }}>No SOPs added yet.</div>
                )}

                {sops?.slice(0, 6).map((s: any) => (
                  <a
                    key={s.id}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      border: "1px solid var(--border)",
                      background: "var(--panel2)",
                      borderRadius: 14,
                      padding: 12,
                      textDecoration: "none",
                      color: "var(--text)",
                      display: "grid",
                      gap: 4,
                    }}
                  >
                    <div style={{ fontWeight: 800 }}>{s.title}</div>

                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      {s.source || "manual"}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isTaskDrawerOpen ? (
        <div className="overviewTaskDrawerOverlay" onClick={closeTaskDrawer}>
          <div
            className="overviewTaskDrawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overviewTaskDrawerHeader">
              <div>
                <div className="overviewTaskDrawerTitle">Add Task</div>
                <div className="overviewTaskDrawerMeta">
                  Create a client task, assign it, and upload documents.
                </div>
              </div>

              <button
                type="button"
                className="overviewTaskDrawerClose"
                onClick={closeTaskDrawer}
              >
                ✕
              </button>
            </div>

            <div className="overviewTaskDrawerBody">
              <div className="overviewTaskField overviewTaskFieldFull">
                <label>Task title</label>
                <input
                  value={newTask.title}
                  onChange={(e) =>
                    setNewTask((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="New task title…"
                />
              </div>

              <div className="overviewTaskField overviewTaskFieldFull">
                <label>Details</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) =>
                    setNewTask((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Optional description…"
                  rows={8}
                />
              </div>

              <div className="overviewTaskField overviewTaskFieldFull">
                <label>Assignee</label>
                <div className="overviewTaskSelectWrap">
                  <select
                    value={newTask.assigneeId}
                    onChange={(e) =>
                      setNewTask((prev) => ({
                        ...prev,
                        assigneeId: e.target.value,
                      }))
                    }
                  >
                    <option value="">
                      {assigneesQ.isLoading
                        ? "Loading assignees…"
                        : "Select assignee"}
                    </option>
                    {assignees.map((item) => (
                      <option key={item.id} value={item.id}>
                        {getAssigneeLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overviewTaskField overviewTaskFieldFull">
                <label>Upload files</label>
                <label className="overviewTaskUploadBox">
                  <input type="file" multiple onChange={onTaskFilesSelected} />
                  <span>
                    <i className="overviewUploadIcon" aria-hidden="true">
                      ⤴
                    </i>
                    Upload files
                  </span>
                  <small>Drag files here or click to browse.</small>
                </label>

                {newTask.files.length ? (
                  <div className="overviewTaskPendingGrid">
                    {newTask.files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="overviewTaskPendingCard"
                      >
                        <div className="overviewTaskPendingName">
                          {file.name}
                        </div>
                        <div className="overviewTaskPendingMeta">
                          {formatBytes(file.size)}
                        </div>
                        <button
                          type="button"
                          className="overviewTaskRemoveBtn"
                          onClick={() => removePendingTaskFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {isAddingTask && newTask.files.length ? (
                  <div className="overviewTaskUploadProgress">
                    <div
                      className="overviewTaskUploadProgressBar"
                      style={{ width: `${addTaskUploadProgress || 0}%` }}
                    />
                    <span>{addTaskUploadProgress || 0}% uploaded</span>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="overviewTaskDrawerFooter">
              <button
                type="button"
                className="overviewTaskSecondaryBtn"
                onClick={closeTaskDrawer}
                disabled={isAddingTask}
              >
                Cancel
              </button>

              <button
                type="button"
                className="overviewTaskPrimaryBtn"
                onClick={onAddTask}
                disabled={isAddingTask || !newTask.title.trim()}
              >
                {isAddingTask ? "Adding…" : "Create Task"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
