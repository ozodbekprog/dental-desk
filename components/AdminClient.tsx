"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminInvoices } from "./AdminInvoices";
import { Logo } from "./Logo";

type Clinic = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  trialEndsAt: string | null;
  paidUntil: string | null;
  createdAt: string;
  users: number;
  records: number;
};

const planLabels: Record<string, string> = {
  trial: "Sinov",
  start: "Start",
  clinic: "Klinika",
  network: "Tarmoq",
};

const statusLabels: Record<string, string> = {
  active: "Faol",
  expired: "Tugagan",
  suspended: "To'xtatilgan",
};

// Deterministic format (UTC+5, Uzbekistan) so SSR and the browser match.
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const local = new Date(d.getTime() + 5 * 3600 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${local.getUTCFullYear()}`;
}

export function AdminClient({
  adminName,
  clinics,
}: {
  adminName: string;
  clinics: Clinic[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/admin/clinics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error || "O'zgartirilmadi");
      return;
    }
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const active = clinics.filter((c) => c.status === "active").length;
  const trials = clinics.filter((c) => c.plan === "trial").length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5 text-accent">
            <Logo className="h-8 w-8" />
            <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
            <span className="ml-2 rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:block">{adminName}</span>
            <button type="button" onClick={logout} className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <h1 className="dd-display text-3xl font-extrabold text-ink">Klinikalar</h1>
          <p className="mt-1 text-sm text-muted">
            Tarif va sinov muddatini boshqarish. Har bir klinika ma'lumotlari alohida.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Jami klinika", value: clinics.length },
            { label: "Faol", value: active },
            { label: "Sinovda", value: trials },
          ].map((s) => (
            <div key={s.label} className="dd-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {s.label}
              </p>
              <p className="dd-display mt-1 text-3xl font-extrabold text-ink">{s.value}</p>
            </div>
          ))}
        </div>

        {error ? (
          <p className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="dd-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Klinika</th>
                  <th className="px-3 py-3 font-semibold">Tarif</th>
                  <th className="px-3 py-3 font-semibold">Holat</th>
                  <th className="px-3 py-3 font-semibold">Sinov tugashi</th>
                  <th className="px-3 py-3 font-semibold">To'langan</th>
                  <th className="px-3 py-3 font-semibold">Xodim / yozuv</th>
                  <th className="px-5 py-3 text-right font-semibold">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {clinics.map((c) => (
                  <tr key={c.id} className="border-b border-line/60 last:border-0">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{c.name}</p>
                      <p className="dd-mono mt-0.5 text-xs text-muted">
                        {c.slug} · {fmtDate(c.createdAt)}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <select
                        className="dd-input !w-auto !py-1.5 text-sm"
                        value={c.plan}
                        disabled={busy === c.id}
                        onChange={(e) => patch(c.id, { plan: e.target.value })}
                      >
                        {Object.entries(planLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-4">
                      <select
                        className={`dd-input !w-auto !py-1.5 text-sm ${
                          c.status === "active" ? "!text-ok" : "!text-danger"
                        }`}
                        value={c.status}
                        disabled={busy === c.id}
                        onChange={(e) => patch(c.id, { status: e.target.value })}
                      >
                        {Object.entries(statusLabels).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-4 text-muted">{fmtDate(c.trialEndsAt)}</td>
                    <td className="px-3 py-4 text-muted">{fmtDate(c.paidUntil)}</td>
                    <td className="px-3 py-4 text-muted">
                      {c.users} / {c.records}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => patch(c.id, { extendTrialDays: 14 })}
                          disabled={busy === c.id}
                          className="dd-btn dd-btn-ghost !px-2.5 !py-1.5 text-xs"
                        >
                          +14 kun
                        </button>
                        <button
                          type="button"
                          onClick={() => patch(c.id, { extendTrialDays: 30 })}
                          disabled={busy === c.id}
                          className="dd-btn dd-btn-ghost !px-2.5 !py-1.5 text-xs"
                        >
                          +30 kun
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clinics.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-muted">
                      Hali klinika yo'q. Ro'yxatdan o'tish sahifasidan birinchi klinikani
                      yarating.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <AdminInvoices
          clinics={clinics.map((c) => ({
            id: c.id,
            name: c.name,
            plan: c.plan,
            paidUntil: c.paidUntil,
          }))}
        />

        <p className="text-xs text-muted">
          Eslatma: tarif o'zgarishi darhol kuchga kiradi. To'lov tasdiqlansa tarif va
          amal qilish muddati avtomatik yangilanadi; muddati o'tgan klinikalar kunlik
          cron orqali &quot;Tugagan&quot; holatiga o'tadi.
        </p>
      </main>
    </div>
  );
}
