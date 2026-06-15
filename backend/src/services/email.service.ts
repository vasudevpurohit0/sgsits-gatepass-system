import { mailer } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { StorageService } from './storage.service';
import { PdfService } from './pdf.service';

const formatIST = (d: Date | string) => new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

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
            <td style="padding: 6px 0; color: #2d3748;">${formatIST(passDetails.validFrom)} to ${formatIST(passDetails.validTo)}</td>
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
  async sendPassApprovedEmail(to: string, passDetails: any): Promise<{ success: boolean; error?: string }> {
    const subject = 'SGSITS Visitor Pass Approved';
    const attachments: any[] = [];

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
          filename: `SGSITS-Visitor-Pass-${passDetails.passNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        });
      } catch (err: any) {
        logger.error(`❌ Failed to attach QR or generate PDF for approved pass email:`, err);
        return { success: false, error: `PDF generation failed: ${err.message}` };
      }
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6; color: #334155;">
        <p>Dear ${passDetails.visitor?.name || 'Visitor'},</p>
        <p>Your visitor pass has been approved.</p>
        <p><strong>Pass Number:</strong> ${passDetails.passNumber}</p>
        <p>Your visitor pass PDF is attached to this email.</p>
        <p>Please download the PDF and present it at the SGSITS Entry/Exit Gate during your visit.</p>
        <br/>
        <p>Regards,<br/>SGSITS Security Team</p>
      </div>
    `;

    try {
      await mailer.sendMail({
        from: this.from,
        to,
        subject,
        html,
        attachments,
      });
      logger.info(`📧 Email sent successfully to ${to} [Subject: ${subject}]`);
      return { success: true };
    } catch (error: any) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      return { success: false, error: error.message || String(error) };
    }
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
