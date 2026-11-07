import { prisma } from "@/lib/prisma";
import { refreshDoctorRating } from "@/lib/network";
import { normalizePhone, patientSession } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  bookingId?: unknown;
  rating?: unknown;
  comment?: unknown;
};

function fail(code: string, status: number) {
  return Response.json({ error: code }, { status });
}

export async function POST(request: Request) {
  const session = await patientSession();
  if (!session) return fail("unauthorized", 401);

  const account = await prisma.patientAccount.findUnique({ where: { id: session.uid } });
  if (!account) return fail("unauthorized", 401);

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body) return fail("bad_request", 400);

  const bookingId = String(body.bookingId || "").trim().slice(0, 64);
  const rating = Number(body.rating);
  const comment = String(body.comment || "").trim().slice(0, 500);

  if (!bookingId) return fail("booking_required", 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return fail("bad_rating", 400);

  const booking = await prisma.networkBooking.findUnique({ where: { id: bookingId } });
  if (!booking) return fail("not_found", 404);
  if (normalizePhone(booking.phone) !== account.phone) return fail("forbidden", 403);
  if (booking.status !== "confirmed" && booking.status !== "completed") {
    return fail("not_visited", 400);
  }

  const visitAt = new Date(`${booking.date}T${booking.time}:00+05:00`).getTime();
  if (!Number.isFinite(visitAt) || visitAt > Date.now()) return fail("not_visited", 400);

  const existing = await prisma.doctorReview.findUnique({ where: { bookingId } });
  if (existing) return fail("already_reviewed", 409);

  try {
    const review = await prisma.doctorReview.create({
      data: {
        doctorId: booking.doctorId,
        clinicId: booking.clinicId,
        patientId: account.id,
        bookingId,
        rating,
        comment,
        status: "published",
      },
      select: { id: true, rating: true, comment: true, createdAt: true },
    });
    await refreshDoctorRating(booking.doctorId);
    return Response.json({
      ok: true,
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.createdAt.toISOString(),
      },
    });
  } catch (error) {
    if ((error as { code?: unknown }).code === "P2002") return fail("already_reviewed", 409);
    return fail("server_error", 500);
  }
}
