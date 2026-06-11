import { mailer } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { StorageService } from './storage.service';
import { PdfService } from './pdf.service';

export class EmailService {
  private from: string;
  private storageService: StorageService;
  private pdfService: PdfService;

  constructor() {
    const fromEmail = env.EMAIL_USER || env.SMTP_USER || env.SMTP_FROM_EMAIL;
    this.from = `"${env.SMTP_FROM_NAME}" <${fromEmail}>`;
    this.storageService = new StorageService();
    this.pdfService = new PdfService();
  }

  /**
   * Helper to dispatch SMTP nodemailer request
   */
  private async sendEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    try {
      await mailer.sendMail({
        from: this.from,
        to,
        subject,
        html,
        attachments,
      });
      logger.info(`📧 Email sent successfully to ${to} [Subject: ${subject}]`);
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
    }
  }

  /**
   * Notify requester about pass request submission
   */
  async sendPassCreatedEmail(to: string, passDetails: any): Promise<void> {
    const subject = `Gate Pass Created - Pending Approval [${passDetails.passNumber}]`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4a5568; margin-top: 0; font-size: 20px;">Gate Pass Request Submitted</h2>
        <p>A new visitor gate pass request has been successfully submitted and is currently pending approval.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;"/>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 150px;">Pass Number:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.passNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Visitor Name:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.visitor?.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Pass Type:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.passType}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Purpose:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.purpose}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Validity:</td>
            <td style="padding: 6px 0; color: #2d3748;">${new Date(passDetails.validFrom).toLocaleString()} to ${new Date(passDetails.validTo).toLocaleString()}</td>
          </tr>
        </table>
        <p style="color: #718096; font-size: 13px; margin-top: 25px;">You will receive another email update once the pass is reviewed by the appropriate warden/authority.</p>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }

  /**
   * Notify requester about pass approval
   */
  async sendPassApprovedEmail(to: string, passDetails: any): Promise<void> {
    const subject = `Gate Pass Approved [${passDetails.passNumber}]`;
    const attachments: any[] = [];
    let qrHtmlSection = '';

    if (passDetails.qrImageKey) {
      try {
        // Fetch the QR code buffer from MinIO
        const qrBuffer = await this.storageService.getFileBuffer(passDetails.qrImageKey);
        
        // Attach the QR image for inline display
        attachments.push({
          filename: 'qrcode.png',
          content: qrBuffer,
          cid: 'qrcode',
        });

        // Generate the PDF pass using PdfService
        const pdfBuffer = await this.pdfService.generatePassPdf(passDetails, qrBuffer);
        
        // Attach the PDF document
        attachments.push({
          filename: `GatePass_${passDetails.passNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });

        qrHtmlSection = `
          <div style="text-align: center; margin: 25px 0; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px dashed #cbd5e1;">
            <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: bold; color: #475569;">Entry/Exit Verification QR Code</p>
            <img src="cid:qrcode" alt="Gate Pass QR Code" style="width: 160px; height: 160px; display: block; margin: 0 auto; border: 1px solid #e2e8f0; padding: 5px; background: white;" />
            <p style="margin: 10px 0 0 0; font-size: 11px; color: #94a3b8;">Show this QR code at the gate terminal or print the attached PDF pass.</p>
          </div>
        `;
      } catch (err) {
        logger.error(`❌ Failed to attach QR or generate PDF for approved pass email:`, err);
      }
    }

    // Prepare conditional sections for the HTML body
    let passSpecificHtml = '';
    if (passDetails.passType === 'VEHICLE' && passDetails.vehiclePass) {
      const vp = passDetails.vehiclePass;
      const v = vp.vehicle;
      passSpecificHtml = `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold; border-top: 1px solid #f1f5f9; width: 150px;">Vehicle Plate:</td>
          <td style="padding: 6px 0; color: #334155; border-top: 1px solid #f1f5f9;">${v?.numberPlate || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Vehicle Type:</td>
          <td style="padding: 6px 0; color: #334155;">${v?.vehicleType || 'N/A'}</td>
        </tr>
        ${v?.make || v?.model ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Make/Model:</td>
          <td style="padding: 6px 0; color: #334155;">${v.make || ''} ${v.model || ''}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Driver Name:</td>
          <td style="padding: 6px 0; color: #334155;">${vp.driverName || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Driver Phone:</td>
          <td style="padding: 6px 0; color: #334155;">${vp.driverPhone || 'N/A'}</td>
        </tr>
      `;
    } else if (passDetails.passType === 'HOSTEL_GUEST' && passDetails.hostelGuest) {
      const hg = passDetails.hostelGuest;
      passSpecificHtml = `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold; border-top: 1px solid #f1f5f9; width: 150px;">Hostel Block:</td>
          <td style="padding: 6px 0; color: #334155; border-top: 1px solid #f1f5f9;">${hg.hostelBlock || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Room Number:</td>
          <td style="padding: 6px 0; color: #334155;">${hg.roomNumber || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Planned Nights:</td>
          <td style="padding: 6px 0; color: #334155;">${hg.plannedNights || '0'}</td>
        </tr>
        ${hg.warden ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Approving Warden:</td>
          <td style="padding: 6px 0; color: #334155;">${hg.warden.firstName} ${hg.warden.lastName}</td>
        </tr>
        ` : ''}
      `;
    }

    const html = `
      <div style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #1e3a8a; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px;">SGSITS ENTRY/EXIT PASS</h1>
          <div style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 10px; text-transform: uppercase;">
            Approved
          </div>
        </div>
        
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 0;">Your visitor gate pass request has been reviewed and approved. The official PDF gate pass ticket is attached to this email. You can present the attached PDF or show the QR code below at the entry/exit gate.</p>
        
        <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold; width: 150px;">Pass Number:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${passDetails.passNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Pass Type:</td>
              <td style="padding: 6px 0; color: #1e293b;">${passDetails.passType}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Visitor Name:</td>
              <td style="padding: 6px 0; color: #1e293b; font-weight: bold;">${passDetails.visitor?.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Visitor Phone:</td>
              <td style="padding: 6px 0; color: #1e293b;">${passDetails.visitor?.phone || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Visitor Category:</td>
              <td style="padding: 6px 0; color: #1e293b;">${passDetails.visitor?.category || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Purpose:</td>
              <td style="padding: 6px 0; color: #1e293b;">${passDetails.purpose || 'N/A'}</td>
            </tr>
            
            ${passSpecificHtml}
            
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold; border-top: 1px solid #f1f5f9;">Valid From:</td>
              <td style="padding: 6px 0; color: #1e293b; border-top: 1px solid #f1f5f9;">${new Date(passDetails.validFrom).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Valid To:</td>
              <td style="padding: 6px 0; color: #1e293b;">${new Date(passDetails.validTo).toLocaleString()}</td>
            </tr>
            ${passDetails.allowedGates && passDetails.allowedGates.length > 0 ? `
            <tr>
              <td style="padding: 6px 0; color: #64748b; font-weight: bold;">Allowed Gates:</td>
              <td style="padding: 6px 0; color: #1e293b;">${passDetails.allowedGates.join(', ')}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${qrHtmlSection}

        <div style="background-color: #fffbeb; padding: 15px; border-radius: 8px; border: 1px solid #fde68a; margin-top: 20px;">
          <p style="margin: 0; font-size: 12px; color: #b45309; line-height: 1.5; font-weight: bold; text-align: center;">
            Please show the attached PDF or scan code at the SGSITS entry/exit gate. Keep a valid physical photo ID card for verification.
          </p>
        </div>
      </div>
    `;

    await this.sendEmail(to, subject, html, attachments);
  }

  /**
   * Notify requester about pass rejection
   */
  async sendPassRejectedEmail(to: string, passDetails: any, remarks: string): Promise<void> {
    const subject = `Gate Pass Request Rejected [${passDetails.passNumber}]`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e; margin-top: 0; font-size: 20px;">Request Rejected</h2>
        <p>We regret to inform you that your gate pass request has been rejected during review.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;"/>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 150px;">Pass Number:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.passNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Rejection Reason:</td>
            <td style="padding: 6px 0; color: #e53e3e; font-weight: bold;">${remarks || 'No remarks provided.'}</td>
          </tr>
        </table>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }

  /**
   * Notify requester about pass revocation
   */
  async sendPassRevokedEmail(to: string, passDetails: any, reason: string): Promise<void> {
    const subject = `Gate Pass Revoked [${passDetails.passNumber}]`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e; margin-top: 0; font-size: 20px;">Gate Pass Revoked</h2>
        <p>Please note that your active gate pass has been revoked by campus security administration.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;"/>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 150px;">Pass Number:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.passNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Revocation Reason:</td>
            <td style="padding: 6px 0; color: #e53e3e; font-weight: bold;">${reason || 'No specific reason provided.'}</td>
          </tr>
        </table>
      </div>
    `;
    await this.sendEmail(to, subject, html);
  }
}

export default EmailService;
