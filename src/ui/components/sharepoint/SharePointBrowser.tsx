// apps/web/src/ui/components/sharepoint/SharePointBrowser.tsx

import React from "react";
import SharePointUpload from "./SharePointUpload";

type Site = {
  id: string;
  name: string;
  webUrl?: string | null;
};

type Drive = {
  id: string;
  name: string;
  webUrl?: string | null;
};

type Item = {
  id: string;
  name: string;
  type: "file" | "folder";
  path: string;
  webUrl?: string | null;
  size?: number | null;
  lastModified?: string | null;
  mimeType?: string | null;
};

type Props = {
  mock?: boolean;
};

function formatBytes(size?: number | null) {
  const n = Number(size || 0);
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function pathToParts(path: string) {
  const clean = String(path || "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
  if (!clean) return [];
  return clean.split("/").filter(Boolean);
}

function getFileTypeLabel(item: Item) {
  if (item.type === "folder") return "Folder";

  const mime = String(item.mimeType || "").toLowerCase();
  const name = String(item.name || "").toLowerCase();

  if (mime.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (
    mime.includes("word") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return "Word";
  }
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx") ||
    name.endsWith(".csv")
  ) {
    return "Excel";
  }
  if (
    mime.includes("image") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".gif") ||
    name.endsWith(".svg")
  ) {
    return "Image";
  }
  if (
    mime.includes("presentation") ||
    name.endsWith(".ppt") ||
    name.endsWith(".pptx")
  ) {
    return "Slides";
  }
  if (
    mime.includes("zip") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar") ||
    name.endsWith(".7z")
  ) {
    return "Archive";
  }
  if (mime.includes("text") || name.endsWith(".txt") || name.endsWith(".md")) {
    return "Text";
  }

  return "File";
}

function getFileIcon(item: Item) {
  if (item.type === "folder") return "📁";

  const type = getFileTypeLabel(item);
  if (type === "PDF") return "📕";
  if (type === "Word") return "📘";
  if (type === "Excel") return "📗";
  if (type === "Image") return "🖼️";
  if (type === "Slides") return "📙";
  if (type === "Archive") return "🗜️";
  if (type === "Text") return "📝";
  return "📄";
}

export default function SharePointBrowser({ mock }: Props) {
  const [sites, setSites] = React.useState<Site[]>([]);
  const [drives, setDrives] = React.useState<Drive[]>([]);
  const [items, setItems] = React.useState<Item[]>([]);

  const [siteId, setSiteId] = React.useState("");
  const [driveId, setDriveId] = React.useState("");
  const [folderPath, setFolderPath] = React.useState("");

  const [busySites, setBusySites] = React.useState(false);
  const [busyDrives, setBusyDrives] = React.useState(false);
  const [busyItems, setBusyItems] = React.useState(false);
  const [error, setError] = React.useState("");
  const [newFolderName, setNewFolderName] = React.useState("");

  const parts = React.useMemo(() => pathToParts(folderPath), [folderPath]);

  const loadSites = React.useCallback(async () => {
    setBusySites(true);
    setError("");

    try {
      const res = await fetch("/sharepoint/sites", {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load sites");
      }

      const nextSites = Array.isArray(data?.items) ? data.items : [];
      setSites(nextSites);

      if (!siteId && nextSites[0]?.id) {
        setSiteId(nextSites[0].id);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load sites");
    } finally {
      setBusySites(false);
    }
  }, [siteId]);

  const loadDrives = React.useCallback(async () => {
    if (!siteId) {
      setDrives([]);
      setDriveId("");
      return;
    }

    setBusyDrives(true);
    setError("");

    try {
      const res = await fetch(
        `/sharepoint/drives?siteId=${encodeURIComponent(siteId)}`,
        {
          credentials: "include",
        },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load libraries");
      }

      const nextDrives = Array.isArray(data?.items) ? data.items : [];
      setDrives(nextDrives);

      if (!nextDrives.some((x) => x.id === driveId)) {
        setDriveId(nextDrives[0]?.id || "");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load libraries");
    } finally {
      setBusyDrives(false);
    }
  }, [siteId, driveId]);

  const loadItems = React.useCallback(async () => {
    if (!siteId || !driveId) {
      setItems([]);
      return;
    }

    setBusyItems(true);
    setError("");

    try {
      const qs = new URLSearchParams();
      qs.set("siteId", siteId);
      qs.set("driveId", driveId);
      qs.set("path", folderPath || "");

      const res = await fetch(`/sharepoint/items?${qs.toString()}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load files");
      }

      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err: any) {
      setError(err?.message || "Failed to load files");
    } finally {
      setBusyItems(false);
    }
  }, [siteId, driveId, folderPath]);

  React.useEffect(() => {
    loadSites();
  }, [loadSites]);

  React.useEffect(() => {
    loadDrives();
  }, [loadDrives]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || !siteId || !driveId) return;

    setError("");

    try {
      const res = await fetch("/sharepoint/folders", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId,
          driveId,
          parentPath: folderPath || "",
          name,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to create folder");
      }

      setNewFolderName("");
      await loadItems();
    } catch (err: any) {
      setError(err?.message || "Failed to create folder");
    }
  }

  function goToFolder(nextPath: string) {
    setFolderPath(nextPath.replace(/^\/+/, ""));
  }

  return (
    <div className="spBrowser">
      <div className="spToolbarGrid">
        <div className="spControlCard">
          <div className="spControlLabel">Site</div>
          <select
            className="spSelect"
            value={siteId}
            onChange={(e) => {
              setSiteId(e.target.value);
              setDriveId("");
              setFolderPath("");
            }}
          >
            {busySites ? <option>Loading sites...</option> : null}
            {!busySites && sites.length === 0 ? (
              <option value="">No sites</option>
            ) : null}
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </div>

        <div className="spControlCard">
          <div className="spControlLabel">Library</div>
          <select
            className="spSelect"
            value={driveId}
            onChange={(e) => {
              setDriveId(e.target.value);
              setFolderPath("");
            }}
          >
            {busyDrives ? <option>Loading libraries...</option> : null}
            {!busyDrives && drives.length === 0 ? (
              <option value="">No libraries</option>
            ) : null}
            {drives.map((drive) => (
              <option key={drive.id} value={drive.id}>
                {drive.name}
              </option>
            ))}
          </select>
        </div>

        <div className="spControlCard">
          <div className="spControlLabel">Mode</div>
          <div
            className={`spModeBadge ${mock ? "spModeBadgeWarn" : "spModeBadgeGood"}`}
          >
            {mock ? "Mock Mode" : "Live Mode"}
          </div>
        </div>
      </div>

      <SharePointUpload
        siteId={siteId}
        driveId={driveId}
        folderPath={folderPath}
        onUploaded={loadItems}
        disabled={!siteId || !driveId}
      />

      <div className="spActionCard">
        <div className="spBreadcrumbWrap">
          <div className="spBreadcrumbLabel">Path</div>
          <div className="spBreadcrumbBar">
            <button
              type="button"
              onClick={() => goToFolder("")}
              className={
                folderPath
                  ? "spBreadcrumbBtn"
                  : "spBreadcrumbBtn spBreadcrumbBtnActive"
              }
            >
              Root
            </button>

            {parts.map((part, index) => {
              const nextPath = parts.slice(0, index + 1).join("/");
              const active = nextPath === folderPath;

              return (
                <React.Fragment key={nextPath}>
                  <span className="spBreadcrumbDivider">/</span>
                  <button
                    type="button"
                    onClick={() => goToFolder(nextPath)}
                    className={
                      active
                        ? "spBreadcrumbBtn spBreadcrumbBtnActive"
                        : "spBreadcrumbBtn"
                    }
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="spFolderCreateWrap">
          <input
            className="spFolderInput"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name"
          />
          <button
            type="button"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim() || !siteId || !driveId}
            className="spCreateBtn"
          >
            Create Folder
          </button>
        </div>
      </div>

      <div className="spTableCard">
        <div className="spTableHeader">
          <div>Name</div>
          <div>Type</div>
          <div>Size</div>
          <div>Modified</div>
        </div>

        {busyItems ? (
          <div className="spTableState">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="spTableState">No files or folders found.</div>
        ) : (
          items.map((item) => {
            const fileType = getFileTypeLabel(item);
            const icon = getFileIcon(item);

            return (
              <div key={item.id} className="spTableRow">
                <div className="spNameCell">
                  {item.type === "folder" ? (
                    <button
                      type="button"
                      onClick={() => goToFolder(item.path)}
                      className="spItemButton"
                    >
                      <span className="spFileIcon">{icon}</span>
                      <span className="spItemMeta">
                        <span className="spItemTitle">{item.name}</span>
                        <span className="spItemPath">{item.path}</span>
                      </span>
                    </button>
                  ) : item.webUrl ? (
                    <a
                      href={item.webUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="spItemLink"
                    >
                      <span className="spFileIcon">{icon}</span>
                      <span className="spItemMeta">
                        <span className="spItemTitle">{item.name}</span>
                        <span className="spItemPath">{item.path}</span>
                      </span>
                    </a>
                  ) : (
                    <div className="spItemStatic">
                      <span className="spFileIcon">{icon}</span>
                      <span className="spItemMeta">
                        <span className="spItemTitle">{item.name}</span>
                        <span className="spItemPath">{item.path}</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="spTypeCell">
                  <span
                    className={
                      item.type === "folder"
                        ? "spTypeBadge spTypeBadgeFolder"
                        : "spTypeBadge"
                    }
                  >
                    {fileType}
                  </span>
                </div>

                <div className="spMetaCell">
                  {item.type === "file" ? formatBytes(item.size) : "—"}
                </div>

                <div className="spMetaCell">
                  {formatDate(item.lastModified)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {error ? <div className="spInlineError">{error}</div> : null}
    </div>
  );
}
