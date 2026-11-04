import { getSession, type ClinicState } from "./auth";
import { prisma } from "./prisma";
import { jsonError } from "./util";

export async function clinicContext() {
  const session = await getSession();
  if (!session) return { error: jsonError("unauthorized", 401) };
  if (!session.cid) return { error: jsonError("no_clinic", 403) };

  // Role and membership are read fresh from the database so that role changes,
  // removals and clinic suspension take effect immediately, not after re-login.
  const user = await prisma.user.findUnique({
    where: { id: session.uid },
    include: { clinic: true },
  });
  if (!user || user.clinicId !== session.cid || !user.clinic) {
    return { error: jsonError("unauthorized", 401) };
  }

  return {
    session: {
      ...session,
      role: user.role,
      name: user.name,
      email: user.email,
    },
    clinic: user.clinic,
    user,
  };
}

export function clinicState(clinic: {
  plan: string;
  status: string;
  trialEndsAt: Date | null;
}): ClinicState {
  return { plan: clinic.plan, status: clinic.status, trialEndsAt: clinic.trialEndsAt };
}
