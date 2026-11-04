"use client";

import { useState } from "react";

export function SignupForm() {
  const [form, setForm] = useState({
    clinicName: "",
    name: "",
    email: "",
    password: "",
    demo: true,
    terms: false,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.terms) {
      setError("Foydalanish shartlarini qabul qiling");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicName: form.clinicName,
          name: form.name,
          email: form.email,
          password: form.password,
          demo: form.demo,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Ro'yxatdan o'tish amalga oshmadi");
        setBusy(false);
        return;
      }
      window.location.href = "/app";
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="dd-label" htmlFor="clinicName">
          Klinika nomi
        </label>
        <input
          id="clinicName"
          required
          minLength={2}
          className="dd-input"
          value={form.clinicName}
          onChange={(e) => update("clinicName", e.target.value)}
          placeholder="Masalan: Shifo Dental"
        />
      </div>
      <div>
        <label className="dd-label" htmlFor="name">
          Ismingiz
        </label>
        <input
          id="name"
          required
          minLength={2}
          className="dd-input"
          value={form.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Ism Familiya"
        />
      </div>
      <div>
        <label className="dd-label" htmlFor="signupEmail">
          Email
        </label>
        <input
          id="signupEmail"
          type="email"
          required
          autoComplete="email"
          className="dd-input"
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="siz@klinika.uz"
        />
      </div>
      <div>
        <label className="dd-label" htmlFor="signupPassword">
          Parol
        </label>
        <input
          id="signupPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="dd-input"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          placeholder="Kamida 8 belgi"
        />
      </div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm">
        <input
          type="checkbox"
          checked={form.demo}
          onChange={(e) => update("demo", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#0c6a72]"
        />
        <span>
          <span className="font-semibold text-ink">Namuna bemorlar bilan boshlash</span>
          <span className="mt-0.5 block text-xs text-muted">
            Tizimni sinash uchun misol yozuvlar qo'shiladi. Ularni bir tugma bilan o'chirasiz.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 text-sm text-muted">
        <input
          type="checkbox"
          checked={form.terms}
          onChange={(e) => update("terms", e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#0c6a72]"
        />
        <span>
          <a href="/legal/terms" target="_blank" className="text-accent underline">
            Foydalanish shartlari
          </a>{" "}
          va{" "}
          <a href="/legal/privacy" target="_blank" className="text-accent underline">
            maxfiylik siyosati
          </a>
          ga roziman.
        </span>
      </label>
      {error ? (
        <p className="rounded-xl border border-danger/25 bg-danger/5 px-3.5 py-2.5 text-sm text-danger">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="dd-btn dd-btn-primary w-full">
        {busy ? "Hisob yaratilmoqda…" : "14 kun bepul boshlash"}
      </button>
      <p className="text-center text-xs text-muted">
        Karta talab qilinmaydi. Sinov tugagach hisob avtomatik to'xtaydi.
      </p>
    </form>
  );
}
