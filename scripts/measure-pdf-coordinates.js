/**
 * Measure PDF Coordinates Helper
 *
 * This script helps measure the exact coordinates on the PDF template
 * where we need to place text. Run this to understand the PDF dimensions.
 */

const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function measurePDFTemplate() {
  try {
    console.log('📐 Measuring CS Form 212, Revised 2025 PDF Template...\n');

    const templatePath = path.join(__dirname, '../public/templates/CS_Form_212_2025.pdf');
    const pdfBytes = fs.readFileSync(templatePath);

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();

    console.log(`📄 Total Pages: ${pages.length}\n`);

    pages.forEach((page, index) => {
      const { width, height } = page.getSize();
      console.log(`Page ${index + 1}:`);
      console.log(`  Width: ${width} points (${(width / 72).toFixed(2)} inches)`);
      console.log(`  Height: ${height} points (${(height / 72).toFixed(2)} inches)`);
      console.log(`  Orientation: ${width > height ? 'Landscape' : 'Portrait'}`);
      console.log('');
    });

    console.log('💡 Coordinate System:');
    console.log('  - Origin (0,0) is at BOTTOM-LEFT corner');
    console.log('  - X increases to the RIGHT');
    console.log('  - Y increases UPWARD');
    console.log('  - 1 point = 1/72 inch');
    console.log('');

    // Add grid lines to visualize coordinates
    console.log('🎯 Creating coordinate reference PDF...');

    const font = await pdfDoc.embedFont('Helvetica');

    pages.forEach((page, pageIndex) => {
      const { width, height } = page.getSize();

      // Draw grid lines every 50 points
      for (let x = 0; x <= width; x += 50) {
        page.drawLine({
          start: { x, y: 0 },
          end: { x, y: height },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.5
        });

        // Add X coordinate labels
        if (x > 0 && x < width) {
          page.drawText(`${x}`, {
            x: x - 10,
            y: 10,
            size: 6,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
      }

      for (let y = 0; y <= height; y += 50) {
        page.drawLine({
          start: { x: 0, y },
          end: { x: width, y },
          thickness: 0.5,
          color: rgb(0.9, 0.9, 0.9),
          opacity: 0.5
        });

        // Add Y coordinate labels
        if (y > 0 && y < height) {
          page.drawText(`${y}`, {
            x: 10,
            y: y - 3,
            size: 6,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
      }

      // Add corner markers
      const markerSize = 20;
      // Bottom-left (origin)
      page.drawText('(0,0)', { x: 15, y: 15, size: 8, color: rgb(1, 0, 0) });
      page.drawRectangle({
        x: 0,
        y: 0,
        width: markerSize,
        height: markerSize,
        borderColor: rgb(1, 0, 0),
        borderWidth: 2
      });

      // Top-left
      page.drawText(`(0,${Math.round(height)})`, { x: 15, y: height - 25, size: 8, color: rgb(0, 0, 1) });

      // Bottom-right
      page.drawText(`(${Math.round(width)},0)`, { x: width - 80, y: 15, size: 8, color: rgb(0, 1, 0) });

      // Top-right
      page.drawText(`(${Math.round(width)},${Math.round(height)})`, { x: width - 100, y: height - 25, size: 8, color: rgb(1, 0, 1) });
    });

    // Save the annotated PDF
    const outputPath = path.join(__dirname, '../public/templates/CS_Form_212_2025_WITH_GRID.pdf');
    const annotatedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, annotatedPdfBytes);

    console.log(`✅ Coordinate reference PDF saved to:`);
    console.log(`   ${outputPath}`);
    console.log('');
    console.log('📖 Open this PDF to see the grid and measure exact coordinates for text placement.');

  } catch (error) {
    console.error('❌ Error measuring PDF:', error);
    process.exit(1);
  }
}

measurePDFTemplate();
