// apps/web/src/ui/pages/SharePointPage.tsx

import React from "react";
import SharePointBrowser from "../components/sharepoint/SharePointBrowser";
import "./SharePointPage.css";

type StatusPayload = {
  ok?: boolean;
  configured?: boolean;
  mock?: boolean;
  hasTenantId?: boolean;
  hasClientId?: boolean;
  hasClientSecret?: boolean;
  defaultSiteId?: string;
  defaultDriveId?: string;
  error?: string;
};

export default function SharePointPage() {
  const [status, setStatus] = React.useState<StatusPayload | null>(null);
  const [busy, setBusy] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let mounted = true;

    async function loadStatus() {
      setBusy(true);
      setError("");

      try {
        const res = await fetch("/sharepoint/status", {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load SharePoint status");
        }

        if (mounted) {
          setStatus(data || {});
        }
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || "Failed to load SharePoint status");
        }
      } finally {
        if (mounted) {
          setBusy(false);
        }
      }
    }

    loadStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="sharepointPage">
      <section className="sharepointHero">
        <div className="sharepointHeroTop">
          <div>
            <div className="sharepointHeroEyebrow">Module 4</div>
            <div className="sharepointHeroTitle">SharePoint</div>
            <div className="sharepointHeroText">
              Microsoft Graph integration for file access, folder browsing,
              uploads, and client document organization inside NLM OS.
            </div>
          </div>

          <div className="sharepointHeroBadges">
            <span
              className={`sharepointHeroBadge ${
                status?.mock
                  ? "sharepointHeroBadgeWarn"
                  : "sharepointHeroBadgeGood"
              }`}
            >
              {status?.mock ? "Mock Mode" : "Live Mode"}
            </span>

            <span
              className={`sharepointHeroBadge ${
                status?.configured
                  ? "sharepointHeroBadgeGood"
                  : "sharepointHeroBadgeWarn"
              }`}
            >
              {status?.configured ? "Configured" : "Setup Pending"}
            </span>
          </div>
        </div>
      </section>

      {busy ? (
        <div className="sharepointLoading">Loading SharePoint status...</div>
      ) : error ? (
        <div className="sharepointError">{error}</div>
      ) : (
        <>
          <section className="sharepointMetrics">
            <MetricCard
              label="Mode"
              value={status?.mock ? "Mock" : "Live"}
              tone={status?.mock ? "warn" : "good"}
            />
            <MetricCard
              label="Configured"
              value={status?.configured ? "Yes" : "No"}
              tone={status?.configured ? "good" : "warn"}
            />
            <MetricCard
              label="Tenant ID"
              value={status?.hasTenantId ? "Present" : "Missing"}
              tone={status?.hasTenantId ? "good" : "warn"}
            />
            <MetricCard
              label="Client ID"
              value={status?.hasClientId ? "Present" : "Missing"}
              tone={status?.hasClientId ? "good" : "warn"}
            />
            <MetricCard
              label="Client Secret"
              value={status?.hasClientSecret ? "Present" : "Missing"}
              tone={status?.hasClientSecret ? "good" : "warn"}
            />
          </section>

          <section className="sharepointWorkspaceCard">
            <div className="sharepointWorkspaceHeader">
              <div>
                <div className="sharepointWorkspaceTitle">
                  Document Workspace
                </div>
                <div className="sharepointWorkspaceText">
                  Browse libraries, navigate folders, upload files, and manage
                  client documents from one place.
                </div>
              </div>

              <div className="sharepointWorkspaceMeta">
                <div className="sharepointWorkspaceMetaItem">
                  <span className="sharepointWorkspaceMetaLabel">
                    Default Site
                  </span>
                  <span className="sharepointWorkspaceMetaValue">
                    {status?.defaultSiteId || "Not set"}
                  </span>
                </div>

                <div className="sharepointWorkspaceMetaItem">
                  <span className="sharepointWorkspaceMetaLabel">
                    Default Drive
                  </span>
                  <span className="sharepointWorkspaceMetaValue">
                    {status?.defaultDriveId || "Not set"}
                  </span>
                </div>
              </div>
            </div>

            <div className="sharepointBrowserShell">
              <SharePointBrowser mock={Boolean(status?.mock)} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "good"
      ? "metricGood"
      : tone === "warn"
        ? "metricWarn"
        : "metricNeutral";

  return (
    <div className="sharepointMetricCard">
      <div className="sharepointMetricLabel">{label}</div>
      <div className={`sharepointMetricValue ${toneClass}`}>{value}</div>
    </div>
  );
}
