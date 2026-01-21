/**
 * Classic Formal Certificate Template
 *
 * Traditional certificate with ornamental borders, serif fonts, and formal layout
 * Color scheme: Green (#2D5016) and Gold (#DAA520)
 */

import jsPDF from 'jspdf';
import { CertificateData, CertificateLayoutParams } from '@/types/certificate.types';
import {
  loadImageBase64,
  loadSignatureBase64,
  formatDate,
  generateCertificateId,
  addCornerDecorations,
  truncateText,
  wrapText,
  addMultiLineText,
  calculateTextHeight,
} from '../shared';

/**
 * Generate Classic Formal certificate template
 */
export async function generateClassicFormalCertificate(
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

  // ===== BACKGROUND & BORDERS =====
  // Cream background
  doc.setFillColor(255, 254, 240); // #FFFEF0
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border (Dark Green)
  doc.setLineWidth(2);
  doc.setDrawColor(45, 80, 22); // #2D5016
  doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'S');

  // Inner border (Gold)
  doc.setLineWidth(0.8);
  doc.setDrawColor(218, 165, 32); // #DAA520
  doc.rect(11, 11, pageWidth - 22, pageHeight - 22, 'S');

  // Add corner decorations
  addCornerDecorations(doc, pageWidth, pageHeight, [45, 80, 22]);

  // ===== LOGOS =====
  // LGU Seal (Top Left)
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', 15, 15, 25, 25);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // PESO Logo (Top Right)
  if (pesoLogo) {
    try {
      doc.addImage(pesoLogo, 'JPEG', pageWidth - 40, 15, 25, 25);
    } catch (error) {
      console.error('Error adding PESO logo:', error);
    }
  }

  // ===== HEADER =====
  let currentY = 20;

  doc.setFontSize(11);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(10);
  doc.text('PROVINCE OF DAVAO DEL NORTE', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(11);
  doc.text('MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('times', 'italic');
  doc.setTextColor(45, 80, 22);
  doc.text('Public Employment Service Office (P.E.S.O.)', centerX, currentY, { align: 'center' });

  // Decorative line under header
  currentY += 8;
  doc.setLineWidth(0.5);
  doc.setDrawColor(218, 165, 32); // Gold
  doc.line(50, currentY, pageWidth - 50, currentY);
  doc.setLineWidth(0.3);
  doc.line(50, currentY + 1, pageWidth - 50, currentY + 1);

  // ===== CERTIFICATE TITLE =====
  currentY += 12;
  doc.setFontSize(28);
  doc.setFont('times', 'bold');
  doc.setTextColor(45, 80, 22); // Dark green
  doc.text('CERTIFICATE OF TRAINING COMPLETION', centerX, currentY, { align: 'center' });

  // Underline for title
  currentY += 2;
  doc.setLineWidth(1);
  doc.setDrawColor(218, 165, 32);
  doc.line(70, currentY, pageWidth - 70, currentY);

  // ===== CERTIFICATE BODY =====
  currentY += 15;
  doc.setFontSize(12);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('This is to certify that', centerX, currentY, { align: 'center' });

  // Trainee Name (Large, Serif, Underlined)
  currentY += 12;
  doc.setFontSize(22);
  doc.setFont('times', 'bold');
  const traineeName = data.trainee.full_name.toUpperCase();
  doc.text(traineeName, centerX, currentY, { align: 'center' });

  // Name underline (elegant)
  const nameWidth = doc.getTextWidth(traineeName);
  currentY += 2;
  doc.setLineWidth(0.5);
  doc.setDrawColor(45, 80, 22);
  doc.line(centerX - nameWidth / 2 - 5, currentY, centerX + nameWidth / 2 + 5, currentY);

  // Completion text
  currentY += 12;
  doc.setFontSize(12);
  doc.setFont('times', 'normal');
  doc.text('has successfully completed the training program on', centerX, currentY, { align: 'center' });

  // Program Title (Bold, Larger) - Multi-line support
  currentY += 10;
  doc.setFontSize(16);
  doc.setFont('times', 'bold');
  doc.setTextColor(45, 80, 22);
  // Use multi-line wrapping instead of truncation
  currentY = addMultiLineText(doc, data.program.title, centerX, currentY, pageWidth - 80, 16, 'center', 1.15);

  // Date range
  currentY += 10;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Ongoing';
  doc.text(`${startDate} - ${endDate}`, centerX, currentY, { align: 'center' });

  // Duration
  currentY += 5;
  doc.setFontSize(10);
  doc.text(`Duration: ${data.program.duration}`, centerX, currentY, { align: 'center' });

  // Speaker name (if available) - Prominent display
  if (data.program.speaker_name) {
    currentY += 8;
    doc.setFontSize(11);
    doc.setFont('times', 'italic');
    doc.setTextColor(218, 165, 32); // Gold color for emphasis
    doc.text(`Facilitated by ${data.program.speaker_name}`, centerX, currentY, { align: 'center' });
  }

  // Skills covered - Display ALL skills with multi-line wrapping
  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += 10;
    doc.setFontSize(10);
    doc.setFont('times', 'bold');
    doc.setTextColor(45, 80, 22);
    doc.text('Skills Covered:', centerX, currentY, { align: 'center' });

    currentY += 5;
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
    // Show ALL skills (no slicing), join with bullet separator
    const skills = data.program.skills_covered.join(' • ');
    // Use multi-line wrapping instead of truncation
    currentY = addMultiLineText(doc, skills, centerX, currentY, pageWidth - 60, 10, 'center', 1.3);
  }

  // ===== FOOTER SECTION =====
  // Add spacing before footer (flow-based positioning)
  currentY += 3;

  // Signature section
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 4;

  // Add signature image if available
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (centered, matching signature width)
  doc.setLineWidth(0.3);
  doc.setDrawColor(0, 0, 0);
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer name and title
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.certification.issued_by.name, centerX, signatureLineY + 4, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 8, { align: 'center' });

  // Certificate ID & Issue Date (placed after signature)
  currentY = signatureLineY + 14;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(100, 100, 100);
  const certId = data.certification.certificate_id || generateCertificateId();
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`Certificate ID: ${certId}`, centerX, currentY, { align: 'center' });
  doc.text(`Issued on ${issueDate}`, centerX, currentY + 4, { align: 'center' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
