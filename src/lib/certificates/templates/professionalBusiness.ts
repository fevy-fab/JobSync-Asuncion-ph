/**
 * Executive Modern Certificate Template
 *
 * Contemporary executive style with centered layout and refined color palette
 * Color scheme: Deep Charcoal (#1F2937) with subtle teal accents on white background
 */

import jsPDF from 'jspdf';
import { CertificateData, CertificateLayoutParams } from '@/types/certificate.types';
import {
  loadImageBase64,
  loadSignatureBase64,
  formatDate,
  generateCertificateId,
  truncateText,
  calculateTextHeight,
  wrapText,
} from '../shared';

/**
 * Generate Executive Modern certificate template
 */
export async function generateProfessionalBusinessCertificate(
  data: CertificateData,
  layoutParams?: CertificateLayoutParams
): Promise<Uint8Array> {
  // Load all logos in parallel
  const [pesoLogo, lguSeal, signatureBase64] = await Promise.all([
    loadImageBase64('logos/peso-logo.jpeg'),
    loadImageBase64('logos/lgu-asuncion-seal.jpeg'),
    data.certification.issued_by.signature_url
      ? loadSignatureBase64(data.certification.issued_by.signature_url)
      : Promise.resolve(null),
  ]);

  // Create PDF in landscape orientation
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // ===== BACKGROUND =====
  // Clean white background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== PROFESSIONAL BORDERS =====
  // Outer teal border
  doc.setLineWidth(1);
  doc.setDrawColor(20, 184, 166); // #14B8A6 Teal
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Inner light gray border
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200); // Light gray
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

  // ===== HEADER (Centered) =====
  let currentY = 14;

  // Logo row (centered horizontally)
  const logoSize = 22;
  const logoSpacing = 24;
  const totalWidth = logoSize * 2 + logoSpacing;
  const startX = centerX - (totalWidth / 2);

  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', startX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', startX + logoSize + logoSpacing, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // Header text (centered)
  currentY += 32;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 59); // Deep Charcoal
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.text('PROVINCE OF DAVAO DEL NORTE', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.text('MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 184, 166); // Teal accent
  doc.text('Public Employment Service Office', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE (Centered) =====
  currentY += 14;
  doc.setFontSize(24);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59); // Charcoal
  doc.text('CERTIFICATE OF COMPLETION', centerX, currentY, { align: 'center' });

  // Minimal teal underline
  currentY += 3;
  doc.setLineWidth(1);
  doc.setDrawColor(20, 184, 166);
  doc.line(centerX - 65, currentY, centerX + 65, currentY);

  // ===== CERTIFICATE BODY (Centered) =====
  currentY += 16;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('This certifies that', centerX, currentY, { align: 'center' });

  // Trainee Name (Large, Bold, Charcoal)
  currentY += 11;
  doc.setFontSize(18);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Simple underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(100, 116, 139);
  doc.line(centerX - nameWidth / 2, currentY, centerX + nameWidth / 2, currentY);

  // Completion statement
  currentY += 13;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('has successfully completed the professional training program', centerX, currentY, { align: 'center' });

  // Program Title (Medium, Bold)
  currentY += 10;
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  const programTitle = truncateText(doc, data.program.title, pageWidth - 80, 13);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== PROGRAM DETAILS (Clean box, centered) =====
  currentY += 14;
  const detailsBoxWidth = pageWidth - 100;
  const detailsBoxX = centerX - detailsBoxWidth / 2;
  const rowHeight = 8;
  const boxStartY = currentY;
  const labelX = detailsBoxX + 20;

  // Calculate content height first (dynamic based on content)
  let contentHeight = 8; // Top padding

  // Duration row
  contentHeight += rowHeight;

  // Speaker row (if present)
  if (data.program.speaker_name) {
    contentHeight += rowHeight;
  }

  // Skills row - Calculate height for ALL skills with wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    contentHeight += rowHeight; // For label row
    const skills = data.program.skills_covered.join(', '); // Show ALL skills
    const skillsHeight = calculateTextHeight(doc, skills, detailsBoxWidth - 60, 9, 1.2);
    contentHeight += skillsHeight - rowHeight; // Add extra height beyond first row
  }

  // Performance row (if present)
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    contentHeight += rowHeight;
  }

  contentHeight += 4; // Bottom padding

  // Draw box with calculated height
  const boxHeight = Math.max(contentHeight, 38); // Minimum 38mm
  doc.setFillColor(249, 250, 251); // Very light gray
  doc.setLineWidth(0.5);
  doc.setDrawColor(20, 184, 166); // #14B8A6 Teal border
  doc.rect(detailsBoxX, boxStartY, detailsBoxWidth, boxHeight, 'FD');

  // Start rendering content
  currentY = boxStartY + 8;

  // Duration
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('Duration:', labelX, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(31, 41, 59);
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`${startDate} - ${endDate} (${data.program.duration})`, labelX + 25, currentY);

  // Speaker
  if (data.program.speaker_name) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Facilitator:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 59);
    doc.text(data.program.speaker_name, labelX + 25, currentY);
  }

  // Skills - Display ALL skills with multi-line wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += rowHeight;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Competencies:', labelX, currentY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 59);
    const skills = data.program.skills_covered.join(', '); // Show ALL skills (no slicing)
    // Use multi-line wrapping instead of truncation
    const { lines } = wrapText(doc, skills, detailsBoxWidth - 60, 9, 1.2);
    let skillsY = currentY;
    lines.forEach((line) => {
      doc.text(line, labelX + 25, skillsY);
      skillsY += rowHeight;
    });
    // Update currentY to reflect actual height used (already at last line position)
    currentY = skillsY - rowHeight;
  }

  // ===== FOOTER SECTION =====
  // Position signature section BELOW the details box
  currentY = boxStartY + boxHeight;

  // Add professional spacing before signature section
  currentY += 6;

  // Signature section (Centered)
  const signatureWidth = 40;
  const signatureHeight = 10;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 4;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - signatureHeight, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line
  doc.setLineWidth(0.5);
  doc.setDrawColor(100, 116, 139);
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer details (centered)
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(31, 41, 59);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 3, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 7, { align: 'center' });

  // Certificate metadata (right-aligned, side-by-side with officer)
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  const rightX = pageWidth - 15; // 15mm from right edge
  doc.text(`Certificate ID: ${certId}`, rightX, signatureLineY + 3, { align: 'right' });
  doc.text(`Issued on ${issueDate}`, rightX, signatureLineY + 7, { align: 'right' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
