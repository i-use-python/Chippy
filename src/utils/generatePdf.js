/**
 * generatePdf.js — Generates a professional job record PDF using jsPDF.
 */

import jsPDF from 'jspdf';

export function generatePdf(job) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // ── Header: yellow bar ──
  doc.setFillColor(255, 212, 0); // #FFD400
  doc.rect(0, 0, pageWidth, 32, 'F');

  // Hazard stripe (thin bar at top)
  const stripeHeight = 4;
  for (let x = 0; x < pageWidth; x += 8) {
    doc.setFillColor(10, 10, 10); // #0A0A0A
    doc.triangle(x, 0, x + 4, 0, x + 4, stripeHeight, 'F');
    doc.triangle(x + 4, stripeHeight, x + 8, stripeHeight, x + 8, 0, 'F');
  }

  doc.setTextColor(10, 10, 10);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Chippy', margin, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Job Record', margin, 26);

  y = 44;

  // ── Job Details ──
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');

  const dateStr = new Date(job.date).toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.text(`ADDRESS`, margin, y);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text(job.address || 'Not specified', margin, y + 6);

  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATE`, margin + contentWidth / 2, y);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text(dateStr, margin + contentWidth / 2, y + 6);

  if (job.client) {
    y += 16;
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('CLIENT', margin, y);
    doc.setTextColor(10, 10, 10);
    doc.setFont('helvetica', 'bold');
    doc.text(job.client, margin, y + 6);
  }

  y += 20;

  // ── Divider ──
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  const report = job.report;
  if (!report) {
    doc.setTextColor(100, 100, 100);
    doc.text('No report generated.', margin, y);
    return doc;
  }

  // ── Work Performed ──
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text('Work Performed', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const workLines = doc.splitTextToSize(report.workPerformed, contentWidth);
  doc.text(workLines, margin, y);
  y += workLines.length * 5 + 10;

  // ── Materials Used ──
  if (report.materialsUsed && report.materialsUsed.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Materials Used', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 74, 74);
    report.materialsUsed.forEach((item) => {
      doc.text(`•  ${item}`, margin + 2, y);
      y += 6;
    });
    y += 6;
  }

  // ── Notes ──
  if (report.notes && report.notes.length > 0) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Notes', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 74, 74);
    report.notes.forEach((note) => {
      const noteLines = doc.splitTextToSize(`•  ${note}`, contentWidth - 4);
      doc.text(noteLines, margin + 2, y);
      y += noteLines.length * 5 + 3;
    });
    y += 6;
  }

  // ── Photos (thumbnails) ──
  const photosWithData = (job.photos || []).filter((p) => p.dataUrl);
  if (photosWithData.length > 0) {
    // Check if we need a new page
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(10, 10, 10);
    doc.text('Photos', margin, y);
    y += 8;

    const thumbSize = 30;
    const gap = 4;
    const perRow = Math.floor(contentWidth / (thumbSize + gap));
    let col = 0;

    photosWithData.forEach((photo) => {
      try {
        const x = margin + col * (thumbSize + gap);
        doc.addImage(photo.dataUrl, 'JPEG', x, y, thumbSize, thumbSize);

        // Label badge
        doc.setFontSize(6);
        doc.setFillColor(255, 212, 0);
        doc.setDrawColor(10, 10, 10);
        const label = (photo.label || 'untagged').toUpperCase();
        doc.roundedRect(x, y + thumbSize - 5, thumbSize, 5, 0, 0, 'FD');
        doc.setTextColor(10, 10, 10);
        doc.text(label, x + thumbSize / 2, y + thumbSize - 1.5, {
          align: 'center',
        });

        col++;
        if (col >= perRow) {
          col = 0;
          y += thumbSize + gap + 2;
        }
      } catch (e) {
        // Skip photos that fail to embed
      }
    });

    y += thumbSize + 10;
  }

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 12;
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated by Chippy — getchippy.co.nz', margin, footerY);
  doc.text(dateStr, pageWidth - margin, footerY, { align: 'right' });

  return doc;
}
