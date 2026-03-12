// apps/web/src/ui/components/sharepoint/SharePointUpload.tsx

import React from "react";

type Props = {
  siteId?: string;
  driveId?: string;
  folderPath?: string;
  disabled?: boolean;
  onUploaded?: () => void;
};

export default function SharePointUpload({
  siteId,
  driveId,
  folderPath,
  disabled,
  onUploaded,
}: Props) {
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  async function uploadSelectedFile(file: File) {
    if (!file) return;

    if (!siteId || !driveId) {
      setMessage("Select a site and library first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const form = new FormData();
      form.append("siteId", siteId);
      form.append("driveId", driveId);
      form.append("folderPath", folderPath || "");
      form.append("file", file);

      const res = await fetch("/sharepoint/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Upload failed");
      }

      setMessage(`Uploaded: ${data?.item?.name || file.name}`);
      onUploaded?.();
    } catch (err: any) {
      setMessage(err?.message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadSelectedFile(file);
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (disabled || busy) {
      setDragOver(false);
      return;
    }

    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    await uploadSelectedFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !busy) setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function openPicker() {
    if (disabled || busy) return;
    inputRef.current?.click();
  }

  return (
    <div
      className={`spUploadCard ${
        dragOver ? "spUploadCardDragOver" : ""
      } ${disabled ? "spUploadCardDisabled" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
        disabled={disabled || busy}
        className="spUploadInput"
      />

      <div className="spUploadHeader">
        <div>
          <div className="spUploadTitle">Upload to SharePoint</div>
          <div className="spUploadText">
            Current folder: {folderPath ? `/${folderPath}` : "/"}
          </div>
        </div>

        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || busy}
          className="spUploadBtn"
        >
          {busy ? "Uploading..." : "Choose File"}
        </button>
      </div>

      <div
        className="spUploadDropzone"
        onClick={openPicker}
        role="button"
        tabIndex={0}
      >
        <div className="spUploadDropIcon">☁️</div>
        <div className="spUploadDropTitle">Drag and drop a file here</div>
        <div className="spUploadDropText">
          or click to browse and upload to the selected SharePoint folder
        </div>
      </div>

      {message ? (
        <div
          className={
            message.toLowerCase().includes("failed")
              ? "spUploadMessage spUploadMessageError"
              : "spUploadMessage spUploadMessageSuccess"
          }
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
