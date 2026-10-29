import { handleApiError, jsonError } from "@/lib/api";
import { generateInvoicePdf, loadInvoice } from "@/lib/invoice";
import { requirePermission } from "@/lib/rbac";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Params) {
  try {
    await requirePermission("managePayments");
    const { id } = await params;
    const data = await loadInvoice(id);
    if (!data) return jsonError("Rechnung nicht gefunden.", 404);

    try {
      const pdf = await generateInvoicePdf(data.invoice, data.settings);
      return new Response(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${data.invoice.invoiceNumber}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Rechnung konnte nicht erstellt werden.",
        422,
      );
    }
  } catch (error) {
    return handleApiError(error);
  }
}
