import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/AuthShell";
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

  return (
    <AuthShell
      title="Xush kelibsiz"
      subtitle="Klinika yoki shifokor hisobingizga kiring."
      footer={
        <p>
          Hisobingiz yo'qmi?{" "}
          <Link href="/signup" className="font-semibold text-accent hover:underline">
            14 kun bepul boshlang
          </Link>
        </p>
      }
    >
      <LoginForm next={next} />
    </AuthShell>
  );
}
