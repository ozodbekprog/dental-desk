import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { verifyToken, type SessionUser } from "@/lib/jwt";

export const PATIENT_COOKIE = "dd_patient";
export const PATIENT_ROLE = "patient";

/** Digits only; Uzbek numbers typed without the country code get 998 prepended. */
export function normalizePhone(raw: unknown): string {
  let digits = String(raw ?? "").replace(/\D+/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `998${digits}`;
  else if (digits.length === 10 && digits.startsWith("8")) digits = `998${digits.slice(1)}`;
  return digits;
}

export function isValidPhone(phone: string): boolean {
  return /^\d{9,15}$/.test(phone);
}

export function otpHash(phone: string, code: string): string {
  const secret = process.env.AUTH_SECRET || "dental-desk-demo-secret";
  return createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export function hashEquals(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (!left.length || left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function patientSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(PATIENT_COOKIE)?.value;
  if (!token) return null;
  const session = await verifyToken(token);
  if (!session || session.role !== PATIENT_ROLE) return null;
  return session;
}

export async function setPatientCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(PATIENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

export function parseJson(data: string): Record<string, unknown> {
  try {
    const value = JSON.parse(data);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function stringArray(value: unknown): string[] {
  return asArray(value).filter((item): item is string => typeof item === "string");
}
