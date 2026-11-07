"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const DEMO_PHONE = "+998 90 123 45 67";

const ERROR_TEXT: Record<string, string> = {
  enter_phone: "Telefon raqamini to'liq kiriting.",
  enter_code: "6 xonali kodni kiriting.",
  code_invalid: "Kod noto'g'ri. Qayta tekshiring.",
  code_expired: "Kod muddati tugagan. Yangi kod oling.",
  too_many_attempts: "Urinishlar tugadi. Yangi kod oling.",
  rate_limited: "Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.",
  generic: "Xatolik yuz berdi. Qayta urinib ko'ring.",
};

export function PatientLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [devCode, setDevCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const codeRef = useRef<HTMLInputElement | null>(null);
  const cooling = cooldown > 0;

  useEffect(() => {
    if (!cooling) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    const timer = setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    timerRef.current = timer;
    return () => clearInterval(timer);
  }, [cooling]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(event?: React.FormEvent) {
    event?.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/patient/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        demo?: boolean;
        devCode?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setError(
          res.status === 429
            ? ERROR_TEXT.rate_limited
            : ERROR_TEXT[json.error || ""] || ERROR_TEXT.generic
        );
        return;
      }
      setDevCode(json.demo && json.devCode ? json.devCode : "");
      setStep("code");
      setCode("");
      setCooldown(60);
    } catch {
      setError(ERROR_TEXT.generic);
    } finally {
      setBusy(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/patient/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(
          res.status === 429
            ? ERROR_TEXT.rate_limited
            : ERROR_TEXT[json.error || ""] || ERROR_TEXT.generic
        );
        return;
      }
      router.refresh();
    } catch {
      setError(ERROR_TEXT.generic);
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendCode} className="grid gap-4">
        <label className="grid gap-1.5 text-sm">
          <span className="font-semibold text-ink">Telefon raqami</span>
          <input
            className="dd-input"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder={DEMO_PHONE}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            maxLength={24}
            required
          />
        </label>

        <p className="text-xs leading-relaxed text-muted">
          Raqamga 6 xonali kod yuboramiz. Parol kerak emas — telefon raqami sizning
          hisobingiz.
        </p>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="dd-btn dd-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Yuborilmoqda…" : "Kod yuborish"}
        </button>

        <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs leading-relaxed text-muted">
          <p className="font-semibold text-ink">Demo hisob</p>
          <p className="mt-1">
            Telefon: <span className="dd-mono text-ink">{DEMO_PHONE}</span> (Dilnoza). Kod ekranda
            ko&apos;rsatiladi.
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="grid gap-4">
      <div className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-sm">
        <span className="text-muted">Kod yuborildi: </span>
        <span className="dd-mono font-semibold text-ink">{phone}</span>
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError("");
            setCode("");
          }}
          className="ml-2 text-xs font-semibold text-accent hover:underline"
        >
          o&apos;zgartirish
        </button>
      </div>

      {devCode ? (
        <div className="rounded-xl border border-accent/25 bg-accent-soft px-3 py-2 text-sm">
          <span className="font-semibold text-accent-strong">Demo rejim: kod </span>
          <span className="dd-mono text-base font-bold tracking-[0.2em] text-accent-strong">
            {devCode}
          </span>
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm">
        <span className="font-semibold text-ink">Tasdiqlash kodi</span>
        <input
          ref={codeRef}
          className="dd-input dd-mono text-center text-2xl font-bold tracking-[0.45em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D+/g, "").slice(0, 6))}
          required
        />
      </label>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-sm font-medium text-danger"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="dd-btn dd-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Tekshirilmoqda…" : "Kirish"}
      </button>

      <button
        type="button"
        onClick={() => sendCode()}
        disabled={busy || cooldown > 0}
        className="dd-btn dd-btn-ghost w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {cooldown > 0 ? `Qayta yuborish (${cooldown} s)` : "Kodni qayta yuborish"}
      </button>
    </form>
  );
}
