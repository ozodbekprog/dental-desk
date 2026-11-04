import { cookies } from "next/headers";
import { COOKIE_NAME, verifyToken, type SessionUser } from "./jwt";
import { prisma } from "./prisma";

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    select: { role: true },
  });
  return user?.role === "super";
}

export function canWriteRole(role: string): boolean {
  return ["owner", "admin", "doctor", "reception", "callcenter"].includes(role);
}

export function canManageRole(role: string): boolean {
  return ["owner", "admin"].includes(role);
}

export type ClinicState = {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
};

export function clinicWritable(clinic: ClinicState): boolean {
  if (clinic.status === "suspended" || clinic.status === "expired") return false;
  if (clinic.plan === "trial") {
    return !!clinic.trialEndsAt && clinic.trialEndsAt.getTime() > Date.now();
  }
  return true;
}
