// src/ui/components/TaskDetailsDrawer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Toast from "./Toast";
import "./Toast.css";
import {
  updateTaskDetails,
  type ClickUpAssignee,
  type Client,
} from "../../api";
import "./TaskDetailsDrawer.css";

type Props = {
  open: boolean;
  task: any | null;
  clientName?: string;
  clients?: Client[];
  assignees: ClickUpAssignee[];
  onClose: () => void;
  onSaved?: (task?: any) => Promise<void> | void;
};

type Draft = {
  title: string;
  description: string;
  status: string;
  dueDate: string;
  clientId: string;
  assignees: string[];
};

type ToastState = {
  open: boolean;
  type: "success" | "error" | "info";
  message: string;
};

const EMPTY_TOAST: ToastState = {
  open: false,
  type: "info",
  message: "",
};

const STATUS_OPTIONS = [
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

function normalizeStatus(value: any) {
  const v = String(value?.status || value || "not started")
    .trim()
    .toLowerCase();

  if (v === "complete" || v === "closed") return "completed";
  if (v === "to-do") return "to do";
  return v || "not started";
}

function parseDateValue(value: any) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(value).trim();
  if (!raw) return null;

  if (/^\d{10,13}$/.test(raw)) {
    const n = Number(raw);
    const date = new Date(raw.length === 10 ? n * 1000 : n);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getTaskId(task: any) {
  return String(task?.id || task?.task_id || task?.clickup_task_id || "");
}

function getTaskTitle(task: any) {
  return (
    task?.title ||
    task?.name ||
    task?.task_name ||
    task?.subject ||
    "Untitled Task"
  );
}

function getTaskDescription(task: any) {
  return (
    task?.description || task?.details || task?.body || task?.content || ""
  );
}

function getTaskDueDate(task: any) {
  return task?.due_date || task?.dueDate || task?.date_due || null;
}

function getTaskClientId(task: any) {
  return String(
    task?.client_id || task?.clientId || task?.client?.id || "",
  ).trim();
}

function getTaskClientName(task: any) {
  return String(
    task?.client_name ||
      task?.clientName ||
      task?.client?.name ||
      task?.client?.label ||
      "",
  ).trim();
}

function getTaskClientTagValue(task: any) {
  const tags = Array.isArray(task?.tags) ? task.tags : [];
  const match = tags.find((tag: any) => {
    const value = String(tag?.name || tag || "")
      .trim()
      .toLowerCase();
    return value.startsWith("client:");
  });

  if (!match) return "";

  return String(match?.name || match)
    .trim()
    .replace(/^client:/i, "")
    .trim();
}

function normalizeLookup(value: any) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function resolveTaskClient(task: any, clients: Client[]) {
  const rawId = getTaskClientId(task);
  const rawName = getTaskClientName(task);
  const rawTag = getTaskClientTagValue(task);

  if (rawId) {
    const byId = clients.find((client) => String(client.id) === rawId);
    if (byId) {
      return {
        clientId: String(byId.id),
        clientName: String(byId.name || rawName || rawId),
      };
    }
  }

  if (rawTag) {
    const byTagId = clients.find((client) => String(client.id) === rawTag);
    if (byTagId) {
      return {
        clientId: String(byTagId.id),
        clientName: String(byTagId.name || rawName || rawTag),
      };
    }
    const byTagName = clients.find(
      (client) => normalizeLookup(client.name) === normalizeLookup(rawTag),
    );
    if (byTagName) {
      return {
        clientId: String(byTagName.id),
        clientName: String(byTagName.name || rawTag),
      };
    }
  }

  if (rawName) {
    const byName = clients.find(
      (client) => normalizeLookup(client.name) === normalizeLookup(rawName),
    );
    if (byName) {
      return {
        clientId: String(byName.id),
        clientName: String(byName.name || rawName),
      };
    }
  }

  if (rawId) {
    const byNameFromId = clients.find(
      (client) => normalizeLookup(client.name) === normalizeLookup(rawId),
    );
    if (byNameFromId) {
      return {
        clientId: String(byNameFromId.id),
        clientName: String(byNameFromId.name || rawId),
      };
    }
  }

  return {
    clientId: rawId || rawTag,
    clientName: rawName || rawTag || rawId,
  };
}

function getTaskAssigneeIds(task: any): string[] {
  const direct = Array.isArray(task?.assignee_ids)
    ? task.assignee_ids
    : Array.isArray(task?.assigneeIds)
      ? task.assigneeIds
      : [];

  if (direct.length) {
    return direct.map((v: any) => String(v || "").trim()).filter(Boolean);
  }

  if (Array.isArray(task?.assignees)) {
    return task.assignees
      .map((item: any) =>
        String(item?.id || item?.user_id || item?.userid || "").trim(),
      )
      .filter(Boolean);
  }

  const single =
    task?.assignee_id || task?.assigneeId || task?.assignee_id_text || "";
  return single ? [String(single).trim()] : [];
}

function getAssigneeLabel(item: ClickUpAssignee | undefined | null) {
  if (!item) return "Unassigned";
  return (
    item.displayName || item.name || item.username || item.email || "Unassigned"
  );
}

function initials(name: string) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "NA";
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function toInputDate(value: any) {
  const date = parseDateValue(value);
  if (!date) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: any) {
  const date = parseDateValue(value);
  if (!date) return "—";
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function makeDraft(task: any, clients: Client[] = []): Draft {
  const resolvedClient = resolveTaskClient(task, clients);
  return {
    title: getTaskTitle(task),
    description: getTaskDescription(task),
    status: normalizeStatus(task?.status),
    dueDate: toInputDate(getTaskDueDate(task)),
    clientId: resolvedClient.clientId,
    assignees: getTaskAssigneeIds(task),
  };
}

export default function TaskDetailsDrawer({
  open,
  task,
  clientName,
  clients = [],
  assignees,
  onClose,
  onSaved,
}: Props) {
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<Draft>({
    title: "",
    description: "",
    status: "not started",
    dueDate: "",
    clientId: "",
    assignees: [],
  });
  const [saving, setSaving] = useState(false);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [toast, setToast] = useState<ToastState>(EMPTY_TOAST);

  useEffect(() => {
    if (!open || !task) return;
    setDraft(makeDraft(task, clients));
    setAssigneeSearch("");
    setAssigneePickerOpen(false);
    setToast(EMPTY_TOAST);
  }, [open, task, clients]);

  useEffect(() => {
    function handleOutside(event: MouseEvent) {
      if (
        assigneePickerOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setAssigneePickerOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [assigneePickerOpen]);

  useEffect(() => {
    return () => {
      window.clearTimeout((setToast as any)._timer);
    };
  }, []);

  const showToast = (
    type: ToastState["type"],
    message: string,
    sticky = false,
  ) => {
    setToast({ open: true, type, message });

    if (!sticky) {
      window.clearTimeout((setToast as any)._timer);
      (setToast as any)._timer = window.setTimeout(() => {
        setToast(EMPTY_TOAST);
      }, 3200);
    }
  };

  const taskId = useMemo(() => getTaskId(task), [task]);

  const selectedAssignees = useMemo(
    () =>
      draft.assignees
        .map((id) => assignees.find((item) => String(item.id) === String(id)))
        .filter(Boolean) as ClickUpAssignee[],
    [assignees, draft.assignees],
  );

  const filteredAssignees = useMemo(() => {
    const q = assigneeSearch.trim().toLowerCase();
    if (!q) return assignees;
    return assignees.filter((item) =>
      getAssigneeLabel(item).toLowerCase().includes(q),
    );
  }, [assigneeSearch, assignees]);

  const selectedClientName = useMemo(() => {
    const found = clients.find(
      (item) => String(item.id) === String(draft.clientId),
    );
    return (
      found?.name ||
      resolveTaskClient(task, clients).clientName ||
      clientName ||
      "Unknown client"
    );
  }, [clients, draft.clientId, clientName, task]);

  const displayDueDate = useMemo(() => {
    return draft.dueDate || toInputDate(getTaskDueDate(task));
  }, [draft.dueDate, task]);

  function toggleAssignee(id: string) {
    setDraft((prev) => ({
      ...prev,
      assignees: prev.assignees.includes(id)
        ? prev.assignees.filter((item) => item !== id)
        : [...prev.assignees, id],
    }));
  }

  function removeAssignee(id: string) {
    setDraft((prev) => ({
      ...prev,
      assignees: prev.assignees.filter((item) => item !== id),
    }));
  }

  async function handleSave() {
    if (!taskId || saving) return;

    setSaving(true);

    try {
      const selectedAssigneeObjects = draft.assignees
        .map((id) => assignees.find((item) => String(item.id) === String(id)))
        .filter(Boolean) as ClickUpAssignee[];

      const assigneeNames = selectedAssigneeObjects
        .map((item) => getAssigneeLabel(item))
        .join(", ");

      const response = await updateTaskDetails(taskId, {
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        assignee: assigneeNames,
        assigneeIds: draft.assignees,
        dueDate: draft.dueDate || null,
        clientId: draft.clientId || null,
      });

      const updatedTask = (response as any)?.task || {
        ...(task || {}),
        title: draft.title.trim(),
        description: draft.description,
        status: draft.status,
        due_date: draft.dueDate || null,
        client_id: draft.clientId || null,
        client_name: selectedClientName,
        assignee_ids: draft.assignees,
        assignees: selectedAssigneeObjects,
      };

      setDraft(makeDraft(updatedTask, clients));
      setAssigneePickerOpen(false);
      setAssigneeSearch("");

      showToast("success", "Task updated successfully.");
      await onSaved?.(updatedTask);
    } catch (e: any) {
      showToast("error", e?.message || "Failed to save task details.", true);
    } finally {
      setSaving(false);
    }
  }

  if (!open || !task) return null;

  return (
    <>
      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast(EMPTY_TOAST)}
      />

      <div className="nlmTaskDetailsOverlay" onClick={onClose}>
        <div
          className="nlmTaskDetailsDrawer"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="nlmTaskDetailsHeader">
            <div>
              <div className="nlmTaskDetailsEyebrow">Task Details</div>
              <div className="nlmTaskDetailsTitle">
                {draft.title || getTaskTitle(task)}
              </div>
              <div className="nlmTaskDetailsSub">
                {selectedClientName} • Due{" "}
                {displayDueDate ? formatDate(displayDueDate) : "—"}
              </div>
            </div>

            <button
              type="button"
              className="nlmTaskDetailsClose"
              onClick={onClose}
              aria-label="Close task details"
            >
              ×
            </button>
          </div>

          <div className="nlmTaskDetailsBody">
            <div className="nlmTaskDetailsGrid">
              <label className="nlmTaskDetailsField nlmTaskDetailsFieldFull">
                <span>Task Name</span>
                <input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Task title"
                />
              </label>

              <label className="nlmTaskDetailsField nlmTaskDetailsFieldFull">
                <span>Description</span>
                <textarea
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Add task details"
                  rows={8}
                />
              </label>

              <label className="nlmTaskDetailsField">
                <span>Client</span>
                <select
                  value={draft.clientId}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, clientId: e.target.value }))
                  }
                >
                  <option value="">Select client</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="nlmTaskDetailsField">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, status: e.target.value }))
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="nlmTaskDetailsField">
                <span>Due Date</span>
                <input
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, dueDate: e.target.value }))
                  }
                />
              </label>

              <div
                className="nlmTaskDetailsField nlmTaskDetailsFieldFull nlmTaskDetailsAssigneeField"
                ref={popoverRef}
              >
                <span>Assignees</span>

                <div className="nlmTaskDetailsSelectedAssignees">
                  {selectedAssignees.length ? (
                    selectedAssignees.map((item) => {
                      const label = getAssigneeLabel(item);
                      return (
                        <div key={item.id} className="nlmTaskDetailsChip">
                          <span className="nlmTaskDetailsChipAvatar">
                            {initials(label)}
                          </span>
                          <span>{label}</span>
                          <button
                            type="button"
                            className="nlmTaskDetailsChipRemove"
                            onClick={() => removeAssignee(String(item.id))}
                            aria-label={`Remove ${label}`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="nlmTaskDetailsMuted">
                      No assignees selected.
                    </div>
                  )}
                </div>

                <div className="nlmTaskDetailsPickerBar">
                  <button
                    type="button"
                    className="nlmTaskDetailsPickerToggle"
                    onClick={() => setAssigneePickerOpen((prev) => !prev)}
                  >
                    + Assign members
                  </button>
                </div>

                {assigneePickerOpen ? (
                  <div className="nlmTaskDetailsAssigneePopover">
                    <input
                      className="nlmTaskDetailsAssigneeSearch"
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search members..."
                    />

                    <div className="nlmTaskDetailsAssigneeMenu">
                      {filteredAssignees.map((item) => {
                        const label = getAssigneeLabel(item);
                        const checked = draft.assignees.includes(
                          String(item.id),
                        );
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`nlmTaskDetailsAssigneeMenuItem ${checked ? "active" : ""}`}
                            onClick={() => toggleAssignee(String(item.id))}
                          >
                            <span className="nlmTaskDetailsChipAvatar">
                              {initials(label)}
                            </span>
                            <span className="nlmTaskDetailsAssigneeMenuLabel">
                              {label}
                            </span>
                            <span className="nlmTaskDetailsAssigneeMenuCheck">
                              {checked ? "✓" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="nlmTaskDetailsFooter">
            <button
              type="button"
              className="nlmTaskDetailsBtn nlmTaskDetailsBtnSecondary"
              onClick={onClose}
              disabled={saving}
            >
              Close
            </button>
            <button
              type="button"
              className="nlmTaskDetailsBtn nlmTaskDetailsBtnPrimary"
              onClick={handleSave}
              disabled={saving || !draft.title.trim()}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
