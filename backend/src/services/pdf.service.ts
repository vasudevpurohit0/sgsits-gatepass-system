import PDFDocument from 'pdfkit';
import { logger } from '../utils/logger';

export class PdfService {
  /**
   * Programmatically generate the official SGSITS Entry/Exit Pass PDF in memory
   */
  async generatePassPdf(pass: any, qrCodeBuffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        // Create a custom A6-sized ticket (approximately 105mm x 148mm)
        // PDFKit uses points: A6 is ~298 x 420 points
        const doc = new PDFDocument({
          size: [298, 450],
          margin: 15,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', (err) => {
          logger.error('❌ PDF Generation stream error:', err);
          reject(err);
        });

        // 1. Header Title (SGSITS Entry/Exit Pass)
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1a365d')
           .text('SGSITS ENTRY/EXIT PASS', { align: 'center' });
        
        doc.moveDown(0.3);

        // 2. Status Badge (Green APPROVED)
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#2f855a')
           .text('STATUS: APPROVED', { align: 'center' });

        doc.moveDown(0.4);

        // 3. Thick divider line
        doc.moveTo(15, doc.y)
           .lineTo(doc.page.width - 15, doc.y)
           .strokeColor('#cbd5e0')
           .lineWidth(1.5)
           .stroke();
        
        doc.moveDown(0.4);

        // 4. Centered QR Code
        const qrSize = 130;
        const qrX = (doc.page.width - qrSize) / 2;
        doc.image(qrCodeBuffer, qrX, doc.y, { width: qrSize, height: qrSize });
        
        // Move vertical insertion point below the QR code image
        doc.y += qrSize;
        doc.moveDown(0.4);

        // 5. Details Section
        doc.fillColor('#2d3748').fontSize(8);

        // Helper function for formatted detail rows
        const addDetailRow = (label: string, value: string) => {
          if (!value) return;
          doc.font('Helvetica-Bold')
             .text(label + ': ', { continued: true })
             .font('Helvetica')
             .text(value);
        };

        addDetailRow('Pass Number', pass.passNumber);
        addDetailRow('Pass Type', pass.passType);
        addDetailRow('Visitor Name', pass.visitor?.name);
        addDetailRow('Visitor Phone', pass.visitor?.phone);
        addDetailRow('Visitor Category', pass.visitor?.category);
        addDetailRow('Purpose', pass.purpose);

        // Vehicle specific details if present
        if (pass.passType === 'VEHICLE' && pass.vehiclePass) {
          const vp = pass.vehiclePass;
          const v = vp.vehicle;
          if (v) {
            addDetailRow('Vehicle Plate', v.numberPlate);
            addDetailRow('Vehicle Type', v.vehicleType);
            if (v.make || v.model) {
              addDetailRow('Vehicle Make/Model', `${v.make || ''} ${v.model || ''}`.trim());
            }
          }
          addDetailRow('Driver Name', vp.driverName);
          addDetailRow('Driver Phone', vp.driverPhone);
        }

        // Hostel Guest details if present
        if (pass.passType === 'HOSTEL_GUEST' && pass.hostelGuest) {
          const hg = pass.hostelGuest;
          addDetailRow('Hostel Block', hg.hostelBlock);
          addDetailRow('Room Number', hg.roomNumber);
          addDetailRow('Planned Nights', String(hg.plannedNights));
          if (hg.warden) {
            addDetailRow('Approving Warden', `${hg.warden.firstName} ${hg.warden.lastName}`);
          }
        }

        // Additional location columns from Phase 8
        if (pass.createdByName) addDetailRow('Created By', pass.createdByName);
        if (pass.creatorDept) addDetailRow('Department', pass.creatorDept);
        if (pass.comingFrom) addDetailRow('Coming From', pass.comingFrom);

        addDetailRow('Valid From', new Date(pass.validFrom).toLocaleString());
        addDetailRow('Valid To', new Date(pass.validTo).toLocaleString());

        if (pass.allowedGates && pass.allowedGates.length > 0) {
          addDetailRow('Allowed Gates', pass.allowedGates.join(', '));
        }

        doc.moveDown(0.8);

        // 6. Thin divider line before footer
        doc.moveTo(15, doc.y)
           .lineTo(doc.page.width - 15, doc.y)
           .strokeColor('#e2e8f0')
           .lineWidth(1)
           .stroke();
        
        doc.moveDown(0.4);

        // 7. Footer Text (Red)
        doc.fontSize(8)
           .font('Helvetica-Bold')
           .fillColor('#e53e3e')
           .text('Please show this at SGSITS entry/exit gate', { align: 'center' });

        // Finalize the PDF document
        doc.end();
      } catch (err) {
        logger.error('❌ Failed during PDF generation process:', err);
        reject(err);
      }
    });
  }
}

export default PdfService;
