// apps/web/src/ui/components/Toast.tsx
import React from "react";

type ToastProps = {
  open: boolean;
  type?: "success" | "error" | "info";
  message: string;
  onClose?: () => void;
};

export default function Toast({
  open,
  type = "info",
  message,
  onClose,
}: ToastProps) {
  if (!open || !message) return null;

  return (
    <div
      className={`nlmToast nlmToast--${type}`}
      role="status"
      aria-live="polite"
    >
      <div className="nlmToast__content">
        <div className="nlmToast__title">
          {type === "success"
            ? "Success"
            : type === "error"
              ? "Something went wrong"
              : "Notice"}
        </div>
        <div className="nlmToast__message">{message}</div>
      </div>

      <button type="button" className="nlmToast__close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}
