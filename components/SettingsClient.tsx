"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./Logo";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

type Props = {
  me: { id: string; name: string; email: string; role: string };
  clinic: { name: string; slug: string; plan: string; status: string; trialEndsAt: string | null; paidUntil: string | null };
  staff: Staff[];
  canManage: boolean;
};

const roleLabels: Record<string, string> = {
  owner: "Egasi",
  admin: "Administrator",
  doctor: "Shifokor",
  reception: "Qabulxona",
  callcenter: "Call markaz",
  viewer: "Kuzatuvchi",
};

const planLabels: Record<string, string> = {
  trial: "Sinov",
  start: "Start",
  clinic: "Klinika",
  network: "Tarmoq",
};

const specLabels: Record<string, string> = {
  dentist: "Stomatolog",
  therapist: "Terapevt",
  surgeon: "Jarroh",
  orthodontist: "Ortodont",
  pediatric: "Bolalar stomatologi",
  prosth: "Ortoped",
  hygienist: "Gigiyenist",
};

function trialDaysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86400000));
}

// Deterministic format (UTC+5) so SSR and the browser match.
function fmtDate(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const local = new Date(d.getTime() + 5 * 3600 * 1000);
  const dd = String(local.getUTCDate()).padStart(2, "0");
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${local.getUTCFullYear()}`;
}

export function SettingsClient({ me, clinic, staff, canManage }: Props) {
  const router = useRouter();
  const [clinicName, setClinicName] = useState(clinic.name);
  const [savingClinic, setSavingClinic] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "doctor",
    spec: "dentist",
  });
  const [adding, setAdding] = useState(false);
  const [busyStaff, setBusyStaff] = useState<string | null>(null);
  const [pwFor, setPwFor] = useState<Staff | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwError, setPwError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const days = trialDaysLeft(clinic.trialEndsAt);

  async function saveClinic(e: React.FormEvent) {
    e.preventDefault();
    setSavingClinic(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/clinic", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: clinicName }),
    });
    const data = await res.json().catch(() => ({}));
    setSavingClinic(false);
    if (!res.ok) {
      setError(data.error || "Saqlanmadi");
      return;
    }
    setMessage("Klinika nomi saqlandi");
    router.refresh();
  }

  function copyBookingLink() {
    const url = `${window.location.origin}/b/${clinic.slug}`;
    const done = () => {
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(done);
    } else {
      done();
    }
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setAdding(false);
    if (!res.ok) {
      setError(data.error || "Xodim qo'shilmadi");
      return;
    }
    setForm({ name: "", email: "", password: "", role: "doctor", spec: "dentist" });
    setMessage("Xodim qo'shildi");
    router.refresh();
  }

  async function changeRole(id: string, role: string) {
    setBusyStaff(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyStaff(null);
    if (!res.ok) {
      setError(data.error || "Rol o'zgartirilmadi");
      return;
    }
    setMessage("Rol yangilandi");
    router.refresh();
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwFor) return;
    setBusyStaff(pwFor.id);
    setPwError("");
    const res = await fetch(`/api/staff/${pwFor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwValue }),
    });
    const data = await res.json().catch(() => ({}));
    setBusyStaff(null);
    if (!res.ok) {
      setPwError(data.error || "Parol yangilanmadi");
      return;
    }
    setMessage(`${pwFor.name} uchun parol yangilandi`);
    setPwFor(null);
    setPwValue("");
  }

  async function removeStaff(id: string) {
    if (!window.confirm("Bu xodimni o'chirishni tasdiqlaysizmi?")) return;
    setBusyStaff(id);
    setError("");
    setMessage("");
    const res = await fetch(`/api/staff/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusyStaff(null);
    if (!res.ok) {
      setError(data.error || "O'chirilmadi");
      return;
    }
    setMessage("Xodim o'chirildi");
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/app" className="flex items-center gap-2.5 text-accent">
            <Logo className="h-8 w-8" />
            <span className="dd-display text-base font-extrabold text-ink">Dental Desk</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/app" className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              Ilovaga qaytish
            </Link>
            <button type="button" onClick={logout} className="dd-btn dd-btn-ghost !px-3.5 !py-2 text-sm">
              Chiqish
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <div>
          <h1 className="dd-display text-3xl font-extrabold text-ink">Sozlamalar</h1>
          <p className="mt-1 text-sm text-muted">
            Klinika ma'lumotlari, tarif holati va xodimlar.
          </p>
        </div>

        {message ? (
          <p className="rounded-xl border border-ok/25 bg-ok/5 px-4 py-2.5 text-sm text-ok">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl border border-danger/25 bg-danger/5 px-4 py-2.5 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="dd-card p-6">
            <h2 className="dd-display text-lg font-bold text-ink">Klinika</h2>
            <p className="mt-1 text-sm text-muted">
              Bu nom ilovada va hisobotlarda ko'rinadi.
            </p>
            <form onSubmit={saveClinic} className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="dd-input"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                disabled={!canManage}
                minLength={2}
                required
              />
              <button
                type="submit"
                className="dd-btn dd-btn-primary shrink-0"
                disabled={!canManage || savingClinic}
              >
                {savingClinic ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </form>
            <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
              <div>
                <dt className="text-muted">Sizning rolingiz</dt>
                <dd className="mt-0.5 font-semibold text-ink">{roleLabels[me.role] || me.role}</dd>
              </div>
              <div>
                <dt className="text-muted">Email</dt>
                <dd className="mt-0.5 truncate font-semibold text-ink">{me.email}</dd>
              </div>
            </dl>
            <div className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-3">
              <p className="text-sm font-semibold text-ink">Onlayn yozilish havolasi</p>
              <p className="mt-1 text-xs text-muted">
                Mijozlar tizimga kirmasdan shifokor va bo&apos;sh vaqtni tanlaydi.
                So&apos;rov qabul va call markaz navbatiga tushadi.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`/b/${clinic.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="dd-mono truncate text-sm font-semibold text-accent hover:underline"
                >
                  /b/{clinic.slug}
                </a>
                <button
                  type="button"
                  onClick={copyBookingLink}
                  className="dd-btn dd-btn-ghost ml-auto"
                >
                  {linkCopied ? "Nusxalandi" : "Havolani nusxalash"}
                </button>
              </div>
            </div>
          </div>

          <div className="dd-card p-6">
            <h2 className="dd-display text-lg font-bold text-ink">Tarif</h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="dd-display text-2xl font-extrabold text-accent">
                {planLabels[clinic.plan] || clinic.plan}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  clinic.status === "active"
                    ? "bg-ok/10 text-ok"
                    : "bg-danger/10 text-danger"
                }`}
              >
                {clinic.status === "active"
                  ? "Faol"
                  : clinic.status === "suspended"
                  ? "To'xtatilgan"
                  : "Muddati tugagan"}
              </span>
            </div>
            {clinic.plan === "trial" && days !== null ? (
              <p className="mt-2 text-sm text-muted">
                Sinov muddati: <b className="text-ink">{days} kun</b> qoldi
              </p>
            ) : clinic.paidUntil ? (
              <p className="mt-2 text-sm text-muted">
                Tarif <b className="text-ink">{fmtDate(clinic.paidUntil)}</b> gacha faol.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Tarif faol. Yangilash uchun bog'laning.</p>
            )}
            <a
              href="https://t.me/oz4vka"
              target="_blank"
              rel="noreferrer"
              className="dd-btn dd-btn-ghost mt-4 w-full"
            >
              Tarifni yangilash
            </a>
          </div>
        </section>

        <section className="dd-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="dd-display text-lg font-bold text-ink">Xodimlar</h2>
              <p className="mt-1 text-sm text-muted">
                Rollar kirish huquqini belgilaydi. Shifokor roli ilovadagi shifokorlar
                ro'yxatiga ham qo'shiladi.
              </p>
            </div>
            <p className="dd-mono rounded-lg bg-surface-2 px-3 py-1.5 text-xs text-muted">
              {staff.length} xodim
            </p>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="pb-2 pr-3 font-semibold">Ism</th>
                  <th className="pb-2 pr-3 font-semibold">Email</th>
                  <th className="pb-2 pr-3 font-semibold">Rol</th>
                  <th className="pb-2 text-right font-semibold">Amal</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-b border-line/60 last:border-0">
                    <td className="py-3 pr-3 font-semibold text-ink">
                      {s.name}
                      {s.id === me.id ? (
                        <span className="ml-2 rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-bold text-accent">
                          Siz
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 text-muted">{s.email}</td>
                    <td className="py-3 pr-3">
                      {canManage && s.role !== "owner" ? (
                        <select
                          className="dd-input !w-auto !py-1.5 text-sm"
                          value={s.role}
                          disabled={busyStaff === s.id}
                          onChange={(e) => changeRole(s.id, e.target.value)}
                        >
                          {["admin", "doctor", "reception", "callcenter", "viewer"].map((r) => (
                            <option key={r} value={r}>
                              {roleLabels[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-soft">
                          {roleLabels[s.role] || s.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canManage && (s.role !== "owner" || me.role === "owner") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPwFor(s);
                              setPwValue("");
                              setPwError("");
                            }}
                            className="dd-btn !border-line !bg-transparent !px-2.5 !py-1.5 text-xs !text-ink-soft hover:!bg-surface-2"
                          >
                            Parol
                          </button>
                        ) : null}
                        {canManage && s.role !== "owner" && s.id !== me.id ? (
                          <button
                            type="button"
                            onClick={() => removeStaff(s.id)}
                            disabled={busyStaff === s.id}
                            className="dd-btn !border-danger/30 !bg-transparent !px-2.5 !py-1.5 text-xs !text-danger hover:!bg-danger/5"
                          >
                            O'chirish
                          </button>
                        ) : null}
                        {(!canManage || (s.role === "owner" && me.role !== "owner")) && (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canManage ? (
            <form onSubmit={addStaff} className="mt-6 rounded-2xl border border-line bg-surface-2 p-4">
              <h3 className="text-sm font-bold text-ink">Yangi xodim qo'shish</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className="dd-input"
                  placeholder="Ism Familiya"
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="dd-input"
                  type="email"
                  placeholder="email@klinika.uz"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="dd-input"
                  type="password"
                  placeholder="Boshlang'ich parol (8+)"
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <select
                  className="dd-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="doctor">Shifokor</option>
                  <option value="reception">Qabulxona</option>
                  <option value="callcenter">Call markaz</option>
                  <option value="admin">Administrator</option>
                  <option value="viewer">Kuzatuvchi</option>
                </select>
                {form.role === "doctor" ? (
                  <select
                    className="dd-input"
                    value={form.spec}
                    onChange={(e) => setForm({ ...form, spec: e.target.value })}
                  >
                    {Object.entries(specLabels).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : null}
                <button type="submit" disabled={adding} className="dd-btn dd-btn-primary">
                  {adding ? "Qo'shilmoqda…" : "Xodim qo'shish"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-muted">
              Xodimlarni faqat klinika egasi yoki administrator boshqaradi.
            </p>
          )}
        </section>

        <section className="dd-card p-6">
          <h2 className="dd-display text-lg font-bold text-ink">Ilova sozlamalari</h2>
          <p className="mt-1 text-sm text-muted">
            Til, mavzu va tish raqamlash ilovaning o'zida — yuqori o'ng burchakdagi
            tugmalar orqali o'zgartiriladi.
          </p>
          <Link href="/app" className="dd-btn dd-btn-ghost mt-4">
            Ilovani ochish
          </Link>
        </section>

        <p className="pt-2 text-center text-xs text-muted">
          Dental Desk · Xoshimov Group · <a href="/legal/privacy" className="underline">Maxfiylik</a>{" "}
          · <a href="/legal/terms" className="underline">Shartlar</a>
        </p>
      </main>

      {pwFor ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <form
            onSubmit={resetPassword}
            role="dialog"
            aria-modal="true"
            aria-label="Parolni yangilash"
            className="dd-card w-full max-w-md p-6"
          >
            <h2 className="dd-display text-lg font-bold text-ink">Parolni yangilash</h2>
            <p className="mt-1 text-sm text-muted">
              {pwFor.name} · {pwFor.email}
            </p>
            <input
              autoFocus
              type="password"
              minLength={8}
              required
              className="dd-input mt-4"
              placeholder="Yangi parol (8+)"
              value={pwValue}
              onChange={(e) => setPwValue(e.target.value)}
            />
            {pwError ? <p className="mt-2 text-sm text-danger">{pwError}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="dd-btn dd-btn-ghost"
                onClick={() => setPwFor(null)}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="dd-btn dd-btn-primary"
                disabled={busyStaff === pwFor.id}
              >
                {busyStaff === pwFor.id ? "Saqlanmoqda…" : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
