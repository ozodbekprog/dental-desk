import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/SignupForm";

export default async function SignupPage() {
  const session = await getSession();
  if (session) redirect(session.role === "super" ? "/admin" : "/app");

  return (
    <AuthShell
      title="Klinikangizni 5 daqiqada ishga tushiring"
      subtitle="Hisob yarating — 14 kun davomida barcha imkoniyatlar bepul."
      footer={
        <p>
          Hisobingiz bormi?{" "}
          <Link href="/login" className="font-semibold text-accent hover:underline">
            Kirish
          </Link>
        </p>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
