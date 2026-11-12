"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ToothChart3D, type ToothMarks } from "./ToothChart3D";
import {
  GENERAL_PROCEDURES,
  PROCEDURE_MAP,
  QUICK_NOTES,
  SURFACES,
  TOOTH_PROCEDURES,
  procedureLabel,
  toothLabel,
} from "./treatments";
import type {
  DoctorBookingDTO,
  DoctorProfileDTO,
  TreatmentDTO,
  TreatmentDraftItem,
} from "./types";

type Props = {
  profile: DoctorProfileDTO;
  bookings: DoctorBookingDTO[];
  treatments: TreatmentDTO[];
  treatmentsLoading: boolean;
  onSaved: (message: string) => void;
  onGoRequests: () => void;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function fmtDate(date: string): string {
  const parts = String(date || "").split("-");
  if (parts.length !== 3) return date || "—";
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function fmtTimeRange(time: string, duration: number): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(time || "").trim());
  if (!match) return time || "—";
  const minutes = Number(match[1]) * 60 + Number(match[2]) + (duration > 0 ? duration : 30);
  const end = minutes % (24 * 60);
  return `${pad2(Number(match[1]))}:${match[2]}–${pad2(Math.floor(end / 60))}:${pad2(end % 60)}`;
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return ymd(d);
}

export function TreatmentPanel({
  profile,
  bookings,
  treatments,
  treatmentsLoading,
  onSaved,
  onGoRequests,
}: Props) {
  const today = ymd(new Date());
  const [patientId, setPatientId] = useState("");
  const [pickedTeeth, setPickedTeeth] = useState<number[]>([]);
  const [pickedProcs, setPickedProcs] = useState<string[]>([]);
  const [surfaces, setSurfaces] = useState<string[]>([]);
  const [quickNotes, setQuickNotes] = useState<string[]>([]);
  const [freeNote, setFreeNote] = useState("");
  const [draft, setDraft] = useState<TreatmentDraftItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const activeChipRef = useRef<HTMLButtonElement | null>(null);

  const candidates = useMemo(() => {
    const confirmed = bookings
      .filter((b) => b.status === "confirmed")
      .slice()
      .sort((a, b) => {
        const rank = (item: DoctorBookingDTO) =>
          item.date === today ? 0 : item.date > today ? 1 : 2;
        const ra = rank(a);
        const rb = rank(b);
        if (ra !== rb) return ra - rb;
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.time.localeCompare(b.time);
      });
    const completed = bookings
      .filter((b) => b.status === "completed" && b.date >= daysAgoStr(14))
      .slice()
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
      .slice(0, 8);
    return [...confirmed, ...completed];
  }, [bookings, today]);

  useEffect(() => {
    if (!candidates.length) {
      if (patientId) setPatientId("");
      return;
    }
    if (!candidates.some((b) => b.id === patientId)) {
      setPatientId(candidates[0].id);
    }
  }, [candidates, patientId]);

  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [patientId]);

  const patient = candidates.find((b) => b.id === patientId) || null;
  const patientHistory = useMemo(
    () =>
      treatments
        .filter((t) => t.bookingId === patientId)
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [treatments, patientId]
  );

  const marks = useMemo<ToothMarks>(() => {
    const map: ToothMarks = {};
    for (const item of patientHistory) {
      if (!item.tooth) continue;
      (map[item.tooth] ||= []).push(item.procedure);
    }
    for (const item of draft) {
      if (!item.tooth) continue;
      (map[item.tooth] ||= []).push(item.procedure);
    }
    return map;
  }, [patientHistory, draft]);

  const selectedToothProcs = pickedProcs.filter((key) => PROCEDURE_MAP[key]?.needsTooth);
  const selectedGeneralProcs = pickedProcs.filter((key) => !PROCEDURE_MAP[key]?.needsTooth);
  const needsSurface = pickedProcs.some((key) => PROCEDURE_MAP[key]?.surfaces);
  const canAdd =
    pickedProcs.length > 0 && (selectedGeneralProcs.length > 0 || pickedTeeth.length > 0);

  function toggleTooth(tooth: number) {
    setError("");
    setPickedTeeth((prev) =>
      prev.includes(tooth) ? prev.filter((t) => t !== tooth) : [...prev, tooth].sort((a, b) => a - b)
    );
  }

  function toggleProc(key: string) {
    setError("");
    setPickedProcs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleSurface(key: string) {
    setSurfaces((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleQuickNote(note: string) {
    setQuickNotes((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  }

  function addDraft() {
    if (!patient) return;
    if (!canAdd) {
      setError("Avval tishni va muolajani tanlang.");
      return;
    }
    if (selectedToothProcs.length && !pickedTeeth.length) {
      setError("Tish muolajasi uchun kamida bitta tishni tanlang.");
      return;
    }
    const items: TreatmentDraftItem[] = [];
    for (const proc of selectedToothProcs) {
      for (const tooth of pickedTeeth) {
        items.push({
          tooth,
          procedure: proc,
          surfaces: PROCEDURE_MAP[proc]?.surfaces ? surfaces.join("") : "",
        });
      }
    }
    for (const proc of selectedGeneralProcs) {
      items.push({ tooth: 0, procedure: proc, surfaces: "" });
    }
    const existing = new Set(draft.map((d) => `${d.tooth}:${d.procedure}:${d.surfaces}`));
    const fresh = items.filter((item) => !existing.has(`${item.tooth}:${item.procedure}:${item.surfaces}`));
    if (!fresh.length) {
      setError("Bu tanlov ro'yxatda allaqachon bor.");
      return;
    }
    setDraft((prev) => [...prev, ...fresh]);
    setPickedTeeth([]);
    setPickedProcs([]);
    setSurfaces([]);
    setError("");
  }

  function removeDraft(index: number) {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function clearAll() {
    setPickedTeeth([]);
    setPickedProcs([]);
    setSurfaces([]);
    setQuickNotes([]);
    setFreeNote("");
    setDraft([]);
    setError("");
  }

  async function save(complete: boolean) {
    if (!patient || !draft.length || saving) return;
    setSaving(true);
    setError("");
    const note = [...quickNotes, freeNote.trim()].filter(Boolean).join(" · ").slice(0, 500);
    try {
      const res = await fetch("/api/doktor/treatments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: patient.id,
          items: draft,
          note,
          complete,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.message || data?.error || "Davolash saqlanmadi. Qayta urinib ko'ring.");
        return;
      }
      const count = Number(data?.created) || draft.length;
      onSaved(
        `${patient.name || "Bemor"} uchun ${count} ta muolaja saqlandi${
          data?.complete ? " va qabul yakunlandi" : ""
        }. 3D belgilar saqlandi.`
      );
      clearAll();
    } catch {
      setError("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  if (!candidates.length) {
    return (
      <section className="mt-5 space-y-4">
        <div>
          <h2 className="dd-display text-xl font-bold text-ink">Davolash</h2>
          <p className="mt-0.5 text-sm text-muted">
            Tishni belgilash uchun avval so&apos;rovni tasdiqlang — bemor shu bo&apos;limda
            avtomatik paydo bo&apos;ladi.
          </p>
        </div>
        <div className="dd-card dd-noise px-6 py-12 text-center">
          <p className="dd-display text-lg font-bold text-ink">Tasdiqlangan bemor yo&apos;q</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
            So&apos;rovlar bo&apos;limida yangi so&apos;rovni tasdiqlang. Shundan keyin bemorni
            tanlab, 3D sxemada tishlarni belgilashingiz mumkin.
          </p>
          <button type="button" onClick={onGoRequests} className="dd-btn dd-btn-primary mt-5">
            So&apos;rovlarga o&apos;tish
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-5 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="dd-display text-xl font-bold text-ink">Davolash</h2>
          <p className="mt-0.5 text-sm text-muted">
            Bemorni tanlang, 3D sxemada tishni bosing va muolajani belgilang — hech narsa
            yozish shart emas.
          </p>
        </div>
        <span className="dd-mono text-xs text-muted">
          {profile.name} · {treatments.length} yozuv
        </span>
      </div>

      <div className="dd-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">1. Bemor</p>
          <span className="text-xs text-muted">Tasdiqlangan qabullar · avtomatik tanlanadi</span>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {candidates.map((booking) => {
            const active = booking.id === patientId;
            const isToday = booking.date === today;
            const done = booking.status === "completed";
            return (
              <button
                key={booking.id}
                type="button"
                ref={active ? activeChipRef : undefined}
                onClick={() => {
                  setPatientId(booking.id);
                  clearAll();
                }}
                className={`min-w-[190px] shrink-0 rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-accent bg-accent-soft/60 ring-2 ring-accent/20"
                    : "border-line bg-surface hover:border-accent/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-bold text-ink">{booking.name || "Bemor"}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      done ? "bg-ok/10 text-ok" : isToday ? "bg-accent/10 text-accent" : "bg-surface-2 text-muted"
                    }`}
                  >
                    {done ? "Yakunlangan" : isToday ? "Bugun" : fmtDate(booking.date)}
                  </span>
                </div>
                <p className="dd-mono mt-1 text-xs text-muted">
                  {fmtDate(booking.date)} · {fmtTimeRange(booking.time, booking.duration)}
                </p>
                {booking.reason ? (
                  <p className="mt-1 truncate text-xs text-ink-soft">{booking.reason}</p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {patient ? (
        <>
          <div className="grid gap-3 lg:grid-cols-[1.25fr_1fr]">
            <div className="dd-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold text-ink">2. Tishni tanlang</p>
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-[11px] font-bold text-accent">
                  {pickedTeeth.length
                    ? pickedTeeth.map((t) => `${t}`).join(", ")
                    : "Tish tanlanmagan"}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-muted">
                {patient.name || "Bemor"} · {fmtDate(patient.date)} ·{" "}
                {fmtTimeRange(patient.time, patient.duration)}
                {patient.phone ? ` · ${patient.phone}` : ""}
              </p>
              <div className="mt-3">
                <ToothChart3D
                  marks={marks}
                  selected={pickedTeeth}
                  onToggle={toggleTooth}
                  interactive
                  showGrid
                  height={340}
                />
              </div>
              {patientHistory.some((t) => t.tooth > 0) ? (
                <p className="mt-2 text-xs text-muted">
                  Rangli tishlar — bu bemorning oldingi davolashlari. Tafsilot uchun tish ustiga
                  kursorni olib boring.
                </p>
              ) : null}
            </div>

            <div className="dd-card p-4 sm:p-5">
              <p className="text-sm font-bold text-ink">3. Muolaja</p>
              <p className="mt-0.5 text-xs text-muted">
                Bir yoki bir nechta muolajani tanlang. Tanlangan tishlarga birga qo&apos;shiladi.
              </p>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
                Tish muolajalari
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TOOTH_PROCEDURES.map((proc) => {
                  const active = pickedProcs.includes(proc.key);
                  return (
                    <button
                      key={proc.key}
                      type="button"
                      onClick={() => toggleProc(proc.key)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-transparent text-white"
                          : "border-line bg-surface text-ink-soft hover:border-accent/50"
                      }`}
                      style={active ? { background: proc.color } : undefined}
                    >
                      {!active ? (
                        <i
                          className="h-2 w-2 rounded-full"
                          style={{ background: proc.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {proc.label}
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
                Umumiy muolajalar
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {GENERAL_PROCEDURES.map((proc) => {
                  const active = pickedProcs.includes(proc.key);
                  return (
                    <button
                      key={proc.key}
                      type="button"
                      onClick={() => toggleProc(proc.key)}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-transparent text-white"
                          : "border-line bg-surface text-ink-soft hover:border-accent/50"
                      }`}
                      style={active ? { background: proc.color } : undefined}
                    >
                      {!active ? (
                        <i
                          className="h-2 w-2 rounded-full"
                          style={{ background: proc.color }}
                          aria-hidden="true"
                        />
                      ) : null}
                      {proc.label}
                    </button>
                  );
                })}
              </div>

              {needsSurface ? (
                <>
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted">
                    Yuzalar (ixtiyoriy)
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {SURFACES.map((surface) => {
                      const active = surfaces.includes(surface.key);
                      return (
                        <button
                          key={surface.key}
                          type="button"
                          onClick={() => toggleSurface(surface.key)}
                          aria-pressed={active}
                          title={surface.label}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                            active
                              ? "border-accent bg-accent text-white"
                              : "border-line bg-surface text-ink-soft hover:border-accent/50"
                          }`}
                        >
                          {surface.key}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={addDraft}
                  disabled={!canAdd}
                  className="dd-btn dd-btn-primary !px-3.5 !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Ro&apos;yxatga qo&apos;shish
                </button>
                <span className="text-xs text-muted">
                  {pickedTeeth.length
                    ? `${pickedProcs.length} muolaja × ${pickedTeeth.length} tish`
                    : `${pickedProcs.length} muolaja`}
                </span>
              </div>
              {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}

              <div className="mt-4 rounded-xl border border-dashed border-line bg-surface-2/60 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                  Tanlangan
                </p>
                {pickedTeeth.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {pickedTeeth.map((tooth) => (
                      <button
                        key={tooth}
                        type="button"
                        onClick={() => toggleTooth(tooth)}
                        title="Tanlovdan olib tashlash"
                        className="rounded-lg border border-accent/40 bg-accent/5 px-2 py-1 text-[11px] font-bold text-accent transition hover:bg-accent/10"
                      >
                        {tooth}-tish ×
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-muted">
                    3D sxemada yoki pastdagi kataklardan tishni tanlang.
                  </p>
                )}
                {pickedProcs.length ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pickedProcs.map((key) => (
                      <span
                        key={key}
                        className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                        style={{
                          background: PROCEDURE_MAP[key]?.color || "#587076",
                        }}
                      >
                        {PROCEDURE_MAP[key]?.label || key}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              {patientHistory.length ? (
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                    Oldingi davolashlar
                  </p>
                  <ul className="mt-1.5 max-h-32 space-y-1 overflow-y-auto pr-1">
                    {patientHistory.slice(0, 8).map((item) => (
                      <li key={item.id} className="flex items-center gap-2 text-xs text-ink-soft">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: PROCEDURE_MAP[item.procedure]?.color || "#587076" }}
                        />
                        <span className="dd-mono shrink-0 font-semibold">
                          {item.tooth ? `${item.tooth}-tish` : "Umumiy"}
                        </span>
                        <span className="truncate">{procedureLabel(item.procedure)}</span>
                        <span className="ml-auto shrink-0 text-muted">{fmtDate(item.date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>

          <div className="dd-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink">4. Saqlash</p>
              <span className="dd-mono text-xs text-muted">{draft.length} ta yozuv</span>
            </div>

            {draft.length ? (
              <ul className="mt-3 divide-y divide-line/70 rounded-xl border border-line">
                {draft.map((item, index) => (
                  <li key={`${item.tooth}-${item.procedure}-${index}`} className="flex items-center gap-3 px-3 py-2.5">
                    <span
                      className="flex h-7 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                      style={{ background: PROCEDURE_MAP[item.procedure]?.color || "#587076" }}
                    >
                      {item.tooth ? item.tooth : "★"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {procedureLabel(item.procedure)}
                        {item.surfaces ? (
                          <span className="dd-mono ml-2 text-xs font-normal text-muted">
                            {item.surfaces.split("").join(" ")}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">
                        {item.tooth ? toothLabel(item.tooth) : "Umumiy muolaja"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDraft(index)}
                      className="dd-btn dd-btn-ghost !px-2 !py-1 text-xs"
                      aria-label="O'chirish"
                    >
                      O&apos;chirish
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted">
                Tanlangan muolajalar shu yerda ko&apos;rinadi. Tishni bosib, muolajani tanlang va
                &ldquo;Ro&apos;yxatga qo&apos;shish&rdquo; tugmasini bosing.
              </p>
            )}

            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                Tez izoh (ixtiyoriy)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {QUICK_NOTES.map((note) => {
                  const active = quickNotes.includes(note);
                  return (
                    <button
                      key={note}
                      type="button"
                      onClick={() => toggleQuickNote(note)}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        active
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-line bg-surface text-ink-soft hover:border-accent/50"
                      }`}
                    >
                      {note}
                    </button>
                  );
                })}
              </div>
              <input
                className="dd-input mt-2 !py-2 text-sm"
                maxLength={200}
                placeholder="Qo'shimcha izoh (majburiy emas)"
                value={freeNote}
                onChange={(e) => setFreeNote(e.target.value)}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <button
                type="button"
                onClick={() => void save(false)}
                disabled={!draft.length || saving}
                className="dd-btn dd-btn-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saqlanmoqda…" : "Saqlash"}
              </button>
              {patient.status === "confirmed" ? (
                <button
                  type="button"
                  onClick={() => void save(true)}
                  disabled={!draft.length || saving}
                  className="dd-btn dd-btn-ghost !border-ok/40 !text-ok hover:!bg-ok/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Saqlash va qabulni yakunlash
                </button>
              ) : null}
              {draft.length ? (
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={saving}
                  className="dd-btn dd-btn-ghost ml-auto text-sm"
                >
                  Tozalash
                </button>
              ) : null}
            </div>
            {treatmentsLoading ? (
              <p className="mt-2 text-xs text-muted">Oldingi davolashlar yuklanmoqda…</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
