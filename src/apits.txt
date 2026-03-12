// apps/web/src/api.ts
export const API_URL =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:4000";

export type Client = {
  id: string;
  name: string;
  status: string;
  whmcs_client_id?: number | null;
  whmcs_company_name?: string | null;
  whmcs_email?: string | null;
  whmcs_status?: string | null;
  mrr?: number;
  balance_due?: number;
  open_invoices?: number;
  overdue_invoices?: number;
  active_services?: number;
  created_at?: string;
  updated_at?: string;
};

export type ClientDetail = {
  id: string;
  name: string;
  status: string;
  whmcs: {
    whmcs_client_id: number | null;
    company_name: string | null;
    email: string | null;
    status: string | null;
  };
  summary: {
    mrr: number;
    balance_due: number;
    open_invoices: number;
    overdue_invoices: number;
    active_services?: number;
    open_tickets?: number;
    active_projects?: number;
  };
  created_at?: string | null;
  updated_at?: string | null;
};

export type ClientOverviewResponse = {
  client: {
    id: string;
    name: string;
    status: string;
    whmcs_client_id: number | null;
  } | null;
  whmcs?: {
    whmcs_client_id: number | null;
    company_name: string | null;
    email: string | null;
    status: string | null;
  };
  summary: {
    mrr: number;
    balance_due: number;
    open_invoices: number;
    overdue_invoices: number;
    active_services?: number;
  };
  health: {
    billing: string;
    riskScore: number;
  };
  timeline: Array<{
    id: string;
    type: string;
    when: string;
    note: string;
  }>;
  note?: string;
};

export type ClickUpAssignee = {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  initials?: string;
  color?: string;
  profilePicture?: string;
  displayName?: string;
};

export type TaskAttachment = {
  id: string;
  task_id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  storage_path?: string;
  content_type?: string;
  file_size?: number;
  created_at?: string;
};

export type TaskAttachmentMirrorResult = {
  fileName: string;
  mirrored: boolean;
  taskId?: string | null;
  error?: string | null;
  status?: number | null;
};

export type TaskAttachmentUploadResponse = {
  ok: boolean;
  attachments: TaskAttachment[];
  clickupMirror?: {
    attempted: number;
    mirrored: number;
    failed: number;
    ok: boolean;
    results: TaskAttachmentMirrorResult[];
  };
  warning?: string | null;
  message?: string | null;
  error?: string;
};

export type WhmcsSyncRunStats = {
  kind?: string;
  source?: string;
  clients_seen?: number;
  clients_upserted?: number;
  invoices_upserted?: number;
  services_upserted?: number;
  services_failed_clients?: number;
  services_failed_client_ids?: number[];
  services_failed_reasons?: Array<{ client_id: number; error: string }>;
  cache_clients?: number;
  cache_invoices?: number;
  cache_services?: number;
};

export type WhmcsSyncRun = {
  id?: string;
  source?: string;
  kind?: string;
  status?: string;
  started_at?: string | null;
  finished_at?: string | null;
  created_at?: string | null;
  error_message?: string | null;
  stats?: WhmcsSyncRunStats | null;
};

export type WhmcsSyncStatusResponse = {
  ok: boolean;
  configured?: boolean;
  counts?: {
    clients?: number;
    invoices?: number;
    services?: number;
  };
  runs?: WhmcsSyncRun[];
  error?: string;
};

export type WhmcsRunSyncResponse = {
  ok: boolean;
  result?: {
    ok?: boolean;
    runId?: string;
    stats?: WhmcsSyncRunStats;
    skipped?: boolean;
    reason?: string;
  };
  error?: string;
};

export type DashboardSummary = {
  configured: boolean;
  latestRun: WhmcsSyncRun | null;
  latestStats: WhmcsSyncRunStats | null;
  counts: {
    clients: number;
    invoices: number;
    services: number;
    failedClients: number;
  };
  trend: Array<{
    created: number;
    completed: number;
  }>;
};

export type ClientInsightsResponse = {
  ok: boolean;
  clientId: string;
  generated_at?: string;
  client?: {
    id: string;
    name: string;
    status: string;
    whmcs_client_id: number | null;
    email?: string | null;
    currency?: string | null;
  };
  summary?: string;
  metrics?: {
    health_score?: number;
    risk_score?: number;
    risk_band?: string;
    mrr?: number;
    balance_due?: number;
    open_invoices?: number;
    overdue_invoices?: number;
    active_services?: number;
    renewals_due_30d?: number;
    renewal_value_30d?: number;
    blocked_tasks?: number;
    urgent_tickets?: number;
  };
  alerts?: string[];
  opportunities?: string[];
  next_best_actions?: string[];
  sources?: string[];
};

export type GlobalInsightsResponse = {
  ok: boolean;
  generated_at?: string;
  overview?: {
    total_clients: number;
    whmcs_synced: number;
    healthy_clients: number;
    medium_risk_clients: number;
    high_risk_clients: number;
    total_balance_due: number;
    renewal_value_30d: number;
    renewals_due_30d: number;
  };
  top_risk_clients?: Array<{
    id: string;
    name: string;
    status: string;
    source_label?: string;
    risk_score: number;
    risk_band: string;
    reasons?: string[];
    balance_due?: number;
    open_invoices?: number;
    next_renewal_date?: string | null;
  }>;
  opportunities?: Array<{
    key: string;
    title: string;
    count: number;
    description?: string;
  }>;
  renewals?: {
    upcoming_count: number;
    total_value_30d: number;
    next: Array<{
      id: string;
      name: string;
      next_renewal_date?: string | null;
      renewal_value_30d?: number;
      renewals_due_30d?: number;
    }>;
  };
  operations?: {
    open_tasks: number;
    blocked_tasks: number;
    overdue_tasks: number;
    open_tickets: number;
    urgent_tickets: number;
    stale_tickets: number;
  };
  alerts?: string[];
};

export type AiHistoryItem = {
  role: "user" | "ai";
  text: string;
  time?: string;
};

export type AiClientSummaryResponse = {
  ok: boolean;
  reply: string;
  sources?: any[];
  meta?: {
    feature_set?: string[];
    risk_score?: number;
    risk_band?: string;
    model?: string | null;
    anthropic_request_id?: string | null;
    opportunity_count?: number;
    context_preview?: Record<string, any>;
    [key: string]: any;
  };
};

const TOKEN_KEY = "nlm_os_token";

export function setAuthToken(token: string | null) {
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function authHeaders() {
  const t = getAuthToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}

async function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
  });

  const data = await parseJsonResponse<any>(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

async function apiSend<T>(
  path: string,
  method: string,
  body?: any,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...authHeaders(),
      ...(init?.headers || {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await parseJsonResponse<any>(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data as T;
}

/* ===== Dashboard / WHMCS Sync ===== */

export async function fetchWhmcsSyncStatus(): Promise<WhmcsSyncStatusResponse> {
  return apiGet<WhmcsSyncStatusResponse>("/sync/whmcs/status");
}

export async function runWhmcsSync(
  syncAdminToken?: string,
): Promise<WhmcsRunSyncResponse> {
  const headers: Record<string, string> = {};
  if (syncAdminToken?.trim()) {
    headers.Authorization = `Bearer ${syncAdminToken.trim()}`;
  }
  return apiSend<WhmcsRunSyncResponse>("/sync/whmcs/run", "POST", undefined, {
    headers,
  });
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const status = await fetchWhmcsSyncStatus();
  const runs = Array.isArray(status?.runs) ? status.runs : [];
  const latestRun = runs[0] ?? null;
  const latestStats = latestRun?.stats ?? null;

  return {
    configured: Boolean(status?.configured),
    latestRun,
    latestStats,
    counts: {
      clients: Number(
        status?.counts?.clients ?? latestStats?.cache_clients ?? 0,
      ),
      invoices: Number(
        status?.counts?.invoices ?? latestStats?.cache_invoices ?? 0,
      ),
      services: Number(
        status?.counts?.services ?? latestStats?.cache_services ?? 0,
      ),
      failedClients: Number(latestStats?.services_failed_clients ?? 0),
    },
    trend: runs
      .slice(0, 10)
      .reverse()
      .map((run) => ({
        created: Number(run?.stats?.invoices_upserted ?? 0),
        completed: Number(run?.stats?.services_upserted ?? 0),
      })),
  };
}

/* ===== Clients ===== */
export async function fetchClients(search?: string): Promise<Client[]> {
  const url = new URL(`${API_URL}/clients`);
  if (search && search.trim()) url.searchParams.set("search", search.trim());

  const res = await fetch(url.toString(), { headers: { ...authHeaders() } });
  if (!res.ok) throw new Error("Failed to load clients");
  return res.json();
}

export async function fetchClient(clientId: string): Promise<ClientDetail> {
  const res = await fetch(
    `${API_URL}/clients/${encodeURIComponent(clientId)}`,
    {
      headers: { ...authHeaders() },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load client");
  return data as ClientDetail;
}

export async function createClient(payload: {
  name: string;
  status?: string;
}): Promise<Client> {
  const res = await fetch(`${API_URL}/clients`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = (data as any)?.error || "Failed to create client";
    throw new Error(msg);
  }

  return data as Client;
}

/* ===== Billing Overview ===== */
export async function fetchClientOverview(
  clientId: string,
): Promise<ClientOverviewResponse> {
  const id = encodeURIComponent(clientId);

  try {
    const res = await fetch(`${API_URL}/clients/${id}/overview`, {
      headers: { ...authHeaders() },
    });
    if (res.ok) return res.json();
  } catch {
    // fall through
  }

  const base = await fetchClient(clientId).catch(() => null);

  return {
    summary: {
      mrr: Number((base as any)?.summary?.mrr ?? 0),
      balance_due: Number((base as any)?.summary?.balance_due ?? 0),
      open_invoices: 0,
      overdue_invoices: 0,
      active_services: Number((base as any)?.summary?.active_services ?? 0),
    },
    health: { billing: "unknown", riskScore: 0 },
    timeline: [],
    note: "Overview endpoint not available — showing placeholders.",
    client: base
      ? {
          id: String((base as any)?.id || clientId),
          name: String((base as any)?.name || clientId),
          status: String((base as any)?.status || "active"),
          whmcs_client_id: (base as any)?.whmcs?.whmcs_client_id ?? null,
        }
      : null,
    whmcs: (base as any)?.whmcs || {
      whmcs_client_id: null,
      company_name: null,
      email: null,
      status: null,
    },
  };
}

/* ===== AI ===== */
export async function fetchClientInsights(
  clientId: string,
): Promise<ClientInsightsResponse> {
  return apiGet<ClientInsightsResponse>(
    `/ai/client-insights/${encodeURIComponent(clientId)}`,
  );
}

export async function fetchGlobalInsights(): Promise<GlobalInsightsResponse> {
  return apiGet<GlobalInsightsResponse>("/ai/global-insights");
}

export async function aiClientSummary(payload: {
  clientId: string;
  clientName?: string;
  status?: string;
  question?: string;
  history?: AiHistoryItem[];
}): Promise<AiClientSummaryResponse> {
  const res = await fetch(`${API_URL}/ai/client-summary`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.error || "AI request failed";
    throw new Error(msg);
  }
  return data as AiClientSummaryResponse;
}

/* ===== Module 6: Auth ===== */
export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Login failed");

  if ((data as any)?.token) setAuthToken((data as any).token);
  return data;
}

export async function me() {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { ...authHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Not authenticated");
  return data;
}

export function logout() {
  setAuthToken(null);
}

/* ===== Module 3: Tasks (ClickUp overlay) ===== */
export async function fetchTasks(clientId: string) {
  const url = new URL(`${API_URL}/tasks`);
  url.searchParams.set("clientId", clientId);

  const res = await fetch(url.toString(), { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load tasks");
  return data;
}

export async function fetchTaskAssignees(
  clientId?: string,
): Promise<ClickUpAssignee[]> {
  const url = new URL(`${API_URL}/tasks/assignees`);
  if (clientId) url.searchParams.set("clientId", clientId);

  const res = await fetch(url.toString(), { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Failed to load ClickUp assignees");
  }
  return Array.isArray((data as any)?.assignees) ? (data as any).assignees : [];
}

export async function fetchTaskAttachments(
  taskId: string,
): Promise<TaskAttachment[]> {
  const res = await fetch(
    `${API_URL}/tasks/${encodeURIComponent(taskId)}/attachments`,
    {
      headers: { ...authHeaders() },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Failed to load task attachments");
  }
  return Array.isArray((data as any)?.attachments)
    ? (data as any).attachments
    : [];
}

function uploadWithProgress(
  url: string,
  form: FormData,
  onProgress?: (percent: number) => void,
) {
  return new Promise<TaskAttachmentUploadResponse>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);

    const headers = authHeaders();
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable) return;
      const percent = Math.max(
        0,
        Math.min(100, Math.round((event.loaded / event.total) * 100)),
      );
      onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("Network error"));

    xhr.onload = () => {
      let data: TaskAttachmentUploadResponse | any = {};
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        data = {};
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve({
          ok: Boolean(data?.ok ?? true),
          attachments: Array.isArray(data?.attachments) ? data.attachments : [],
          clickupMirror: data?.clickupMirror,
          warning: data?.warning || null,
          message: data?.message || null,
          error: data?.error,
        });
      } else {
        reject(
          new Error(
            data?.error ||
              data?.warning ||
              data?.message ||
              "Failed to upload task attachments",
          ),
        );
      }
    };

    xhr.send(form);
  });
}

export async function uploadTaskAttachments(
  taskId: string,
  files: File[],
  options?: { onProgress?: (percent: number) => void },
): Promise<TaskAttachmentUploadResponse> {
  if (!files?.length) {
    return {
      ok: true,
      attachments: [],
      clickupMirror: {
        attempted: 0,
        mirrored: 0,
        failed: 0,
        ok: true,
        results: [],
      },
      warning: null,
      message: null,
    };
  }

  const form = new FormData();
  for (const file of files) form.append("files", file);

  return uploadWithProgress(
    `${API_URL}/tasks/${encodeURIComponent(taskId)}/attachments`,
    form,
    options?.onProgress,
  );
}

export async function deleteTaskAttachment(
  taskId: string,
  attachmentId: string,
) {
  const res = await fetch(
    `${API_URL}/tasks/${encodeURIComponent(taskId)}/attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: "DELETE",
      headers: { ...authHeaders() },
    },
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Failed to delete task attachment");
  }
  return data;
}

export async function createTask(payload: {
  clientId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assignee?: string;
}) {
  const res = await fetch(`${API_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to create task");
  return data;
}

export async function updateTaskStatus(id: string, status: string) {
  const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Failed to update task status");
  }
  return data;
}

export async function updateTaskDetails(
  id: string,
  payload: {
    title?: string;
    description?: string;
    assignee?: string;
    assigneeId?: string | null;
    assigneeIds?: string[];
    status?: string;
    dueDate?: string | null;
    clientId?: string | null;
  },
) {
  const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any)?.error || "Failed to update task details");
  }
  return data;
}

export async function deleteTask(id: string) {
  const res = await fetch(`${API_URL}/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to delete task");
  return data;
}

/* ===== Module 4: SOP Reference Layer ===== */
export async function fetchSops(clientId: string) {
  const url = new URL(`${API_URL}/sops`);
  url.searchParams.set("clientId", clientId);

  const res = await fetch(url.toString(), { headers: { ...authHeaders() } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to load SOPs");
  return data;
}

export async function createSop(payload: {
  clientId: string;
  title: string;
  url: string;
  tags?: string[];
}) {
  const res = await fetch(`${API_URL}/sops`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to add SOP");
  return data;
}

export async function deleteSop(id: string) {
  const res = await fetch(`${API_URL}/sops/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...authHeaders() },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || "Failed to delete SOP");
  return data;
}
