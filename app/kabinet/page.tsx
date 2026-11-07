import Link from "next/link";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { AuthShell } from "@/components/AuthShell";
import { PatientLogin } from "@/components/patient/PatientLogin";
import { PatientCabinet } from "@/components/patient/PatientCabinet";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Bemor kabineti — Dental Desk",
  description:
    "Tashriflar tarixi, 3D tish xaritasi va bronlar — telefon raqami bilan himoyalangan bemor kabineti.",
};

export default async function KabinetPage() {
  const jar = await cookies();
  const token = jar.get("dd_patient")?.value;
  const session = token ? await verifyToken(token) : null;

  if (session && session.role === "patient") {
    return <PatientCabinet initialName={session.name} />;
  }

  return (
    <AuthShell
      title="Bemor kabineti"
      subtitle="Telefon raqamingiz bilan kiring — tashriflar tarixi, tish xaritasi va bronlar bir joyda."
      footer={
        <p className="grid gap-1">
          <span>
            Klinika xodimimisiz?{" "}
            <Link href="/login" className="font-semibold text-accent hover:underline">
              Klinika kirishi
            </Link>
          </span>
          <span>
            <Link href="/" className="font-semibold text-accent hover:underline">
              Bosh sahifa
            </Link>
          </span>
        </p>
      }
    >
      <PatientLogin />
    </AuthShell>
  );
}
