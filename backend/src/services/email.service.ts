import { mailer } from '../config/mailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class EmailService {
  private from: string;

  constructor() {
    this.from = `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`;
  }

  /**
   * Helper to dispatch SMTP nodemailer request
   */
  private async sendEmail(to: string, subject: string, html: string): Promise<void> {
    try {
      await mailer.sendMail({
        from: this.from,
        to,
        subject,
        html,
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
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 25px; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #38a169; margin-top: 0; font-size: 20px;">Gate Pass Approved!</h2>
        <p>Your gate pass request has been reviewed and approved. Please present the QR code at the gate terminal for access.</p>
        <hr style="border: 0; border-top: 1px solid #edf2f7; margin: 20px 0;"/>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold; width: 150px;">Pass Number:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: bold;">${passDetails.passNumber}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Visitor Name:</td>
            <td style="padding: 6px 0; color: #2d3748;">${passDetails.visitor?.name}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096; font-weight: bold;">Validity:</td>
            <td style="padding: 6px 0; color: #2d3748;">${new Date(passDetails.validFrom).toLocaleString()} to ${new Date(passDetails.validTo).toLocaleString()}</td>
          </tr>
        </table>
        <div style="background-color: #f7fafc; padding: 15px; border-radius: 6px; text-align: center; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold; color: #4a5568;">Your entry pass is active.</p>
          <p style="margin: 0; font-size: 12px; color: #718096;">Use your personal portal to view the QR code scan token.</p>
        </div>
      </div>
    `;
    await this.sendEmail(to, subject, html);
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
