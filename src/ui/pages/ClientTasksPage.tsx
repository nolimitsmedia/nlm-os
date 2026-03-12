// apps/web/src/ui/pages/ClientTasksPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteTask,
  deleteTaskAttachment,
  fetchClientOverview,
  fetchTaskAssignees,
  fetchTaskAttachments,
  fetchTasks,
  updateTaskDetails,
  updateTaskStatus,
  uploadTaskAttachments,
  type ClickUpAssignee,
  type TaskAttachment,
} from "../../api";
import Toast from "../components/Toast";
import "../components/Toast.css";
import "./ClientTasksPage.css";

const TASK_STATUS_OPTIONS = [
  "all",
  "not started",
  "open",
  "to do",
  "in progress",
  "on hold",
  "review",
  "complete",
  "completed",
  "closed",
];

function normalizeTaskStatus(value: any) {
  return String(value?.status || value || "not started")
    .trim()
    .toLowerCase();
}

function formatDate(value: any) {
  if (!value) return "—";
  const normalized = /^\d+$/.test(String(value)) ? Number(value) : value;
  const d = new Date(normalized as any);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function formatBytes(value?: number | null) {
  const size = Number(value || 0);
  if (!size) return "";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let index = 0;
  while (current >= 1024 && index < units.length - 1) {
    current /= 1024;
    index += 1;
  }
  return `${current.toFixed(current >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function statusOptionsForTask(task: any) {
  const current = normalizeTaskStatus(task?.status);
  const set = new Set(TASK_STATUS_OPTIONS.filter((s) => s !== "all"));
  if (current) set.add(current);
  return Array.from(set);
}

function getTaskMutationId(task: any) {
  return String(
    task?.id || task?.clickup_task_id || task?.task_id || task?.clickupId || "",
  ).trim();
}

function getTaskDisplayName(task: any) {
  return String(task?.name || task?.title || "Untitled Task").trim();
}

function getTaskDescription(task: any) {
  return String(task?.description || "").trim();
}

function getTaskAssignee(task: any) {
  const fromSingle =
    task?.assignee?.username ||
    task?.assignee?.email ||
    task?.assignee?.name ||
    task?.assignee?.initials ||
    task?.assignee ||
    "";

  if (fromSingle && typeof fromSingle === "string") {
    return fromSingle.trim() || "—";
  }

  if (Array.isArray(task?.assignees) && task.assignees.length) {
    const names = task.assignees
      .map(
        (a: any) =>
          a?.username || a?.email || a?.name || a?.initials || String(a || ""),
      )
      .filter(Boolean)
      .map((v: any) => String(v).trim())
      .filter(Boolean);

    if (names.length) return names.join(", ");
  }

  return "—";
}

type ToastState = {
  open: boolean;
  type: "success" | "error" | "info";
  message: string;
};

type TaskDraft = {
  title: string;
  description: string;
  assignee: string;
  assigneeId: string;
};

const EMPTY_TOAST: ToastState = { open: false, type: "info", message: "" };

function getAssigneeLabel(item: ClickUpAssignee) {
  return item.displayName || item.username || item.email || "Unassigned";
}

export default function ClientTasksPage() {
  const { clientId = "" } = useParams();
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(EMPTY_TOAST);
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: "",
    description: "",
    assignee: "",
    assigneeId: "",
  });
  const [drawerFiles, setDrawerFiles] = useState<File[]>([]);
  const [drawerUploadProgress, setDrawerUploadProgress] = useState(0);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<
    string | null
  >(null);

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

  const overviewQ = useQuery({
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
    enabled: !!clientId,
    staleTime: 60_000,
  });

  const activeTaskId = activeTask ? getTaskMutationId(activeTask) : "";
  const attachmentsQ = useQuery({
    queryKey: ["task-attachments", activeTaskId],
    queryFn: () => fetchTaskAttachments(activeTaskId),
    enabled: !!activeTaskId,
    staleTime: 10_000,
  });

  const tasks = useMemo(() => (tasksQ.data as any)?.tasks || [], [tasksQ.data]);
  const assignees = useMemo(() => assigneesQ.data || [], [assigneesQ.data]);
  const attachments = useMemo(
    () => attachmentsQ.data || [],
    [attachmentsQ.data],
  );

  const filteredTasks = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tasks.filter((task: any) => {
      const status = normalizeTaskStatus(task?.status);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const haystack = [
        task?.name,
        task?.title,
        task?.description,
        getTaskAssignee(task),
        task?.clickup_task_id,
        task?.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || haystack.includes(needle);
      return matchesStatus && matchesSearch;
    });
  }, [tasks, search, statusFilter]);

  async function refreshTasks() {
    await qc.invalidateQueries({ queryKey: ["tasks", clientId] });
  }

  function openTaskDrawer(task: any) {
    const currentAssignee = getTaskAssignee(task);
    const matchedAssignee = assignees.find(
      (item) =>
        getAssigneeLabel(item) === currentAssignee ||
        String(item.id) === String(task?.assignee_id || ""),
    );

    setActiveTask(task);
    setDrawerFiles([]);
    setDrawerUploadProgress(0);
    setTaskDraft({
      title: getTaskDisplayName(task),
      description: getTaskDescription(task),
      assignee: currentAssignee === "—" ? "" : currentAssignee,
      assigneeId: matchedAssignee ? String(matchedAssignee.id) : "",
    });
  }

  function closeTaskDrawer() {
    setActiveTask(null);
    setDrawerFiles([]);
    setDrawerUploadProgress(0);
    setTaskDraft({ title: "", description: "", assignee: "", assigneeId: "" });
  }

  function onDrawerFilesSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setDrawerFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }

  function removeDrawerPendingFile(index: number) {
    setDrawerFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function onTaskStatusChange(task: any, nextStatus: string) {
    const taskMutationId = getTaskMutationId(task);
    if (!taskMutationId || !nextStatus || busyTaskId) return;

    const currentStatus = normalizeTaskStatus(task?.status);
    const targetStatus = String(nextStatus || "")
      .trim()
      .toLowerCase();

    if (!targetStatus || currentStatus === targetStatus) return;

    setBusyTaskId(taskMutationId);

    try {
      const result = await updateTaskStatus(taskMutationId, targetStatus);
      const updatedTask = (result as any)?.task || null;
      showToast("success", "Task status updated.");
      await refreshTasks();

      if (activeTask && getTaskMutationId(activeTask) === taskMutationId) {
        setActiveTask((prev: any) =>
          prev
            ? {
                ...prev,
                ...(updatedTask || {}),
                status: updatedTask?.status || targetStatus,
              }
            : prev,
        );
      }
    } catch (e: any) {
      showToast("error", e?.message || "Failed to update task status.", true);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function onDeleteTask(task: any) {
    const taskMutationId = getTaskMutationId(task);
    if (!taskMutationId || busyTaskId) return;

    const confirmDelete = window.confirm(
      `Delete task "${getTaskDisplayName(task)}"?`,
    );
    if (!confirmDelete) return;

    setBusyTaskId(taskMutationId);

    try {
      await deleteTask(taskMutationId);
      showToast("success", "Task deleted.");
      await refreshTasks();

      if (activeTask && getTaskMutationId(activeTask) === taskMutationId) {
        closeTaskDrawer();
      }
    } catch (e: any) {
      showToast("error", e?.message || "Failed to delete task.", true);
    } finally {
      setBusyTaskId(null);
    }
  }

  async function onDeleteAttachment(attachment: TaskAttachment) {
    if (!activeTaskId || deletingAttachmentId) return;
    const confirmDelete = window.confirm(
      `Delete attachment "${attachment.file_name}"?`,
    );
    if (!confirmDelete) return;

    setDeletingAttachmentId(attachment.id);
    try {
      await deleteTaskAttachment(activeTaskId, attachment.id);
      await qc.invalidateQueries({
        queryKey: ["task-attachments", activeTaskId],
      });
      await refreshTasks();
      showToast("success", "Attachment removed.");
    } catch (e: any) {
      showToast("error", e?.message || "Failed to delete attachment.", true);
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  async function onSaveTaskDetails() {
    if (!activeTask) return;

    const taskMutationId = getTaskMutationId(activeTask);
    if (!taskMutationId) {
      showToast("error", "Task ID is missing.", true);
      return;
    }

    setBusyTaskId(taskMutationId);

    try {
      const nextTitle = taskDraft.title.trim() || "Untitled Task";
      const nextDescription = taskDraft.description;
      const selectedAssignee = assignees.find(
        (item) => String(item.id) === String(taskDraft.assigneeId || ""),
      );
      const nextAssignee = selectedAssignee
        ? getAssigneeLabel(selectedAssignee)
        : taskDraft.assignee.trim();
      const nextStatus = normalizeTaskStatus(activeTask?.status);

      const result = await updateTaskDetails(taskMutationId, {
        title: nextTitle,
        description: nextDescription,
        assignee: nextAssignee,
        assigneeId: taskDraft.assigneeId || null,
        status: nextStatus,
      });

      let uploadMessageShown = false;

      if (drawerFiles.length) {
        setDrawerUploadProgress(1);

        const uploadResult = await uploadTaskAttachments(
          taskMutationId,
          drawerFiles,
          {
            onProgress: setDrawerUploadProgress,
          },
        );

        await qc.invalidateQueries({
          queryKey: ["task-attachments", taskMutationId],
        });

        if (uploadResult?.warning) {
          showToast("info", uploadResult.warning, true);
          uploadMessageShown = true;
        } else if (uploadResult?.message) {
          showToast("success", uploadResult.message);
          uploadMessageShown = true;
        }
      }

      const updatedTask = (result as any)?.task || null;

      if (!uploadMessageShown) {
        showToast("success", "Task details updated.");
      }

      await refreshTasks();
      setDrawerFiles([]);
      setDrawerUploadProgress(0);

      setActiveTask((prev: any) =>
        prev
          ? {
              ...prev,
              ...(updatedTask || {}),
              title: updatedTask?.title || nextTitle,
              name: updatedTask?.name || nextTitle,
              description: updatedTask?.description ?? nextDescription,
              assignee: updatedTask?.assignee ?? nextAssignee,
              status: updatedTask?.status || nextStatus,
              updated_at: updatedTask?.updated_at || new Date().toISOString(),
            }
          : prev,
      );
    } catch (e: any) {
      showToast("error", e?.message || "Failed to update task details.", true);
    } finally {
      setBusyTaskId(null);
    }
  }

  const clientName =
    overviewQ.data?.client?.name ||
    overviewQ.data?.client?.display_name ||
    overviewQ.data?.whmcs?.company_name ||
    overviewQ.data?.title ||
    clientId;

  const providerLabel = (tasksQ.data as any)?.provider || "clickup";
  const billingLabel = overviewQ.data?.health?.billing || "unknown";
  const balanceDue = Number(overviewQ.data?.summary?.balance_due ?? 0);
  const openInvoices = Number(overviewQ.data?.summary?.open_invoices ?? 0);
  const activeServices = Number(overviewQ.data?.summary?.active_services ?? 0);

  return (
    <>
      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(EMPTY_TOAST)}
      />

      <div className="clientTasksPage">
        <div className="clientTasksHeader">
          <div className="clientTasksHeaderSpacer" />

          <div className="clientTasksHeaderActions">
            <Link className="clientTasksGhostBtn" to={`/clients/${clientId}`}>
              Back to Overview
            </Link>
          </div>
        </div>

        <div className="clientTasksToolbar">
          <input
            className="clientTasksSearch"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks, assignee, or ClickUp ID…"
          />

          <select
            className="clientTasksFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status}
              </option>
            ))}
          </select>
        </div>

        <div className="clientTasksPanel">
          <div className="clientTasksMetaRow">
            <div>
              <strong>{clientName}</strong> • {filteredTasks.length} visible
              task(s)
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                Billing:{" "}
                <b style={{ textTransform: "capitalize" }}>{billingLabel}</b>
                {" • "}Balance Due: <b>${balanceDue.toLocaleString()}</b>
                {" • "}Open Invoices: <b>{openInvoices}</b>
                {" • "}Active Services: <b>{activeServices}</b>
              </div>
            </div>
            <div>{providerLabel}</div>
          </div>

          <div className="clientTasksTableWrap">
            <table className="clientTasksTable">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasksQ.isLoading ? (
                  <tr>
                    <td colSpan={5} className="clientTasksEmpty">
                      Loading tasks…
                    </td>
                  </tr>
                ) : tasksQ.isError ? (
                  <tr>
                    <td colSpan={5} className="clientTasksEmpty">
                      Failed to load tasks.
                    </td>
                  </tr>
                ) : !filteredTasks.length ? (
                  <tr>
                    <td colSpan={5} className="clientTasksEmpty">
                      No matching tasks found.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task: any) => {
                    const taskMutationId = getTaskMutationId(task);
                    const isBusy = busyTaskId === taskMutationId;
                    const currentStatus = normalizeTaskStatus(task?.status);
                    const assignee = getTaskAssignee(task);

                    return (
                      <tr
                        key={taskMutationId || task.id}
                        className="clientTasksRow"
                        onClick={() => openTaskDrawer(task)}
                      >
                        <td>
                          <button
                            type="button"
                            className="clientTasksNameBtn"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskDrawer(task);
                            }}
                          >
                            <span className="clientTasksName">
                              {getTaskDisplayName(task)}
                            </span>
                          </button>
                        </td>

                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="clientTasksSelectWrap">
                            <select
                              className="clientTasksStatusSelect"
                              value={currentStatus || "not started"}
                              disabled={isBusy || !taskMutationId}
                              onChange={(e) =>
                                onTaskStatusChange(task, e.target.value)
                              }
                            >
                              {statusOptionsForTask(task).map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>

                        <td>
                          <div className="clientTasksAssigneeCell">
                            {assignee}
                          </div>
                        </td>

                        <td>
                          {formatDate(
                            task.updated_at ||
                              task.date_updated ||
                              task.created_at ||
                              task.date_created,
                          )}
                        </td>

                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="clientTasksDeleteBtn"
                            disabled={isBusy || !taskMutationId}
                            onClick={() => onDeleteTask(task)}
                          >
                            <span>{isBusy ? "Working…" : "Delete"}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeTask ? (
        <div className="clientTaskDrawerOverlay" onClick={closeTaskDrawer}>
          <div
            className="clientTaskDrawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="clientTaskDrawerHeader">
              <div className="clientTaskDrawerTitleBlock">
                <div className="clientTaskDrawerTitle">
                  {getTaskDisplayName(activeTask)}
                </div>
                <div className="clientTaskDrawerMeta">
                  {clientName}
                  {activeTask?.clickup_task_id ? " • ClickUp linked" : ""}
                </div>
              </div>

              <button
                type="button"
                className="clientTaskDrawerClose"
                onClick={closeTaskDrawer}
              >
                ✕
              </button>
            </div>

            <div className="clientTaskDrawerBody">
              <div className="clientTaskDrawerGrid">
                <div className="clientTaskField">
                  <label>Task title</label>
                  <input
                    value={taskDraft.title}
                    onChange={(e) =>
                      setTaskDraft((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Task title"
                  />
                </div>

                <div className="clientTaskField">
                  <label>Status</label>
                  <div className="clientTasksSelectWrap">
                    <select
                      className="clientTasksStatusSelect clientTasksStatusSelectDrawer"
                      value={normalizeTaskStatus(activeTask?.status)}
                      disabled={
                        busyTaskId === getTaskMutationId(activeTask) ||
                        !getTaskMutationId(activeTask)
                      }
                      onChange={(e) =>
                        onTaskStatusChange(activeTask, e.target.value)
                      }
                    >
                      {statusOptionsForTask(activeTask).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="clientTaskField">
                  <label>Assignee</label>
                  <div className="clientTasksSelectWrap">
                    <select
                      className="clientTasksStatusSelect clientTasksStatusSelectDrawer"
                      value={taskDraft.assigneeId}
                      onChange={(e) => {
                        const selected = assignees.find(
                          (item) => String(item.id) === String(e.target.value),
                        );
                        setTaskDraft((prev) => ({
                          ...prev,
                          assigneeId: e.target.value,
                          assignee: selected ? getAssigneeLabel(selected) : "",
                        }));
                      }}
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

                <div className="clientTaskField">
                  <label>Updated</label>
                  <div className="clientTaskReadOnly">
                    {formatDate(
                      activeTask?.updated_at ||
                        activeTask?.date_updated ||
                        activeTask?.created_at ||
                        activeTask?.date_created,
                    )}
                  </div>
                </div>
              </div>

              <div className="clientTaskField clientTaskFieldFull clientTaskTextareaFull">
                <label>Details</label>
                <textarea
                  value={taskDraft.description}
                  onChange={(e) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Task details"
                  rows={8}
                />
              </div>

              <div className="clientTaskField clientTaskFieldFull">
                <label>Upload files</label>
                <label className="clientTaskUploadBox">
                  <input
                    type="file"
                    multiple
                    onChange={onDrawerFilesSelected}
                  />
                  <span>
                    <i className="clientTaskUploadIcon" aria-hidden="true">
                      ⤴
                    </i>
                    Upload files
                  </span>
                  <small>Add one or multiple files.</small>
                </label>

                {drawerFiles.length ? (
                  <div className="clientTaskPendingGrid">
                    {drawerFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="clientTaskAttachmentCard clientTaskAttachmentCardPending"
                      >
                        <div className="clientTaskAttachmentName">
                          {file.name}
                        </div>
                        <div className="clientTaskAttachmentMeta">
                          {formatBytes(file.size)}
                        </div>
                        <button
                          type="button"
                          className="clientTaskAttachmentDeleteBtn"
                          onClick={() => removeDrawerPendingFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                {busyTaskId === getTaskMutationId(activeTask) &&
                drawerFiles.length ? (
                  <div className="clientTaskUploadProgress">
                    <div
                      className="clientTaskUploadProgressBar"
                      style={{ width: `${drawerUploadProgress || 0}%` }}
                    />
                    <span>{drawerUploadProgress || 0}% uploaded</span>
                  </div>
                ) : null}
              </div>

              <div className="clientTaskField clientTaskFieldFull">
                <label>Attachments</label>

                {attachmentsQ.isLoading ? (
                  <div className="clientTaskAttachmentsEmpty">
                    Loading attachments…
                  </div>
                ) : attachmentsQ.isError ? (
                  <div className="clientTaskAttachmentsEmpty">
                    Failed to load attachments.
                  </div>
                ) : attachments.length ? (
                  <div className="clientTaskAttachmentsGrid">
                    {attachments.map((attachment: TaskAttachment) => (
                      <div
                        key={attachment.id}
                        className="clientTaskAttachmentCard"
                      >
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="clientTaskAttachmentLink"
                        >
                          <div className="clientTaskAttachmentName">
                            {attachment.file_name}
                          </div>
                          <div className="clientTaskAttachmentMeta">
                            [ formatBytes(attachment.file_size || 0),
                            formatDate(attachment.created_at), ]
                            .filter(Boolean) .join(" • ")
                          </div>
                        </a>

                        <button
                          type="button"
                          className="clientTaskAttachmentDeleteBtn"
                          disabled={deletingAttachmentId === attachment.id}
                          onClick={() => onDeleteAttachment(attachment)}
                        >
                          {deletingAttachmentId === attachment.id
                            ? "Deleting…"
                            : "Delete"}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="clientTaskAttachmentsEmpty">
                    No attachments yet.
                  </div>
                )}
              </div>
            </div>

            <div className="clientTaskDrawerFooter">
              <div className="clientTaskDrawerFooterLeft" />

              <div className="clientTaskDrawerFooterRight">
                <button
                  type="button"
                  className="clientTaskSecondaryBtn"
                  onClick={closeTaskDrawer}
                >
                  Close
                </button>

                <button
                  type="button"
                  className="clientTaskPrimaryBtn"
                  disabled={
                    busyTaskId === getTaskMutationId(activeTask) ||
                    !getTaskMutationId(activeTask)
                  }
                  onClick={onSaveTaskDetails}
                >
                  {busyTaskId === getTaskMutationId(activeTask)
                    ? "Saving…"
                    : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
