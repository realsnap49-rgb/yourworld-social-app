import { jsPDF } from "jspdf";
import { inr, type PayoutBreakdown } from "./payout-math";

export type StatementInfo = {
  statementId: string;
  date: string;
  creatorName: string;
  username: string;
  email: string;
  pan: string;
};

/** Builds the "Payout Statement & Tax Invoice" PDF. Returns the jsPDF doc. */
export function buildPayoutPdf(info: StatementInfo, b: PayoutBreakdown) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 50;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("YourWorld", M, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Payout Statement & Tax Invoice", W - M, y, { align: "right" });

  y += 14;
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text("YourWorld Creator Payouts · support: Yourworld2029@gmail.com", M, y);
  doc.setTextColor(0);

  y += 16;
  doc.setDrawColor(210);
  doc.line(M, y, W - M, y);

  // Creator details
  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Creator Details", M, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rows: Array<[string, string]> = [
    ["Name", info.creatorName],
    ["Username", info.username],
    ["Email", info.email],
    ["PAN", info.pan || "—"],
    ["Statement ID", info.statementId],
    ["Date", info.date],
  ];
  y += 6;
  rows.forEach(([k, v]) => {
    y += 15;
    doc.setTextColor(110);
    doc.text(`${k}`, M, y);
    doc.setTextColor(0);
    doc.text(String(v), M + 110, y);
  });

  // Financial table
  y += 28;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Financial Summary", M, y);
  y += 12;

  const tableRows: Array<[string, string, boolean?]> = [
    ["Gross Deal Value (Ads & Brand)", inr(b.bySource.ads)],
    ["Gross Course Sales", inr(b.bySource.course)],
    ["Gross VIP Memberships", inr(b.bySource.vip)],
    ["Total Gross Value", inr(b.gross), true],
    ["GST @ 18% (on gross)", inr(b.gst)],
    ["Platform Share Deduction (30% Ads / 15% Courses & VIP)", `- ${inr(b.platformShare)}`],
    ["Creator Share", inr(b.creatorShare), true],
    ["TDS @ 1% (Sec 194J)", `- ${inr(b.tds)}`],
    ["Final Net Credited Amount", inr(b.net), true],
  ];

  doc.setFontSize(10);
  tableRows.forEach(([label, value, strong]) => {
    y += 20;
    if (strong) {
      doc.setFillColor(243, 244, 246);
      doc.rect(M, y - 13, W - M * 2, 18, "F");
      doc.setFont("helvetica", "bold");
    } else {
      doc.setFont("helvetica", "normal");
    }
    doc.text(label, M + 6, y);
    doc.text(value, W - M - 6, y, { align: "right" });
  });

  // Tax certificate note
  y += 32;
  const noteLines = doc.splitTextToSize(
    `Tax Certificate Note: TDS of ${inr(b.tds)} has been deposited to the Income Tax Department against your PAN ${info.pan || "—"}. Form 16A will be made available in your Wallet section at the end of the financial quarter for your ITR filing.`,
    W - M * 2 - 24,
  );
  const boxH = noteLines.length * 14 + 24;
  doc.setFillColor(255, 247, 224);
  doc.setDrawColor(240, 200, 120);
  doc.roundedRect(M, y, W - M * 2, boxH, 6, 6, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(90, 60, 0);
  doc.text(noteLines, M + 12, y + 18);
  doc.setTextColor(0);

  y += boxH + 26;
  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(
    "This is a system-generated statement and does not require a signature.",
    M,
    y,
  );

  return doc;
}

export function payoutPdfBase64(info: StatementInfo, b: PayoutBreakdown) {
  const out = buildPayoutPdf(info, b).output("datauristring");
  return out.slice(out.indexOf(",") + 1);
}

export function downloadPayoutPdf(info: StatementInfo, b: PayoutBreakdown) {
  buildPayoutPdf(info, b).save(`${info.statementId}-payout-statement.pdf`);
}
