import { isSuperAdmin } from "@/lib/auth";
import { markInvoicePaid } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { jsonError } from "@/lib/util";

export const runtime = "nodejs";

const METHODS = ["manual", "bank", "payme", "click"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await isSuperAdmin())) return jsonError("forbidden", 403);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const status = String(body?.status || "");
  const method = METHODS.includes(String(body?.method)) ? String(body.method) : "manual";

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return jsonError("not_found", 404);

  if (status === "paid") {
    const result = await markInvoicePaid(id, method);
    if ("error" in result) {
      return jsonError(result.error, result.error === "not_found" ? 404 : 409);
    }
    return Response.json({
      ok: true,
      paidUntil: result.paidUntil.toISOString(),
    });
  }

  if (status === "void") {
    if (invoice.status === "paid") return jsonError("already_paid", 409);
    await prisma.invoice.update({ where: { id }, data: { status: "void" } });
    return Response.json({ ok: true });
  }

  return jsonError("status_invalid");
}