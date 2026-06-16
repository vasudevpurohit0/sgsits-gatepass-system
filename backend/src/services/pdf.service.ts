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
        // Standardize document dimensions: width 350 points, height 500 points
        const doc = new PDFDocument({
          size: [350, 500],
          margin: 15,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
          logger.error('❌ PDF Generation stream error:', err);
          reject(err);
        });

        // 1. Draw the primary enclosing ticket border
        doc.rect(15, 15, 320, 470)
           .strokeColor('#000000')
           .lineWidth(1.5)
           .stroke();

        // 2. Header Box (SGSITS Entry/Exit Pass)
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#002147')
           .text('SGSITS Entry/Exit Pass', 15, 23, { align: 'center', width: 320 });

        // Draw line under header row
        doc.moveTo(15, 43)
           .lineTo(335, 43)
           .strokeColor('#000000')
           .lineWidth(1.5)
           .stroke();

        // 3. Official Pass number label
        doc.fontSize(9)
           .font('Helvetica-Bold')
           .fillColor('#c53030') // Bold red
           .text(`OFFICIAL Visitor : ${pass.passNumber}`, 15, 59, { align: 'center', width: 320 });

        // Draw line under pass number row
        doc.moveTo(15, 79)
           .lineTo(335, 79)
           .strokeColor('#000000')
           .lineWidth(1)
           .stroke();

        // 4. Construct Row Contents Array
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

        // 5. Draw rows dynamically
        let currentY = 79;
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

        // 6. Draw QR Code centered inside a border box
        const qrBoxSize = 100;
        const qrBoxX = (doc.page.width - qrBoxSize) / 2;
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

        // 7. Footer Text (Red)
        const footerY = qrBoxY + qrBoxSize + 15;
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
