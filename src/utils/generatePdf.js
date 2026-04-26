/**
 * generatePdf.js — Generates a professional job record PDF using jsPDF.
 * Layout matches the on-screen ReviewReport.jsx and tradie_sample_report_5.pdf reference.
 */

import jsPDF from 'jspdf';
import { getBusinessProfile } from './jobStore';

// ── Helpers ──

function formatDateLong(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NZ', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatTime12(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-NZ', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function formatDuration(startISO, finishISO) {
  if (!startISO || !finishISO) return '—';
  const ms = new Date(finishISO) - new Date(startISO);
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function parseMaterial(str) {
  const timesMatch = str.match(/^(.+?)\s*[×x]\s*(\d+.*)$/i);
  if (timesMatch) return { item: timesMatch[1].trim(), qty: timesMatch[2].trim() };
  const leadMatch = str.match(/^(\d+)\s*x\s+(.+)$/i);
  if (leadMatch) return { item: leadMatch[2].trim(), qty: leadMatch[1] };
  return { item: str, qty: '—' };
}

function checkPageBreak(doc, y, needed) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return 20;
  }
  return y;
}

// ── Numbered section header (black circle + title + optional tag) ──

function drawSectionHeader(doc, margin, y, number, title, tag) {
  // Black circle with number
  doc.setFillColor(10, 10, 10);
  doc.circle(margin + 4, y - 2, 4, 'F');
  doc.setTextColor(255, 212, 0);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(String(number), margin + 4, y - 0.5, { align: 'center' });

  // Title
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), margin + 12, y);

  // Optional tag (yellow pill on right)
  if (tag) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const tagWidth = doc.getTextWidth(tag) + 6;
    const tagX = pageWidth - margin - tagWidth;
    doc.setFillColor(255, 212, 0);
    doc.roundedRect(tagX, y - 5, tagWidth, 7, 1, 1, 'F');
    doc.setTextColor(10, 10, 10);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(tag, tagX + 3, y - 0.5);
  }

  return y + 6;
}

// ── Main export ──

export function generatePdf(job) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const profile = getBusinessProfile() || {};
  let y = 0;

  // ════════════════════════════════════════
  // YELLOW HEADER BAR WITH HAZARD STRIPE
  // ════════════════════════════════════════

  doc.setFillColor(255, 212, 0);
  doc.rect(0, 0, pageWidth, 36, 'F');

  // Hazard stripe at very top
  const stripeH = 4;
  for (let x = 0; x < pageWidth; x += 8) {
    doc.setFillColor(10, 10, 10);
    doc.triangle(x, 0, x + 4, 0, x + 4, stripeH, 'F');
    doc.triangle(x + 4, stripeH, x + 8, stripeH, x + 8, 0, 'F');
  }

  // ════════════════════════════════════════
  // BUSINESS HEADER
  // ════════════════════════════════════════

  y = 18;
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.businessName || 'Chippy', margin, y);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(profile.tagline || '', margin, y + 6);

  y = 42;
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text([profile.phone, profile.email].filter(Boolean).join(' · '), margin, y);
  y += 4;
  if (profile.lbpNumber) {
    doc.text(`Licensed Building Practitioner · LBP #${profile.lbpNumber}`, margin, y);
    y += 4;
  }
  if (profile.nzbn) {
    doc.text(`NZBN: ${profile.nzbn}`, margin, y);
    y += 4;
  }

  // Divider
  y += 2;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ════════════════════════════════════════
  // JOB RECORD HEADER
  // ════════════════════════════════════════

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont('helvetica', 'normal');
  doc.text('JOB RECORD', margin, y);
  if (job.ref) {
    doc.text(`Ref: ${job.ref}`, pageWidth - margin, y, { align: 'right' });
  }
  y += 4;
  doc.setFontSize(7);
  doc.text(formatDateLong(job.date), margin, y);
  y += 6;

  doc.setFontSize(14);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(job.jobTitle || 'Job Report', contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('JOB COMPLETION RECORD · FOR CLIENT RECORDS', margin, y);
  y += 6;

  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ════════════════════════════════════════
  // TWO-COLUMN: CLIENT + JOB DETAILS
  // ════════════════════════════════════════

  const colLeft = margin;
  const colRight = margin + contentWidth / 2 + 5;
  const colY = y;

  // Left column — Client
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('CLIENT', colLeft, colY);

  doc.setFontSize(9);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text(job.clientName || '—', colLeft, colY + 5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const addrLines = doc.splitTextToSize(job.clientAddress || job.address || '—', contentWidth / 2 - 5);
  doc.text(addrLines, colLeft, colY + 10);
  doc.text(job.clientPhone || '—', colLeft, colY + 10 + addrLines.length * 3.5);

  // Right column — Job Details
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('JOB DETAILS', colRight, colY);

  doc.setFontSize(7);
  doc.setTextColor(74, 74, 74);
  doc.setFont('helvetica', 'normal');
  let ry = colY + 5;
  doc.text(`Location: ${job.jobLocation || '—'}`, colRight, ry); ry += 4;
  doc.text(`Date on site: ${formatDateShort(job.date)}`, colRight, ry); ry += 4;
  doc.text(`Start: ${formatTime12(job.startTime)} · Finish: ${formatTime12(job.finishTime)}`, colRight, ry); ry += 4;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(`Total time on site: ${formatDuration(job.startTime, job.finishTime)}`, colRight, ry);

  y = Math.max(colY + 10 + addrLines.length * 3.5 + 5, ry + 5) + 4;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // ════════════════════════════════════════
  // REPORT SECTIONS
  // ════════════════════════════════════════

  const report = job.report;
  if (!report) {
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(9);
    doc.text('No report generated.', margin, y);
    return doc;
  }

  // ── Section 1: Work Performed ──
  y = checkPageBreak(doc, y, 30);
  y = drawSectionHeader(doc, margin, y, 1, 'Work Performed', `● VOICE · ${formatDateShort(job.date)}`);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const workLines = doc.splitTextToSize(report.workPerformed || '', contentWidth);
  doc.text(workLines, margin, y);
  y += workLines.length * 4.5 + 8;

  // ── Section 2: Materials Used (table) ──
  if (report.materialsUsed && report.materialsUsed.length > 0) {
    y = checkPageBreak(doc, y, 20 + report.materialsUsed.length * 7);
    y = drawSectionHeader(doc, margin, y, 2, 'Materials Used');

    // Table header bar
    doc.setFillColor(10, 10, 10);
    doc.rect(margin, y - 3, contentWidth, 8, 'F');
    doc.setTextColor(255, 212, 0);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('ITEM', margin + 3, y + 1);
    doc.text('QTY', pageWidth - margin - 3, y + 1, { align: 'right' });
    y += 8;

    // Table rows
    report.materialsUsed.forEach((raw, i) => {
      y = checkPageBreak(doc, y, 7);
      const { item, qty } = parseMaterial(raw);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(margin, y - 3.5, contentWidth, 7, 'F');
      }
      doc.setTextColor(74, 74, 74);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item, margin + 3, y);
      doc.setFontSize(7);
      doc.text(qty, pageWidth - margin - 3, y, { align: 'right' });
      y += 7;
    });
    y += 6;
  }

  // ── Section 3: Notes & Findings ──
  if (report.notes && report.notes.length > 0) {
    y = checkPageBreak(doc, y, 15 + report.notes.length * 8);
    y = drawSectionHeader(doc, margin, y, 3, 'Notes & Findings');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(74, 74, 74);
    report.notes.forEach((note) => {
      y = checkPageBreak(doc, y, 10);
      // Yellow › marker
      doc.setTextColor(255, 212, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('›', margin + 2, y);
      // Note text
      doc.setTextColor(74, 74, 74);
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(note, contentWidth - 10);
      doc.text(noteLines, margin + 8, y);
      y += noteLines.length * 4 + 3;
    });
    y += 4;
  }

  // ── Section 4: Photos ──
  const photosWithData = (job.photos || []).filter((p) => p.dataUrl);
  if (photosWithData.length > 0) {
    y = checkPageBreak(doc, y, 50);
    y = drawSectionHeader(doc, margin, y, 4, 'Photos', `TAGGED · ${photosWithData.length} PHOTO${photosWithData.length !== 1 ? 'S' : ''}`);

    // Group by label
    const groups = {};
    photosWithData.forEach((p) => {
      const label = p.label || 'untagged';
      if (!groups[label]) groups[label] = [];
      groups[label].push(p);
    });
    const labelOrder = ['before', 'in-progress', 'completed', 'untagged'];
    const sortedLabels = Object.keys(groups).sort(
      (a, b) => labelOrder.indexOf(a) - labelOrder.indexOf(b)
    );

    const thumbSize = 28;
    const gap = 3;
    const cols = 3;

    sortedLabels.forEach((label) => {
      const photos = groups[label];
      const rows = Math.ceil(photos.length / cols);
      y = checkPageBreak(doc, y, 10 + rows * (thumbSize + gap));

      // Yellow label pill
      const pillText = `${label.replace('-', ' ').toUpperCase()} (${photos.length})`;
      const pillWidth = doc.getTextWidth(pillText) * 1.3 + 6;
      doc.setFillColor(255, 212, 0);
      doc.roundedRect(margin, y - 3, pillWidth, 6, 1, 1, 'F');
      doc.setTextColor(10, 10, 10);
      doc.setFontSize(5);
      doc.setFont('helvetica', 'bold');
      doc.text(pillText, margin + 3, y);
      y += 5;

      // Photo grid
      let col = 0;
      photos.forEach((photo) => {
        try {
          const x = margin + col * (thumbSize + gap);
          doc.addImage(photo.dataUrl, 'JPEG', x, y, thumbSize, thumbSize);
          doc.setDrawColor(200, 200, 200);
          doc.rect(x, y, thumbSize, thumbSize, 'S');
        } catch (e) {
          // Skip photos that fail to embed
        }
        col++;
        if (col >= cols) {
          col = 0;
          y += thumbSize + gap;
        }
      });
      if (col > 0) y += thumbSize + gap; // finish partial row
      y += 4;
    });
  }

  // ════════════════════════════════════════
  // SIGN-OFF BLOCK
  // ════════════════════════════════════════

  y = checkPageBreak(doc, y, 40);
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const sigWidth = contentWidth / 2 - 5;
  const sigHeight = 20;
  const sigLeftX = margin;
  const sigRightX = margin + contentWidth / 2 + 5;

  // Left — Tradie
  doc.setFillColor(255, 212, 0);
  const tradieLabel = 'TRADIE SIGN-OFF';
  doc.roundedRect(sigLeftX, y - 3, doc.getTextWidth(tradieLabel) * 1.5 + 6, 6, 1, 1, 'F');
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  doc.text(tradieLabel, sigLeftX + 3, y);

  // Right — Client
  const clientLabel = 'CLIENT CONFIRMATION';
  doc.setFillColor(255, 212, 0);
  doc.roundedRect(sigRightX, y - 3, doc.getTextWidth(clientLabel) * 1.5 + 6, 6, 1, 1, 'F');
  doc.setTextColor(10, 10, 10);
  doc.text(clientLabel, sigRightX + 3, y);
  y += 5;

  // Signature boxes
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(sigLeftX, y, sigWidth, sigHeight, 'FD');
  doc.rect(sigRightX, y, sigWidth, sigHeight, 'FD');

  // Embed signatures if present
  if (job.tradieSignature) {
    try {
      doc.addImage(job.tradieSignature, 'PNG', sigLeftX + 2, y + 1, sigWidth - 4, sigHeight - 2);
    } catch (e) { /* skip */ }
  }
  if (job.clientSignature) {
    try {
      doc.addImage(job.clientSignature, 'PNG', sigRightX + 2, y + 1, sigWidth - 4, sigHeight - 2);
    } catch (e) { /* skip */ }
  }

  y += sigHeight + 3;
  doc.setFontSize(5);
  doc.setTextColor(150, 150, 150);
  doc.setFont('helvetica', 'normal');
  doc.text('Sign above', sigLeftX, y);
  doc.text('Sign above', sigRightX, y);
  y += 8;

  // ════════════════════════════════════════
  // BLACK FOOTER BAR
  // ════════════════════════════════════════

  const footerHeight = 10;
  const footerY = doc.internal.pageSize.getHeight() - footerHeight;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, footerY, pageWidth, footerHeight, 'F');

  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(180, 180, 180);
  doc.text('● Created with ', margin, footerY + 6);
  const prefixWidth = doc.getTextWidth('● Created with ');
  doc.setTextColor(255, 212, 0);
  doc.text('Chippy', margin + prefixWidth, footerY + 6);

  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  const footerRight = job.ref ? `Ref: ${job.ref} · Tamper-proof record` : 'Tamper-proof record';
  doc.text(footerRight, pageWidth - margin, footerY + 6, { align: 'right' });

  return doc;
}
