import type { Metadata } from "next";
import { BookingStatus } from "@/components/booking/BookingStatus";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "So'rov holati — Dental Desk",
  description:
    "Onlayn yozilish so'rovingiz holatini tekshiring: tasdiqlangan vaqt va qabul manzili shu sahifada ko'rinadi.",
  robots: { index: false, follow: false },
};

type Query = { [key: string]: string | string[] | undefined };

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

export default async function BookingStatusPage({
  searchParams,
}: {
  searchParams: Promise<Query>;
}) {
  const params = await searchParams;
  // Accept both ?clinic=..&request=.. and the short form ?c=..&r=..
  const clinic = first(params.clinic) || first(params.c);
  const requestId = first(params.request) || first(params.r);
  const code = first(params.code);

  return (
    <BookingStatus
      code={code.slice(0, 16)}
      clinic={clinic.slice(0, 64)}
      requestId={requestId.slice(0, 64)}
    />
  );
}
