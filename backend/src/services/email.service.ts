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

  /**
   * Send Security Pass approval request to a selected approver, with Approve/Reject action links
   */
  async sendSecurityApprovalEmail(
    to: string,
    pass: any,
    visitor: any,
    generatedByName: string,
    approveLink: string,
    rejectLink: string
  ): Promise<{ success: boolean; error?: string }> {
    const subject = `Security Pass Approval Required - Walk-in Visitor [${pass.passNumber}]`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6; color: #334155;">
        <h2 style="color: #4a5568; margin-top: 0; font-size: 20px;">Security Pass Approval Required</h2>
        <p>A walk-in/unknown visitor is requesting gate access. Please review the details below.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;"/>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold; width: 170px;">Visitor Name:</td><td style="padding: 6px 0; color: #2d3748;">${visitor.name}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Phone Number:</td><td style="padding: 6px 0; color: #2d3748;">${visitor.phone}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Email:</td><td style="padding: 6px 0; color: #2d3748;">${visitor.email || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Government ID:</td><td style="padding: 6px 0; color: #2d3748;">${visitor.idType} - ${visitor.idNumber}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Purpose of Visit:</td><td style="padding: 6px 0; color: #2d3748;">${pass.purpose}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Whom to Visit:</td><td style="padding: 6px 0; color: #2d3748;">${pass.whomToVisit || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Remarks:</td><td style="padding: 6px 0; color: #2d3748;">${pass.notes || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Expected Duration:</td><td style="padding: 6px 0; color: #2d3748;">${pass.expectedDuration || 'N/A'}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Entry Gate:</td><td style="padding: 6px 0; color: #2d3748;">${(pass.allowedGates || []).join(', ')}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Generated By:</td><td style="padding: 6px 0; color: #2d3748;">${generatedByName}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Pass ID:</td><td style="padding: 6px 0; color: #2d3748;">${pass.passNumber}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096; font-weight: bold;">Date &amp; Time:</td><td style="padding: 6px 0; color: #2d3748;">${formatIST(pass.createdAt || new Date())}</td></tr>
        </table>
        <div style="margin-top: 28px; text-align: center;">
          <a href="${approveLink}" style="display: inline-block; background-color: #38a169; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; margin-right: 12px;">✅ Approve</a>
          <a href="${rejectLink}" style="display: inline-block; background-color: #e53e3e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold;">❌ Reject</a>
        </div>
        <p style="color: #718096; font-size: 12px; margin-top: 25px;">This link is valid for 24 hours and can only be used once. If acted on by another approver first, this link will show "already processed".</p>
      </div>
    `;
    return this.dispatchMail(to, subject, html);
  }

  /**
   * Notify creator/visitor that a Security Pass has been approved (reuses QR attachment pattern)
   */
  async sendSecurityPassApprovedNotification(to: string, pass: any): Promise<{ success: boolean; error?: string }> {
    const subject = `Security Pass Approved [${pass.passNumber}]`;
    const attachments: any[] = [];

    if (pass.qrImageKey) {
      try {
        const qrBuffer = await this.storageService.getFileBuffer(pass.qrImageKey);
        attachments.push({ filename: 'qrcode.png', content: qrBuffer, cid: 'qrcode' });
      } catch (err: any) {
        logger.error('❌ Failed to attach QR for approved security pass email:', err);
      }
    }

    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px; line-height: 1.6; color: #334155;">
        <p>Dear ${pass.visitor?.name || 'User'},</p>
        <p>The Security Pass [${pass.passNumber}] for visitor <strong>${pass.visitor?.name}</strong> has been approved by ${pass.approvedBy || 'a security approver'}.</p>
        ${pass.qrImageKey ? '<p>QR code is attached. Present it at the entry gate.</p><img src="cid:qrcode" alt="QR Code" style="width:200px;height:200px;" />' : ''}
        <br/>
        <p>Regards,<br/>Security Team</p>
      </div>
    `;
    return this.dispatchMail(to, subject, html, attachments);
  }

  /**
   * Notify creator/visitor that a Security Pass has been rejected
   */
  async sendSecurityPassRejectedNotification(to: string, pass: any): Promise<{ success: boolean; error?: string }> {
    const subject = `Security Pass Rejected [${pass.passNumber}]`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #e53e3e; margin-top: 0; font-size: 20px;">Security Pass Rejected</h2>
        <p>The Security Pass [${pass.passNumber}] for visitor <strong>${pass.visitor?.name}</strong> has been rejected by ${pass.rejectedBy || 'a security approver'}.</p>
      </div>
    `;
    return this.dispatchMail(to, subject, html);
  }
}

export default EmailService;
