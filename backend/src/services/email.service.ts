import { mailer } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { StorageService } from './storage.service';
import { PdfService } from './pdf.service';

const formatIST = (d: Date | string) => new Date(d).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

export class EmailService {
  private storageService: StorageService;
  private pdfService: PdfService;

  constructor() {
    this.storageService = new StorageService();
    this.pdfService = new PdfService();
  }

  /**
   * Helper to dispatch email (handles SMTP and HTTP APIs)
   */
  private async sendEmail(to: string, subject: string, html: string, attachments?: any[]): Promise<void> {
    await this.dispatchMail(to, subject, html, attachments);
  }

  /**
   * Dispatch email with fallback from Resend/Brevo REST APIs to standard SMTP
   */
  private async dispatchMail(to: string, subject: string, html: string, attachments?: any[]): Promise<{ success: boolean; error?: string }> {
    const fromEmail = env.EMAIL_USER || env.SMTP_USER || env.SMTP_FROM_EMAIL || 'gatepass.sgsits@gmail.com';
    const fromName = env.SMTP_FROM_NAME || 'SGSITS Security Team';

    // 1. Resend HTTP API Integration (Bypasses Railway SMTP port blocking)
    if (process.env.RESEND_API_KEY) {
      try {
        logger.info('📧 Dispatching email via Resend HTTP API...');
        const resendAttachments = attachments ? attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64'),
        })) : [];

        const isDefaultSandbox = process.env.RESEND_API_KEY.includes('re_') && !process.env.RESEND_CUSTOM_DOMAIN;
        const resendFrom = isDefaultSandbox ? 'onboarding@resend.dev' : `"${fromName}" <${fromEmail}>`;

        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: resendFrom,
            to,
            subject,
            html,
            attachments: resendAttachments,
          }),
        });

        const resData: any = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || `Resend HTTP error ${response.status}`);
        }
        logger.info(`📧 Email sent successfully via Resend to ${to}. ID: ${resData.id}`);
        return { success: true };
      } catch (err: any) {
        logger.error('❌ Resend API dispatch failed:', err);
        return { success: false, error: `Resend API failed: ${err.message}` };
      }
    }

    // 2. Brevo HTTP API Integration (Bypasses Railway SMTP port blocking)
    if (process.env.BREVO_API_KEY) {
      try {
        logger.info('📧 Dispatching email via Brevo HTTP API...');
        const brevoAttachments = attachments ? attachments.map(att => ({
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : Buffer.from(att.content).toString('base64'),
          name: att.filename,
        })) : [];

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': process.env.BREVO_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: { name: fromName, email: fromEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            attachment: brevoAttachments,
          }),
        });

        const resData: any = await response.json();
        if (!response.ok) {
          throw new Error(resData.message || `Brevo HTTP error ${response.status}`);
        }
        logger.info(`📧 Email sent successfully via Brevo to ${to}. Message ID: ${resData.messageId}`);
        return { success: true };
      } catch (err: any) {
        logger.error('❌ Brevo API dispatch failed:', err);
        return { success: false, error: `Brevo API failed: ${err.message}` };
      }
    }

    // 3. Nodemailer SMTP Fallback
    try {
      logger.info('📧 Dispatching email via standard SMTP...');
      await mailer.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
        attachments,
      });
      logger.info(`📧 Email sent successfully via SMTP to ${to}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`❌ Failed to send email via SMTP to ${to}:`, error);
      return { success: false, error: error.message || String(error) };
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

    return this.dispatchMail(to, subject, html, attachments);
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
