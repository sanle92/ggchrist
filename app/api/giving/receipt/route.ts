import { receiptLogo as logo } from "@/lib/receipt-logo";
import { privateDonation } from "@/lib/giving/server";
import { createServiceClient } from "@/lib/supabase/service";
import { money } from "@/lib/giving/shared";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function GET(request: Request) {
  try {
    const d = await privateDonation(
      new URL(request.url).searchParams.get("token"),
    );
    if (!d || !["successful", "refunded"].includes(d.status))
      return new Response("Receipt not available yet.", { status: 404 });
    const { data: s } = await createServiceClient()
      .from("site_settings")
      .select("contact_email,site_name")
      .maybeSingle();
    const rows = [
      ["Reference", d.reference],
      ["Donor", d.donor_name],
      ["Email", d.donor_email],
      ["Gift", money(d.amount_minor - d.processing_contribution, d.currency)],
      ["Processing support", money(d.processing_contribution, d.currency)],
      ["Total", money(d.amount_minor, d.currency)],
      ["Purpose", d.purpose],
      ["Campaign", d.campaigns?.title || "—"],
      ["Frequency", d.frequency === "monthly" ? "Monthly" : "One-time"],
      ["Date", d.paid_at],
      ["Provider", "Stripe"],
      ["Transaction", d.provider_transaction_id],
      ["Refunded", money(d.refunded_amount, d.currency)],
    ];
    return new Response(
      `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Donation receipt ${esc(d.reference)}</title><style>body{font:16px/1.6 system-ui;max-width:720px;margin:40px auto;padding:24px;color:#142b3f}h1{font-family:Georgia}table{width:100%;border-collapse:collapse}th,td{padding:12px;text-align:left;border-bottom:1px solid #ddd;overflow-wrap:anywhere}img{width:80px}</style><img src="data:image/png;base64,${logo}" alt="GGChrist"><h1>Glorious Gospel of Christ</h1><h2>Donation receipt</h2><p>Thank you for supporting the work of the Gospel.</p><table>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join("")}</table><p>“God loveth a cheerful giver.” — 2 Corinthians 9:7</p><p>${esc(s?.contact_email)}</p><p>Keep this receipt for your records. You can print or save it as a PDF using your browser.</p></html>`,
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${d.reference}.html"`,
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
          "Content-Security-Policy":
            "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'none'",
        },
      },
    );
  } catch {
    return new Response("Receipt unavailable. Please try again later.", {
      status: 503,
    });
  }
}
