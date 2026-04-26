/**
 * generatePdf.js — Generates a professional job record PDF using jsPDF.
 * Layout matches the on-screen ReviewReport.jsx 1:1.
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

// ── Draw hazard stripe down left edge of the current page ──

function drawLeftHazardStripe(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const stripeW = 10;
  const segH = 6;
  for (let sy = 0; sy < pageHeight; sy += segH * 2) {
    doc.setFillColor(255, 212, 0);
    doc.rect(0, sy, stripeW, segH, 'F');
    doc.setFillColor(10, 10, 10);
    doc.rect(0, sy + segH, stripeW, segH, 'F');
  }
}

// ── Page break helper — draws hazard stripe on new page ──

function checkPageBreak(doc, y, needed, margin) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 30) {
    doc.addPage();
    drawLeftHazardStripe(doc);
    return margin || 25;
  }
  return y;
}

// ── Draw divider line ──

function drawDivider(doc, y, leftMargin, rightMargin) {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, doc.internal.pageSize.getWidth() - rightMargin, y);
  return y + 6;
}

// ── Section header (black circle + title + optional tag) ──

function drawSectionHeader(doc, margin, y, number, title, tag) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Black circle with number
  doc.setFillColor(10, 10, 10);
  doc.circle(margin + 5, y, 5, 'F');
  doc.setTextColor(255, 212, 0);
  doc.setFontSize(9);
  doc.setFont('courier', 'bold');
  doc.text(String(number), margin + 5, y + 3, { align: 'center' });

  // Title in bold mono caps
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(10);
  doc.setFont('courier', 'bold');
  doc.text(title.toUpperCase(), margin + 14, y + 3);

  // Optional tag (yellow pill on right)
  if (tag) {
    doc.setFontSize(6);
    doc.setFont('courier', 'bold');
    const tagWidth = doc.getTextWidth(tag) + 8;
    const tagX = pageWidth - margin - tagWidth;
    doc.setFillColor(255, 212, 0);
    doc.roundedRect(tagX, y - 3, tagWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(10, 10, 10);
    doc.text(tag, tagX + 4, y + 2);
  }

  return y + 12;
}

// ── Main export ──

export function generatePdf(job) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 18; // left edge of hazard stripe is 0-10, content starts at 18
  const rightMargin = 15;
  const contentLeft = leftMargin;
  const contentRight = pageWidth - rightMargin;
  const contentWidth = contentRight - contentLeft;
  const profile = getBusinessProfile() || {};
  let y = 0;

  // ════════════════════════════════════════
  // HAZARD STRIPE — LEFT EDGE (PAGE 1)
  // ════════════════════════════════════════

  drawLeftHazardStripe(doc);

  // ════════════════════════════════════════
  // BUSINESS HEADER
  // ════════════════════════════════════════

  y = 18;
  doc.setTextColor(10, 10, 10);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(profile.businessName || 'Chippy', contentLeft, y);

  y += 6;
  doc.setFontSize(7);
  doc.setFont('courier', 'normal');
  doc.setTextColor(100, 100, 100);
  if (profile.tagline) {
    doc.text(profile.tagline.toUpperCase(), contentLeft, y);
    y += 5;
  }

  // Phone · Email line
  const contactParts = [profile.phone, profile.email].filter(Boolean).join(' · ');
  if (contactParts) {
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(contactParts, contentLeft, y);
    y += 4;
  }

  // LBP
  if (profile.lbpNumber) {
    doc.text(`Licensed Building Practitioner · LBP #${profile.lbpNumber}`, contentLeft, y);
    y += 4;
  }

  // NZBN
  if (profile.nzbn) {
    doc.text(`NZBN: ${profile.nzbn}`, contentLeft, y);
    y += 4;
  }

  y += 2;
  y = drawDivider(doc, y, contentLeft, rightMargin);

  // ════════════════════════════════════════
  // JOB RECORD HEADER
  // ════════════════════════════════════════

  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  doc.setFont('courier', 'normal');
  doc.text('JOB RECORD', contentLeft, y);
  if (job.ref) {
    doc.text(`Ref: ${job.ref}`, contentRight, y, { align: 'right' });
  }
  y += 5;
  doc.setFontSize(7);
  doc.text(formatDateLong(job.date).toUpperCase(), contentLeft, y);
  y += 7;

  // Job title — large bold
  doc.setFontSize(16);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(job.jobTitle || job.address || 'Job Report', contentWidth);
  doc.text(titleLines, contentLeft, y);
  y += titleLines.length * 7 + 3;

  // Caption
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.setFont('courier', 'normal');
  doc.text('JOB COMPLETION RECORD · FOR CLIENT RECORDS', contentLeft, y);
  y += 5;

  y = drawDivider(doc, y, contentLeft, rightMargin);

  // ════════════════════════════════════════
  // TWO-COLUMN: CLIENT + JOB DETAILS
  // ════════════════════════════════════════

  const colMid = contentLeft + contentWidth / 2;
  const colRightX = colMid + 8;
  const colY = y;

  // Left column — Client
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('courier', 'bold');
  doc.text('CLIENT', contentLeft, colY);

  doc.setFontSize(10);
  doc.setTextColor(10, 10, 10);
  doc.setFont('helvetica', 'bold');
  doc.text(job.clientName || '—', contentLeft, colY + 6);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const addrLines = doc.splitTextToSize(job.clientAddress || job.address || '—', colMid - contentLeft - 5);
  doc.text(addrLines, contentLeft, colY + 12);
  const addrBottom = colY + 12 + addrLines.length * 4;
  doc.text(job.clientPhone || '—', contentLeft, addrBottom + 2);

  // Right column — Job Details
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.setFont('courier', 'bold');
  doc.text('JOB DETAILS', colRightX, colY);

  doc.setFontSize(8);
  doc.setTextColor(74, 74, 74);
  doc.setFont('helvetica', 'normal');
  let ry = colY + 6;

  doc.setFont('helvetica', 'bold');
  doc.text(job.jobLocation || '—', colRightX, ry);
  doc.setFont('helvetica', 'normal');
  ry += 6;
  doc.text(`Date on site: ${formatDateShort(job.date)}`, colRightX, ry);
  ry += 5;
  doc.text(`Start: ${formatTime12(job.startTime)} · Finish: ${formatTime12(job.finishTime)}`, colRightX, ry);
  ry += 5;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(10, 10, 10);
  doc.text(`Total time on site: ${formatDuration(job.startTime, job.finishTime)}`, colRightX, ry);

  y = Math.max(addrBottom + 6, ry + 6) + 4;
  y = drawDivider(doc, y, contentLeft, rightMargin);

  // ════════════════════════════════════════
  // REPORT SECTIONS
  // ════════════════════════════════════════

  const report = job.report;
  if (!report) {
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(9);
    doc.text('No report generated.', contentLeft, y);
    return doc;
  }

  // ── Section 1: Work Performed ──
  y = checkPageBreak(doc, y, 30, 18);
  y = drawSectionHeader(doc, contentLeft, y, 1, 'Work Performed');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(74, 74, 74);
  const workLines = doc.splitTextToSize(report.workPerformed || '', contentWidth);
  workLines.forEach((line) => {
    y = checkPageBreak(doc, y, 6, 18);
    doc.text(line, contentLeft, y);
    y += 4.5;
  });
  y += 4;
  y = drawDivider(doc, y, contentLeft, rightMargin);

  // ── Section 2: Materials Used (table) ──
  if (report.materialsUsed && report.materialsUsed.length > 0) {
    y = checkPageBreak(doc, y, 25, 18);
    y = drawSectionHeader(doc, contentLeft, y, 2, 'Materials Used');

    // Table header bar
    doc.setFillColor(10, 10, 10);
    doc.rect(contentLeft, y - 4, contentWidth, 9, 'F');
    doc.setTextColor(255, 212, 0);
    doc.setFontSize(7);
    doc.setFont('courier', 'bold');
    doc.text('ITEM', contentLeft + 4, y + 1);
    doc.text('QTY', contentRight - 4, y + 1, { align: 'right' });
    y += 8;

    // Table rows
    report.materialsUsed.forEach((raw, i) => {
      y = checkPageBreak(doc, y, 8, 18);
      const { item, qty } = parseMaterial(raw);
      if (i % 2 === 0) {
        doc.setFillColor(248, 248, 248);
        doc.rect(contentLeft, y - 4, contentWidth, 8, 'F');
      }
      doc.setTextColor(74, 74, 74);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(item, contentLeft + 4, y);
      doc.setFontSize(8);
      doc.setFont('courier', 'normal');
      doc.text(String(qty), contentRight - 4, y, { align: 'right' });
      y += 8;
    });
    y += 4;
    y = drawDivider(doc, y, contentLeft, rightMargin);
  }

  // ── Section 3: Notes & Findings ──
  if (report.notes && report.notes.length > 0) {
    y = checkPageBreak(doc, y, 20, 18);
    y = drawSectionHeader(doc, contentLeft, y, 3, 'Notes & Findings');

    doc.setFontSize(9);
    report.notes.forEach((note) => {
      y = checkPageBreak(doc, y, 12, 18);
      // Yellow › marker
      doc.setTextColor(255, 212, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('›', contentLeft + 2, y + 1);
      // Note text
      doc.setTextColor(74, 74, 74);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const noteLines = doc.splitTextToSize(note, contentWidth - 14);
      doc.text(noteLines, contentLeft + 10, y);
      y += noteLines.length * 4.5 + 4;
    });
    y += 4;
    y = drawDivider(doc, y, contentLeft, rightMargin);
  }

  // ── Section 4: Photos ──
  const photosWithData = (job.photos || []).filter((p) => p.dataUrl);
  if (photosWithData.length > 0) {
    y = checkPageBreak(doc, y, 60, 18);
    const photoTag = `TAGGED · ${photosWithData.length} PHOTO${photosWithData.length !== 1 ? 'S' : ''}`;
    y = drawSectionHeader(doc, contentLeft, y, 4, 'Photos', photoTag);

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

    const thumbSize = 50;
    const gap = 4;
    const cols = 3;

    sortedLabels.forEach((label) => {
      const photos = groups[label];
      const rows = Math.ceil(photos.length / cols);
      y = checkPageBreak(doc, y, 14 + rows * (thumbSize + gap), 18);

      // Yellow label pill
      const pillText = `${label.replace('-', ' ').toUpperCase()} (${photos.length})`;
      doc.setFontSize(6);
      doc.setFont('courier', 'bold');
      const pillWidth = doc.getTextWidth(pillText) + 8;
      doc.setFillColor(255, 212, 0);
      doc.roundedRect(contentLeft, y - 3, pillWidth, 8, 1.5, 1.5, 'F');
      doc.setTextColor(10, 10, 10);
      doc.text(pillText, contentLeft + 4, y + 2);
      y += 8;

      // Photo grid — 3 columns
      let col = 0;
      photos.forEach((photo) => {
        if (col === 0) {
          y = checkPageBreak(doc, y, thumbSize + gap, 18);
        }
        try {
          const x = contentLeft + col * (thumbSize + gap);
          doc.addImage(photo.dataUrl, 'JPEG', x, y, thumbSize, thumbSize);
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.3);
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

    y = drawDivider(doc, y, contentLeft, rightMargin);
  }

  // ════════════════════════════════════════
  // SIGN-OFF BLOCK
  // ════════════════════════════════════════

  y = checkPageBreak(doc, y, 55, 18);

  const sigColWidth = (contentWidth - 10) / 2;
  const sigImgW = 120 * (sigColWidth / 120); // scale to column width
  const sigImgH = 40;
  const sigLeftX = contentLeft;
  const sigRightX = contentLeft + sigColWidth + 10;

  // Left — Tradie sign-off
  const tradieLabel = 'TRADIE SIGN-OFF';
  doc.setFontSize(6);
  doc.setFont('courier', 'bold');
  const tradiePillW = doc.getTextWidth(tradieLabel) + 8;
  doc.setFillColor(255, 212, 0);
  doc.roundedRect(sigLeftX, y - 3, tradiePillW, 8, 1.5, 1.5, 'F');
  doc.setTextColor(10, 10, 10);
  doc.text(tradieLabel, sigLeftX + 4, y + 2);

  // Right — Client confirmation
  const clientLabel = 'CLIENT SIGN-OFF';
  const clientPillW = doc.getTextWidth(clientLabel) + 8;
  doc.setFillColor(255, 212, 0);
  doc.roundedRect(sigRightX, y - 3, clientPillW, 8, 1.5, 1.5, 'F');
  doc.setTextColor(10, 10, 10);
  doc.text(clientLabel, sigRightX + 4, y + 2);
  y += 10;

  // Signature image boxes
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.setLineWidth(0.3);
  doc.rect(sigLeftX, y, sigColWidth, sigImgH, 'FD');
  doc.rect(sigRightX, y, sigColWidth, sigImgH, 'FD');

  // Embed signatures if present
  if (job.tradieSignature) {
    try {
      doc.addImage(job.tradieSignature, 'PNG', sigLeftX + 2, y + 2, sigColWidth - 4, sigImgH - 4);
    } catch (e) { /* skip */ }
  }
  if (job.clientSignature) {
    try {
      doc.addImage(job.clientSignature, 'PNG', sigRightX + 2, y + 2, sigColWidth - 4, sigImgH - 4);
    } catch (e) { /* skip */ }
  }

  y += sigImgH + 3;

  // Tradie name + date
  doc.setFontSize(7);
  doc.setTextColor(74, 74, 74);
  doc.setFont('helvetica', 'italic');
  doc.text(profile.tradieName || '—', sigLeftX, y);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(formatDateShort(job.date), sigLeftX, y + 4);

  // Client caption
  doc.setFontSize(7);
  doc.setTextColor(74, 74, 74);
  doc.setFont('helvetica', 'italic');
  doc.text('Signed at completion', sigRightX, y);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(formatDateShort(job.date), sigRightX, y + 4);

  y += 10;

  // ════════════════════════════════════════
  // BLACK FOOTER BAR (last page only)
  // ════════════════════════════════════════

  const footerHeight = 20;
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerY = pageHeight - footerHeight;
  doc.setFillColor(10, 10, 10);
  doc.rect(0, footerY, pageWidth, footerHeight, 'F');

  // Left: "● CREATED WITH CHIPPY"
  doc.setFontSize(7);
  doc.setFont('courier', 'bold');
  doc.setTextColor(255, 212, 0);
  doc.text('● ', contentLeft, footerY + 12);
  const dotWidth = doc.getTextWidth('● ');
  doc.setTextColor(255, 255, 255);
  doc.text('CREATED WITH ', contentLeft + dotWidth, footerY + 12);
  const prefixWidth = doc.getTextWidth('CREATED WITH ');
  doc.setTextColor(255, 212, 0);
  doc.text('CHIPPY', contentLeft + dotWidth + prefixWidth, footerY + 12);

  // Right: "REF: JR-XXXX-XXXX · TAMPER-PROOF RECORD"
  doc.setTextColor(255, 255, 255);
  doc.setFont('courier', 'normal');
  doc.setFontSize(6);
  const footerRight = job.ref ? `REF: ${job.ref} · TAMPER-PROOF RECORD` : 'TAMPER-PROOF RECORD';
  doc.text(footerRight, contentRight, footerY + 12, { align: 'right' });

  return doc;
}
