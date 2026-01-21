/**
 * Warm Celebration Certificate Template
 *
 * Elegant celebratory design with warm burgundy and gold accents
 * Color scheme: Deep Burgundy (#8B3A62) and Antique Gold (#C9A86A) on cream background
 */

import jsPDF from 'jspdf';
import { CertificateData, CertificateLayoutParams } from '@/types/certificate.types';
import {
  loadImageBase64,
  loadSignatureBase64,
  formatDate,
  generateCertificateId,
  truncateText,
  addMultiLineText,
  calculateTextHeight,
} from '../shared';

/**
 * Generate Warm Celebration certificate template
 */
export async function generateColorfulAchievementCertificate(
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
  // Warm cream background
  doc.setFillColor(255, 254, 240); // #FFFEF0 Cream
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // ===== ELEGANT BORDER =====
  // Outer burgundy border
  doc.setLineWidth(2.5);
  doc.setDrawColor(139, 58, 98); // #8B3A62 Deep Burgundy
  doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

  // Inner gold border
  doc.setLineWidth(0.8);
  doc.setDrawColor(201, 168, 106); // #C9A86A Antique Gold
  doc.rect(13, 13, pageWidth - 26, pageHeight - 26, 'S');

  // ===== CORNER DECORATIONS (Subtle) =====
  // Top corners - small gold ornaments
  doc.setFontSize(12);
  doc.setTextColor(201, 168, 106); // Gold
  doc.text('❖', 18, 20);
  doc.text('❖', pageWidth - 22, 20);
  doc.text('❖', 18, pageHeight - 15);
  doc.text('❖', pageWidth - 22, pageHeight - 15);

  // ===== LOGOS (Top, Centered) =====
  let currentY = 14;
  const logoSize = 18;
  const logoSpacing = 28;
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

  // ===== HEADER =====
  currentY = 38;

  doc.setFontSize(9);
  doc.setFont('times', 'bold');
  doc.setTextColor(139, 58, 98); // Burgundy
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.text('PROVINCE OF DAVAO DEL NORTE • MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 4;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(201, 168, 106); // Gold
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE TITLE =====
  currentY += 10;
  doc.setFontSize(26);
  doc.setFont('times', 'bold');
  doc.setTextColor(139, 58, 98); // Burgundy
  doc.text('CERTIFICATE OF ACHIEVEMENT', centerX, currentY, { align: 'center' });

  // Elegant decorative line
  currentY += 3;
  doc.setLineWidth(1.2);
  doc.setDrawColor(201, 168, 106); // Gold
  doc.line(70, currentY, pageWidth - 70, currentY);

  // ===== CERTIFICATE BODY =====
  currentY += 9;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('This certificate is proudly presented to', centerX, currentY, { align: 'center' });

  // Trainee Name (Large, Elegant)
  currentY += 12;
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  doc.setTextColor(139, 58, 98); // Burgundy
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Elegant gold underline
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.8);
  doc.setDrawColor(201, 168, 106); // Gold
  doc.line(centerX - nameWidth / 2 - 5, currentY, centerX + nameWidth / 2 + 5, currentY);

  // Achievement text
  currentY += 11;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(50, 50, 50);
  doc.text('for successfully completing the training program', centerX, currentY, { align: 'center' });

  // Program Title (Burgundy, serif)
  currentY += 12;
  doc.setFontSize(15);
  doc.setFont('times', 'bold');
  doc.setTextColor(139, 58, 98); // Burgundy
  const programTitle = truncateText(doc, data.program.title, pageWidth - 100, 15);
  doc.text(programTitle, centerX, currentY, { align: 'center' });

  // ===== ACHIEVEMENT DETAILS BOX =====
  currentY += 13;
  const boxWidth = pageWidth - 120;
  const boxX = centerX - boxWidth / 2;
  const boxStartY = currentY;

  // Calculate content height first (dynamic based on content)
  let contentHeight = 10; // Top padding

  // Duration line
  contentHeight += 5;

  // Speaker name (if present)
  if (data.program.speaker_name) {
    contentHeight += 5;
  }

  // Skills covered - Calculate height for ALL skills with wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    contentHeight += 6; // Spacing before skills
    const skills = data.program.skills_covered.join(', '); // Show ALL skills
    const skillsHeight = calculateTextHeight(doc, skills, boxWidth - 10, 8, 1.2);
    contentHeight += skillsHeight;
  }

  // Performance metrics (if present)
  if (data.completion.assessment_score !== null || data.completion.attendance_percentage !== null) {
    contentHeight += 5;
  }

  contentHeight += 5; // Bottom padding

  // Draw box with calculated height
  const boxHeight = Math.max(contentHeight, 36); // Minimum 36mm
  doc.setFillColor(255, 251, 235); // #FFFBEB Very light warm
  doc.setLineWidth(0.5);
  doc.setDrawColor(201, 168, 106); // Gold
  doc.roundedRect(boxX, boxStartY, boxWidth, boxHeight, 2, 2, 'FD');

  // Box content
  let boxY = currentY + 10;
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(60, 60, 60);

  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`Duration: ${startDate} - ${endDate} (${data.program.duration})`, centerX, boxY, { align: 'center' });

  if (data.program.speaker_name) {
    boxY += 5;
    doc.setFont('times', 'italic');
    doc.setTextColor(139, 58, 98); // Burgundy
    doc.text(`Facilitated by ${data.program.speaker_name}`, centerX, boxY, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setTextColor(60, 60, 60);
  }

  // Skills - Display ALL skills with multi-line wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    boxY += 6;
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);
    const skills = data.program.skills_covered.join(', '); // Show ALL skills (no slicing)
    // Use multi-line wrapping instead of truncation
    boxY = addMultiLineText(doc, skills, centerX, boxY, boxWidth - 10, 8, 'center', 1.2);
  }

  // ===== FOOTER SECTION =====
  currentY = boxStartY + boxHeight + 8;

  // Signature section
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 14;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (gold)
  doc.setLineWidth(0.5);
  doc.setDrawColor(201, 168, 106); // Gold
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer details
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 5, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 9, { align: 'center' });

  // Certificate ID & Date (positioned after signature section)
  const certIdY = signatureLineY + 15;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(120, 120, 120);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId} • Issued: ${issueDate}`, centerX, certIdY, { align: 'center' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
