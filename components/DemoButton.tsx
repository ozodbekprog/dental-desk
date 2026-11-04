"use client";

import { useState } from "react";

export function DemoButton({
  className = "dd-btn dd-btn-ghost",
  label = "Demoni ko'rish",
}: {
  className?: string;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function openDemo() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy(false);
        setError(
          data.error === "demo_not_found"
            ? "Demo hali sozlanmagan"
            : "Demo ochilmadi, keyinroq urinib ko'ring"
        );
        return;
      }
      window.location.href = data.redirect || "/app";
    } catch {
      setBusy(false);
      setError("Tarmoq xatosi");
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={openDemo} disabled={busy} className={className}>
        {busy ? "Ochilmoqda…" : label}
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
