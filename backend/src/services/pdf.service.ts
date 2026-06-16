import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

export class PdfService {
  /**
   * Programmatically generate the official SGSITS Entry/Exit Pass PDF in memory
   * Matching the exact design from the portal view (Screenshot 1)
   */
  async generatePassPdf(pass: any, qrCodeBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // 1. Construct Row Contents Array first to determine page height dynamically
        const rows: { label: string; value: string; split?: { label: string; value: string } }[] = [];

        rows.push({
          label: 'Visitor Category',
          value: pass.visitor?.category || 'GENERAL'
        });
        
        rows.push({
          label: 'Pass Created by',
          value: pass.createdByName || 'System Administrator'
        });
        
        rows.push({
          label: 'Pass Creator Dept/Section',
          value: pass.creatorDept || 'IT Dept'
        });
        
        rows.push({
          label: 'Visitor Name',
          value: pass.visitor?.name || 'N/A'
        });

        // Mobile & Email Split Row
        rows.push({
          label: 'Mobile',
          value: pass.visitor?.phone || 'N/A',
          split: {
            label: 'Email',
            value: pass.visitor?.email || 'N/A'
          }
        });

        rows.push({
          label: 'Visitor ID Type & Number',
          value: `${pass.visitor?.idType || 'OTHER'} (${pass.visitor?.idNumber || 'N/A'})`
        });

        rows.push({
          label: 'Visit Purpose',
          value: pass.purpose || 'N/A'
        });

        rows.push({
          label: 'Coming From',
          value: pass.comingFrom || 'N/A'
        });

        // Helper to format date period (e.g., 16/JUN/2026)
        const formatPeriodDate = (d: Date | string) => {
          const date = new Date(d);
          const day = String(date.getDate()).padStart(2, '0');
          const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
          const month = months[date.getMonth()];
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        };

        rows.push({
          label: 'Visit Period',
          value: `From : ${formatPeriodDate(pass.validFrom)} To : ${formatPeriodDate(pass.validTo)}`
        });

        // If pass is VEHICLE type, include vehicle fields
        if (pass.passType === 'VEHICLE' && pass.vehiclePass) {
          const vp = pass.vehiclePass;
          const v = vp.vehicle;
          rows.push({
            label: 'Vehicle Plate & Type',
            value: `${v?.numberPlate || 'N/A'} (${v?.vehicleType || 'OTHER'})`
          });
          rows.push({
            label: 'Driver Name & Phone',
            value: `${vp.driverName || 'N/A'} (${vp.driverPhone || 'N/A'})`
          });
        }

        // If pass is HOSTEL_GUEST type, include hostel fields
        if (pass.passType === 'HOSTEL_GUEST' && pass.hostelGuest) {
          const hg = pass.hostelGuest;
          rows.push({
            label: 'Hostel Block & Room',
            value: `${hg.hostelBlock || 'N/A'} - Room ${hg.roomNumber || 'N/A'}`
          });
          if (hg.warden) {
            rows.push({
              label: 'Approving Warden',
              value: `${hg.warden.firstName} ${hg.warden.lastName}`
            });
          }
        }

        // Calculate page height dynamically based on row count
        // 15 (top margin) + 28 (header) + 72 (barcode box) + (rows.length * 20) + 15 (space to QR) + 100 (QR box) + 15 (border bottom space) + 10 (space to footer) + 10 (footer text) + 15 (bottom margin)
        // Total = 280 + (rows.length * 20)
        const pageHeight = 280 + (rows.length * 20);

        const doc = new PDFDocument({
          size: [350, pageHeight],
          margin: 15,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
          logger.error('❌ PDF Generation stream error:', err);
          reject(err);
        });

        // Calculate bottom of the enclosing ticket border
        const borderBottom = pageHeight - 40;

        // 1. Draw the primary enclosing ticket border
        doc.rect(15, 15, 320, borderBottom - 15)
           .strokeColor('#000000')
           .lineWidth(1.5)
           .stroke();

        // 2. Header Box
        const headerTitle = pass.passType === 'VEHICLE' ? 'SGSITS Vehicle Entry Pass' : pass.passType === 'HOSTEL_GUEST' ? 'SGSITS Hostel Guest Pass' : 'SGSITS Entry/Exit Pass';
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#002147')
           .text(headerTitle, 15, 23, { align: 'center', width: 320 });

        // Draw line under header row
        doc.moveTo(15, 43)
           .lineTo(335, 43)
           .strokeColor('#000000')
           .lineWidth(1.5)
           .stroke();

        // 3. Barcode Box (Y = 43 to Y = 115)
        const passLabel = pass.passType === 'VEHICLE' ? 'OFFICIAL Vehicle Pass' : 'OFFICIAL Visitor';
        
        // Draw mock barcode
        const barcodeXStart = (350 - 155) / 2; // Center 155-point wide barcode
        const barcodeYStart = 53;
        const barcodeHeight = 35;
        const barcodePattern = [
          2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2,
          2, 1, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2
        ];
        
        let currentBarX = barcodeXStart;
        doc.fillColor('#000000');
        barcodePattern.forEach((width, idx) => {
          doc.rect(currentBarX, barcodeYStart, width, barcodeHeight).fill();
          currentBarX += width + (idx % 3 === 0 ? 2 : 1);
        });

        // Official Pass number label
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#c53030') // Bold red
           .text(`${passLabel} : ${pass.passNumber}`, 15, 96, { align: 'center', width: 320 });

        // Draw line under barcode box
        doc.moveTo(15, 115)
           .lineTo(335, 115)
           .strokeColor('#000000')
           .lineWidth(1)
           .stroke();

        // 4. Draw rows dynamically
        let currentY = 115;
        const rowHeight = 20;

        for (const row of rows) {
          doc.fontSize(8).fillColor('#000000');

          if (row.split) {
            // Draw left column key-value
            doc.font('Helvetica-Bold')
               .text(`  ${row.label} : `, 15, currentY + 6, { continued: true })
               .font('Helvetica')
               .text(row.value);

            // Draw splitting vertical divider line
            doc.moveTo(175, currentY)
               .lineTo(175, currentY + rowHeight)
               .strokeColor('#000000')
               .lineWidth(1)
               .stroke();

            // Draw right column key-value
            doc.font('Helvetica-Bold')
               .text(`  ${row.split.label} : `, 175, currentY + 6, { continued: true })
               .font('Helvetica')
               .text(row.split.value);
          } else {
            // Draw single full-width key-value
            doc.font('Helvetica-Bold')
               .text(`  ${row.label} : `, 15, currentY + 6, { continued: true })
               .font('Helvetica')
               .text(row.value);
          }

          currentY += rowHeight;

          // Draw horizontal dividing line below the row
          doc.moveTo(15, currentY)
             .lineTo(335, currentY)
             .strokeColor('#000000')
             .lineWidth(1)
             .stroke();
        }

        // 5. Draw QR Code centered inside a border box
        const qrBoxSize = 100;
        const qrBoxX = (350 - qrBoxSize) / 2;
        const qrBoxY = currentY + 15;

        // Draw QR box border
        doc.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize)
           .strokeColor('#000000')
           .lineWidth(1)
           .stroke();

        // Embed the QR image inside
        doc.image(qrCodeBuffer, qrBoxX + 2, qrBoxY + 2, {
          width: qrBoxSize - 4,
          height: qrBoxSize - 4
        });

        // 6. Footer Text (Red, placed outside the border at the bottom)
        const footerY = borderBottom + 10;
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#e53e3e')
           .text('Please show this at SGSITS entry/exit gate', 15, footerY, { align: 'center', width: 320 });

        // Finalize PDF stream
        doc.end();
      } catch (err) {
        logger.error('❌ Failed during PDF generation process:', err);
        reject(err);
      }
    });
  }
}

export default PdfService;

