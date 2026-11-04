"use client";

import { useState } from "react";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Kirish amalga oshmadi");
        setBusy(false);
        return;
      }
      window.location.href = next || data.redirect || "/app";
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="dd-label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          className="dd-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="siz@klinika.uz"
        />
      </div>
      <div>
        <label className="dd-label" htmlFor="password">
          Parol
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          className="dd-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>
      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="dd-btn dd-btn-primary w-full">
        {busy ? "Kirilmoqda…" : "Kirish"}
      </button>
    </form>
  );
}
