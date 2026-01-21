/**
 * Government Official Certificate Template
 *
 * Formal government document style with seal-heavy design and multiple signature blocks
 * Color scheme: Navy (#1E3A8A) and Gold (#F59E0B) on off-white background
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
 * Generate Government Official certificate template
 */
export async function generateGovernmentOfficialCertificate(
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

  // Create PDF in portrait orientation (government document standard)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;
  const margin = 15;

  // ===== BACKGROUND & BORDERS =====
  // Off-white background
  doc.setFillColor(252, 251, 245); // #FCFBF5
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Outer border (Navy)
  doc.setLineWidth(2.5);
  doc.setDrawColor(30, 58, 138); // #1E3A8A
  doc.rect(margin - 3, margin - 3, pageWidth - (margin - 3) * 2, pageHeight - (margin - 3) * 2, 'S');

  // Inner border (Gold)
  doc.setLineWidth(0.5);
  doc.setDrawColor(245, 158, 11); // #F59E0B
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2, 'S');

  // ===== LARGE CENTRAL SEAL (Government style) =====
  const sealSize = 45;
  if (lguSeal) {
    try {
      doc.addImage(lguSeal, 'JPEG', centerX - sealSize / 2, 20, sealSize, sealSize);
    } catch (error) {
      console.error('Error adding LGU seal:', error);
    }
  }

  // ===== HEADER =====
  let currentY = 70;

  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('REPUBLIC OF THE PHILIPPINES', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(9);
  doc.text('PROVINCE OF DAVAO DEL NORTE', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(10);
  doc.text('MUNICIPALITY OF ASUNCION', centerX, currentY, { align: 'center' });

  currentY += 5;
  doc.setFontSize(8);
  doc.setFont('times', 'italic');
  doc.setTextColor(245, 158, 11);
  doc.text('Office of the Public Employment Service', centerX, currentY, { align: 'center' });

  // Decorative double line
  currentY += 7;
  doc.setLineWidth(1);
  doc.setDrawColor(30, 58, 138);
  doc.line(margin + 10, currentY, pageWidth - margin - 10, currentY);
  doc.setLineWidth(0.3);
  doc.line(margin + 10, currentY + 1.5, pageWidth - margin - 10, currentY + 1.5);

  // ===== CERTIFICATE TITLE =====
  currentY += 12;
  doc.setFontSize(24);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('CERTIFICATE', centerX, currentY, { align: 'center' });

  currentY += 6;
  doc.setFontSize(14);
  doc.text('OF TRAINING COMPLETION', centerX, currentY, { align: 'center' });

  // Gold border around title
  currentY += 3;
  doc.setLineWidth(0.8);
  doc.setDrawColor(245, 158, 11);
  doc.line(margin + 20, currentY, pageWidth - margin - 20, currentY);

  // ===== DOCUMENT NUMBER (Official style) =====
  currentY += 8;
  doc.setFontSize(8);
  doc.setFont('times', 'normal');
  doc.setTextColor(100, 100, 100);
  const certId = data.certification.certificate_id || generateCertificateId();
  doc.text(`Document No. ${certId}`, centerX, currentY, { align: 'center' });

  // ===== CERTIFICATE BODY =====
  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text('TO WHOM IT MAY CONCERN:', margin + 10, currentY);

  currentY += 10;
  const bodyX = margin + 10;
  const bodyWidth = pageWidth - margin * 2 - 20;

  // First paragraph
  doc.setFontSize(11);
  const para1 = `This is to certify that ${data.trainee.full_name.toUpperCase()} has satisfactorily completed `;
  doc.text(para1, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 10;

  const para2 = `the training program entitled "${data.program.title}" conducted by the Public Employment Service Office `;
  doc.text(para2, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 10;

  const startDate = formatDate(data.program.start_date);
  const endDate = data.program.end_date ? formatDate(data.program.end_date) : 'Present';
  const para3 = `of the Municipality of Asuncion, Province of Davao del Norte, from ${startDate} to ${endDate}.`;
  doc.text(para3, bodyX, currentY, { maxWidth: bodyWidth });

  // Program details box - Dynamic height
  currentY += 15;
  const boxStartY = currentY;

  // Calculate content height first
  let boxContentHeight = 6; // Top padding for title
  boxContentHeight += 5; // TRAINING DETAILS title
  boxContentHeight += 5; // Duration line

  if (data.program.speaker_name) {
    boxContentHeight += 5; // Speaker line
  }

  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    boxContentHeight += 5; // Competencies label
    boxContentHeight += 4; // Spacing before skills
    const skills = data.program.skills_covered.join(', ');
    const skillsHeight = calculateTextHeight(doc, skills, bodyWidth - 10, 9, 1.3);
    boxContentHeight += skillsHeight;
  }

  boxContentHeight += 6; // Bottom padding

  // Draw box with calculated height
  const boxHeight = Math.max(boxContentHeight, 30); // Minimum 30mm
  doc.setFillColor(250, 248, 240); // #FAF8F0 Warm background
  doc.setDrawColor(245, 158, 11); // #F59E0B Gold border
  doc.setLineWidth(0.5);
  doc.rect(bodyX, boxStartY, bodyWidth, boxHeight, 'FD');

  // Add content inside box
  currentY = boxStartY + 6;
  doc.setFontSize(9);
  doc.setFont('times', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text('TRAINING DETAILS', bodyX + 5, currentY);

  currentY += 5;
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Duration: ${data.program.duration}`, bodyX + 5, currentY);

  if (data.program.speaker_name) {
    currentY += 5;
    doc.setFont('times', 'italic');
    doc.setTextColor(245, 158, 11);
    doc.text(`Resource Speaker: ${data.program.speaker_name}`, bodyX + 5, currentY);
    doc.setFont('times', 'normal');
    doc.setTextColor(0, 0, 0);
  }

  if (data.program.skills_covered && data.program.skills_covered.length > 0) {
    currentY += 5;
    doc.setFont('times', 'bold');
    doc.text('Competencies Acquired:', bodyX + 5, currentY);
    currentY += 4;
    doc.setFont('times', 'normal');
    // Show ALL skills (no slicing), join with comma
    const skills = data.program.skills_covered.join(', ');
    // Use multi-line wrapping instead of truncation
    currentY = addMultiLineText(doc, skills, bodyX + 5, currentY, bodyWidth - 10, 9, 'left', 1.3);
  }

  // Update currentY to after box
  currentY = boxStartY + boxHeight;

  // Closing statement
  currentY += 12;
  doc.setFontSize(11);
  doc.setFont('times', 'normal');
  doc.setTextColor(0, 0, 0);
  const issueDate = formatDate(data.certification.issued_at);
  doc.text(`This certificate is issued this ${issueDate} at the Municipality of Asuncion,`, bodyX, currentY, { maxWidth: bodyWidth });
  currentY += 5;
  doc.text('Davao del Norte, Philippines.', bodyX, currentY);

  // ===== SIGNATURE SECTION (Government multi-block style) =====
  // Add direct spacing after closing statement (simple approach like Classic Formal)
  currentY += 18;

  // Primary signature (Issuing Officer) - Centered
  const signatureWidth = 40;
  const signatureHeight = 14;
  const signatureX = centerX - (signatureWidth / 2);
  const signatureLineY = currentY + 12;

  // Add signature image
  if (signatureBase64) {
    try {
      doc.addImage(signatureBase64, 'PNG', signatureX, signatureLineY - 14, signatureWidth, signatureHeight);
    } catch (error) {
      console.error('Error adding signature:', error);
    }
  }

  // Signature line (centered)
  doc.setLineWidth(0.5);
  doc.setDrawColor(0, 0, 0);
  const lineWidth = signatureWidth;
  doc.line(centerX - lineWidth / 2, signatureLineY, centerX + lineWidth / 2, signatureLineY);

  // Officer name and title (centered)
  doc.setFontSize(10);
  doc.setFont('times', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(data.certification.issued_by.name.toUpperCase(), centerX, signatureLineY + 4, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(data.certification.issued_by.title, centerX, signatureLineY + 8, { align: 'center' });

  // Official seal stamp placeholder (bottom right)
  currentY = pageHeight - 40;
  doc.setFontSize(6);
  doc.setFont('times', 'italic');
  doc.setTextColor(200, 200, 200);
  doc.text('NOT VALID WITHOUT OFFICIAL SEAL', pageWidth - margin - 5, currentY, { align: 'right' });

  // Return PDF as Uint8Array
  return new Uint8Array(doc.output('arraybuffer'));
}
