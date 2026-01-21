/**
 * Contemporary Elegance Certificate Template
 *
 * Sophisticated modern design with navy/gold accents and generous white space
 * Color scheme: Deep Navy (#1E3A8A) and Soft Gold (#D4AF37) on off-white background
 */

import jsPDF from 'jspdf';
import { CertificateData, CertificateLayoutParams } from '@/types/certificate.types';
import {
  loadImageBase64,
  loadSignatureBase64,
  formatDate,
  generateCertificateId,
  truncateText,
  wrapText,
  addMultiLineText,
  calculateTextHeight,
} from '../shared';

/**
 * Generate Contemporary Elegance certificate template
 */
export async function generateModernMinimalistCertificate(
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
  // Warm off-white background
  doc.setFillColor(253, 253, 249); // #FDFDF9
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== ELEGANT BORDER FRAME =====
  // Outer border (Navy)
  doc.setLineWidth(1.5);
  doc.setDrawColor(30, 58, 138); // Deep Navy
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Inner border (Gold)
  doc.setLineWidth(0.6);
  doc.setDrawColor(212, 175, 55); // Soft Gold
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22, 'S');

  // Subtle corner brackets (Gold)
  const cornerSize = 8;
  const cornerOffset = 8;
  doc.setLineWidth(1);
  doc.setDrawColor(212, 175, 55);

  // Top-left corner
  doc.line(cornerOffset, cornerOffset + cornerSize, cornerOffset, cornerOffset);
  doc.line(cornerOffset, cornerOffset, cornerOffset + cornerSize, cornerOffset);

  // Top-right corner
  doc.line(pageWidth - cornerOffset - cornerSize, cornerOffset, pageWidth - cornerOffset, cornerOffset);
  doc.line(pageWidth - cornerOffset, cornerOffset, pageWidth - cornerOffset, cornerOffset + cornerSize);

  // Bottom-left corner
  doc.line(cornerOffset, pageHeight - cornerOffset - cornerSize, cornerOffset, pageHeight - cornerOffset);
  doc.line(cornerOffset, pageHeight - cornerOffset, cornerOffset + cornerSize, pageHeight - cornerOffset);

  // Bottom-right corner
  doc.line(pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset, pageWidth - cornerOffset, pageHeight - cornerOffset);
  doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize, pageWidth - cornerOffset, pageHeight - cornerOffset);

  // ===== LOGOS (Centered) =====
  let currentY = 14;
  const logoSize = 20;
  const logoSpacing = 25;

  // Calculate total width and center position for both logos as a group
  const totalWidth = logoSize * 2 + logoSpacing;
  const startX = centerX - (totalWidth / 2);

  // LGU Seal (Left)
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', startX, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // PESO Logo (Right)
  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', startX + logoSize + logoSpacing, currentY, logoSize, logoSize);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // ===== HEADER TEXT =====
  currentY = 46;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(10);
  doc.text('PROVINCE OF DAVAO DEL NORTE • MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Medium gray
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE =====
  currentY += 13;
  doc.setFontSize(26);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text('CERTIFICATE OF COMPLETION', centerX, currentY, { align: 'center' });

  // Elegant gold underline
  currentY += 2;
  doc.setLineWidth(0.8);
  doc.setDrawColor(212, 175, 55); // #D4AF37 Soft Gold
  doc.line(centerX - 60, currentY, centerX + 60, currentY);

  // ===== CERTIFICATE BODY =====
  currentY += 11;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 45, 45); // Charcoal
  doc.text('This certifies that', centerX, currentY, { align: 'center' });

  // Trainee Name (Elegant serif)
  currentY += 12;
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Subtle name underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.line(centerX - nameWidth / 2, currentY, centerX + nameWidth / 2, currentY);

  // Completion text
  currentY += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(45, 45, 45);
  doc.text('has successfully completed the training program', centerX, currentY, { align: 'center' });

  // Program Title (Navy, serif) - Multi-line support
  currentY += 10;
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  // Use multi-line wrapping instead of truncation
  currentY = addMultiLineText(doc, data.program.title, centerX, currentY, pageWidth - 80, 16, 'center', 1.15);

  // ===== PROGRAM DETAILS BOX (Dynamic height based on content) =====
  currentY += 4;
  const boxWidth = pageWidth - 80;
  const boxX = centerX - boxWidth / 2;
  const boxStartY = currentY;

  // Calculate content height first
  let contentHeight = 5; // Top padding (reduced for landscape)

  // Date range
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  contentHeight += 6; // Line height for duration

  // Speaker name
  if (data.program.speaker_name) {
    contentHeight += 4;
  }

  // Skills covered - Calculate height for ALL skills with wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    contentHeight += 4; // "Skills:" label
    const skills = data.program.skills_covered.join(', '); // Show ALL skills
    const skillsHeight = calculateTextHeight(doc, skills, boxWidth - 20, 9, 1.3);
    contentHeight += skillsHeight;
  }

  // Assessment & Attendance
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    contentHeight += 4;
  }

  contentHeight += 5; // Bottom padding (reduced for landscape)

  // Draw box with calculated height
  const boxHeight = Math.max(contentHeight, 28); // Minimum 28mm
  doc.setFillColor(250, 248, 240); // #FAF8F0
  doc.setLineWidth(0.3);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.rect(boxX, boxStartY, boxWidth, boxHeight, 'FD');

  // Details inside box
  let boxY = boxStartY + 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(75, 85, 99); // Gray

  // Date range
  doc.text(`Duration: ${startDate} - ${endDate} (${data.program.duration})`, centerX, boxY, { align: 'center' });

  // Speaker name
  if (data.program.speaker_name) {
    boxY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138); // Navy
    doc.text(`Facilitated by: ${data.program.speaker_name}`, centerX, boxY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
  }

  // Skills covered - Display ALL skills with multi-line wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    boxY += 4;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(75, 85, 99);
    doc.text('Skills:', centerX, boxY, { align: 'center' });
    boxY += 5;
    doc.setFont('helvetica', 'normal');
    // Show ALL skills (no slicing), join with comma
    const skills = data.program.skills_covered.join(', ');
    // Use multi-line wrapping instead of truncation
    boxY = addMultiLineText(doc, skills, centerX, boxY, boxWidth - 20, 9, 'center', 1.3);
  }

  // Update currentY to after the box
  currentY = boxStartY + boxHeight;

  // ===== FOOTER SECTION =====
  // Add direct spacing after details box (reduced for landscape orientation)
  currentY += 3;

  // Signature section
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 12;

  // Add signature image if available
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (gold)
  doc.setLineWidth(0.5);
  doc.setDrawColor(212, 175, 55); // Gold
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer name and title
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138); // Navy
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128); // Gray
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Certificate ID & Issue Date (positioned after officer title with breathing room)
  const certIdY = signatureLineY + 14;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(156, 163, 175); // Light gray
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId} • Issued on ${issueDate}`, centerX, certIdY, { align: 'center' });

  // Elegant double footer line (positioned below cert ID)
  const footerLineY1 = certIdY + 6;  // 6mm below cert ID
  const footerLineY2 = certIdY + 7;  // 1mm spacing between lines

  doc.setLineWidth(0.5);
  doc.setDrawColor(212, 175, 55); // Gold
  doc.line(35, footerLineY1, pageWidth - 35, footerLineY1);
  doc.setLineWidth(0.2);
  doc.line(35, footerLineY2, pageWidth - 35, footerLineY2);

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
