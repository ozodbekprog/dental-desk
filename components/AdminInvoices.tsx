"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ClinicOption = {
  id: string;
  name: string;
  plan: string;
  paidUntil: string | null;
};

type Invoice = {
  id: string;
  number: string;
  clinicId: string;
  clinicName: string;
  plan: string;
  amount: number;
  months: number;
  periodStart: string;
  periodEnd: string;
  status: string;
  method: string;
  note: string;
  createdAt: string;
  paidAt: string | null;
};

const planLabels: Record<string, string> = {
  trial: "Sinov",
  start: "Start",
  clinic: "Klinika",
  network: "Tarmoq",
};

const statusLabels: Record<string, string> = {
  pending: "Kutilmoqda",
  paid: "To'langan",
  void: "Bekor",
};

const statusClass: Record<string, string> = {
  pending: "bg-warn-soft text-warn",
  paid: "bg-ok-soft text-ok",
  void: "bg-surface-2 text-muted",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const local = new Date(d.getTime() + 5 * 3600 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${local.getUTCFullYear()}`;
}

function fmtSom(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " so'm";
}

export function AdminInvoices({ clinics }: { clinics: ClinicOption[] }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [clinicId, setClinicId] = useState(clinics[0]?.id ?? "");
  const [plan, setPlan] = useState("clinic");
  const [months, setMonths] = useState(1);
  const [amount, setAmount] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/invoices");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setInvoices(data.invoices || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!clinicId && clinics[0]) setClinicId(clinics[0].id);
  }, [clinics, clinicId]);

  const prices: Record<string, number> = { start: 299_000, clinic: 599_000, network: 999_000 };
  const suggested = (prices[plan] ?? 0) * Math.max(1, months);

  async function create() {
    if (!clinicId) return setError("Klinikani tanlang");
    setBusy("create");
    setError("");
    const res = await fetch("/api/admin/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicId,
        plan,
        months,
        amount: amount.trim() === "" ? undefined : Number(amount.replace(/\s/g, "")),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "Hisob yaratilmadi");
    setAmount("");
    await load();
    router.refresh();
  }

  async function patch(id: string, status: "paid" | "void") {
    setBusy(id);
    setError("");
    const res = await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) return setError(data.error || "O'zgartirilmadi");
    await load();
    router.refresh();
  }

  const pending = invoices.filter((i) => i.status === "pending");
  const paid = invoices.filter((i) => i.status === "paid");
  const paidTotal = paid.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="dd-card overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="dd-display text-lg font-extrabold text-ink">To'lovlar</h2>
          <p className="mt-0.5 text-xs text-muted">
            Hisob-faktura yaratish va to'lovni qayd etish. To'lov tasdiqlanganda tarif va
            amal qilish muddati avtomatik yangilanadi.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full bg-warn-soft px-3 py-1 font-semibold text-warn">
            Kutilmoqda: {pending.length}
          </span>
          <span className="rounded-full bg-ok-soft px-3 py-1 font-semibold text-ok">
            To'langan: {fmtSom(paidTotal)}
          </span>
        </div>
      </div>

      <div className="grid gap-2.5 border-b border-line bg-surface-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_0.7fr_1fr_auto]">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Klinika
          </span>
          <select className="dd-input !py-2 text-sm" value={clinicId} onChange={(e) => setClinicId(e.target.value)}>
            {clinics.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Tarif
          </span>
          <select className="dd-input !py-2 text-sm" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="start">Start — 299 000</option>
            <option value="clinic">Klinika — 599 000</option>
            <option value="network">Tarmoq — 999 000</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Oy
          </span>
          <input
            type="number"
            min={1}
            max={24}
            className="dd-input !py-2 text-sm"
            value={months}
            onChange={(e) => setMonths(Math.max(1, Math.min(24, Number(e.target.value) || 1)))}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted">
            Summa (bo'sh = {fmtSom(suggested)})
          </span>
          <input
            type="text"
            inputMode="numeric"
            placeholder={String(suggested)}
            className="dd-input !py-2 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={busy === "create" || !clinicId}
          className="dd-btn dd-btn-primary self-end !px-4 !py-2 text-sm"
        >
          {busy === "create" ? "Yaratilmoqda…" : "Hisob yaratish"}
        </button>
      </div>

      {error ? (
        <p className="border-b border-danger/25 bg-danger/5 px-5 py-2.5 text-sm text-danger">{error}</p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Raqam</th>
              <th className="px-3 py-3 font-semibold">Klinika</th>
              <th className="px-3 py-3 font-semibold">Tarif</th>
              <th className="px-3 py-3 font-semibold">Summa</th>
              <th className="px-3 py-3 font-semibold">Davr</th>
              <th className="px-3 py-3 font-semibold">Holat</th>
              <th className="px-5 py-3 text-right font-semibold">Amal</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-line/60 last:border-0">
                <td className="px-5 py-3.5">
                  <p className="dd-mono text-xs font-semibold text-ink">{i.number}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{fmtDate(i.createdAt)}</p>
                </td>
                <td className="px-3 py-3.5 text-ink">{i.clinicName}</td>
                <td className="px-3 py-3.5 text-muted">{planLabels[i.plan] || i.plan}</td>
                <td className="px-3 py-3.5 font-semibold text-ink">{fmtSom(i.amount)}</td>
                <td className="px-3 py-3.5 text-muted">
                  {fmtDate(i.periodStart)} — {fmtDate(i.periodEnd)}
                </td>
                <td className="px-3 py-3.5">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      statusClass[i.status] || "bg-surface-2 text-muted"
                    }`}
                  >
                    {statusLabels[i.status] || i.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  {i.status === "pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => patch(i.id, "paid")}
                        disabled={busy === i.id}
                        className="dd-btn dd-btn-primary !px-2.5 !py-1.5 text-xs"
                      >
                        To'landi
                      </button>
                      <button
                        type="button"
                        onClick={() => patch(i.id, "void")}
                        disabled={busy === i.id}
                        className="dd-btn dd-btn-ghost !px-2.5 !py-1.5 text-xs"
                      >
                        Bekor
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted">
                      {i.status === "paid" ? fmtDate(i.paidAt) : "—"}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {!loading && invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-muted">
                  Hali hisob-faktura yo'q. Yuqoridagi forma bilan birinchisini yarating.
                </td>
              </tr>
            ) : null}
            {loading ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-muted">
                  Yuklanmoqda…
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}