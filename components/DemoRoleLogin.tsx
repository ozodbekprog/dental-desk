"use client";

import { useState } from "react";

const DEMO_ROLES = [
  { key: "owner", label: "Klinika egasi", hint: "To'liq boshqaruv" },
  { key: "admin", label: "Administrator", hint: "Xodimlar va sozlamalar" },
  { key: "doctor", label: "Shifokor", hint: "Qabullar va tish xaritasi" },
  { key: "independent", label: "Mustaqil shifokor", hint: "Shaxsiy doktor kabineti" },
  { key: "reception", label: "Qabulxona", hint: "Bronlar va bemorlar" },
  { key: "callcenter", label: "Call markaz", hint: "Qo'ng'iroqlar navbati" },
  { key: "viewer", label: "Kuzatuvchi", hint: "Faqat ko'rish huquqi" },
  { key: "super", label: "Super admin", hint: "Platforma boshqaruvi" },
] as const;

export function DemoRoleLogin() {
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");

  async function enter(role: string) {
    setBusy(role);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBusy("");
        setError(
          data.error === "demo_not_found"
            ? "Demo hali sozlanmagan"
            : "Kirish ochilmadi, keyinroq urinib ko'ring"
        );
        return;
      }
      window.location.href = data.redirect || "/app";
    } catch {
      setBusy("");
      setError("Tarmoq xatosi");
    }
  }

  return (
    <section className="mt-7 rounded-2xl border border-line bg-surface-2/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">Demo rollar</h2>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          Tezkor kirish
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Har bir rol uchun tayyor hisob — bir bosishda kiring.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {DEMO_ROLES.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => enter(role.key)}
            disabled={!!busy}
            className="rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-left transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="block text-sm font-semibold text-ink">
              {busy === role.key ? "Kirilmoqda…" : role.label}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted">{role.hint}</span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="mt-3 rounded-xl border border-danger/25 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </section>
  );
}
