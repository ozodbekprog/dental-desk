import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
import { DemoRoleLogin } from "@/components/DemoRoleLogin";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    if (session.role === "super") redirect("/admin");
    if (session.role === "doctor" && !session.cid) redirect("/doktor");
    redirect("/app");
  }

  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : undefined;

  const demoEnabled = process.env.DEMO_ENABLED !== "false";

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Klinika, shifokor yoki boshqa rol hisobingizga kiring."
      footer={
        <div className="grid gap-1.5">
          <p>
            Hisobingiz yo'qmi?{" "}
            <Link href="/signup" className="font-semibold text-accent hover:underline">
              14 kun bepul boshlang
            </Link>
          </p>
          <p>
            Bemormisiz?{" "}
            <Link href="/kabinet" className="font-semibold text-accent hover:underline">
              Bemor kabinetiga kiring
            </Link>
          </p>
        </div>
      }
    >
      <LoginForm next={next} />
      {demoEnabled ? <DemoRoleLogin /> : null}
    </AuthShell>
  );
}
