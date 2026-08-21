import { jsPDF } from "jspdf";
import type { ReportData } from "@/server/services/report.service";

export function generateReportPDF(report: ReportData): Blob {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("CareerPilot Report", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated ${new Date(report.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, margin, y);
  y += 10;

  doc.setFillColor(30, 58, 138);
  doc.roundedRect(margin, y, contentW, 28, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(`${report.overall}/100`, margin + 8, y + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(report.band, margin + 8, y + 19);
  doc.setFontSize(9);
  doc.text(
    `${report.targetRole ?? "No target role"}${report.targetCompany ? ` · ${report.targetCompany}` : ""}`,
    margin + 8,
    y + 25,
  );
  y += 36;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Category Breakdown", margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);

  for (const cat of report.categoryScores) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, y - 4, contentW, 8, 1, 1, "F");
    doc.setFont("helvetica", "bold");
    doc.text(cat.label, margin + 3, y + 1);
    doc.setFont("helvetica", "normal");
    doc.text(`${cat.score}/100`, margin + contentW - 20, y + 1);
    const barW = (cat.score / 100) * (contentW - 80);
    doc.setFillColor(226, 232, 240);
    doc.roundedRect(margin + 55, y - 2, contentW - 80, 4, 1, 1, "F");
    doc.setFillColor(37, 99, 235);
    doc.roundedRect(margin + 55, y - 2, barW, 4, 1, 1, "F");
    y += 11;
  }
  y += 4;

  if (report.strengths.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Strengths", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const s of report.strengths) {
      doc.setTextColor(22, 163, 74);
      doc.text("+", margin + 2, y);
      doc.setTextColor(51, 65, 85);
      doc.text(s.label, margin + 8, y);
      y += 5;
    }
    y += 3;
  }

  if (report.weaknesses.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Areas to Improve", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const w of report.weaknesses) {
      doc.setTextColor(220, 38, 38);
      doc.text("-", margin + 2, y);
      doc.setTextColor(51, 65, 85);
      doc.text(w.label, margin + 8, y);
      y += 5;
    }
    y += 3;
  }

  if (report.skillGaps.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Top Skill Gaps", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const g of report.skillGaps) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      doc.setTextColor(51, 65, 85);
      doc.text(`${g.skillName} (${g.currentRating}/${g.requiredRating}) — ${g.status.replace(/_/g, " ").toLowerCase()}`, margin + 3, y);
      y += 5;
    }
    y += 3;
  }

  if (report.recommendedActions.length > 0) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Recommended Next Steps", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (let i = 0; i < report.recommendedActions.length; i++) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const a = report.recommendedActions[i];
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 58, 138);
      doc.text(`${i + 1}.`, margin + 2, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      doc.text(a.title, margin + 8, y);
      y += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const desc = doc.splitTextToSize(a.description, contentW - 10);
      doc.text(desc, margin + 8, y);
      y += desc.length * 3.5 + 3;
      doc.setFontSize(9);
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `CareerPilot Report — Page ${i} of ${totalPages}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" },
    );
  }

  return doc.output("blob");
}
