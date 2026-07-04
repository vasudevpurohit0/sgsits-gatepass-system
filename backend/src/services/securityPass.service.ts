import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Pass, PassStatus, PassType, UserRole } from '@prisma/client';
import { PassRepository } from '../repositories/pass.repository';
import { VisitorService } from './visitor.service';
import { PassService } from './pass.service';
import { StorageService } from './storage.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';

const APPROVAL_TOKEN_EXPIRY = '24h';
const APPROVAL_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

interface SecurityApprovalTokenPayload {
  passId: string;
  jti: string;
  approverEmail: string;
  action: 'approve' | 'reject';
}

export type SecurityPassResponseResult =
  | { status: 'approved'; pass: Pass }
  | { status: 'rejected'; pass: Pass }
  | { status: 'already_processed' }
  | { status: 'invalid' };

export class SecurityPassService {
  private passRepository: PassRepository;
  private visitorService: VisitorService;
  private passService: PassService;
  private storageService: StorageService;
  private emailService: EmailService;
  private notificationService: NotificationService;

  constructor() {
    this.passRepository = new PassRepository();
    this.visitorService = new VisitorService();
    this.passService = new PassService();
    this.storageService = new StorageService();
    this.emailService = new EmailService();
    this.notificationService = new NotificationService();
  }

  /**
   * Parse the dynamically configured list of security approver emails from .env
   */
  getApproverEmails(): string[] {
    return (env.SECURITY_APPROVER_EMAILS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Create a Security Pass for an unknown/walk-in visitor and dispatch approval emails
   */
  async createSecurityPass(
    creatorId: string,
    creatorName: string,
    data: any,
    govIdPhoto?: { buffer: Buffer; mimeType: string },
    visitorPhoto?: { buffer: Buffer; mimeType: string },
    frontendUrl?: string
  ): Promise<Pass> {
    const selectedApprovers: string[] = Array.isArray(data.approverEmails) ? data.approverEmails : [data.approverEmails];

    // 1. Resolve visitor record (reuses existing visitor find-or-create + blacklist check)
    const visitor = await this.visitorService.findOrCreateVisitor(
      {
        name: data.visitorName,
        phone: data.phone,
        email: data.email,
        idType: data.govIdType,
        idNumber: data.govIdNumber,
        category: 'GENERAL',
      },
      govIdPhoto?.buffer,
      govIdPhoto?.mimeType
    );

    // 2. Upload visitor photo separately (the gate-captured photo, distinct from the gov ID photo)
    let visitorPhotoKey: string | null = null;
    if (visitorPhoto?.buffer && visitorPhoto?.mimeType) {
      const fileExtension = visitorPhoto.mimeType.split('/').pop() || 'png';
      const objectName = `security-pass-photos/${crypto.randomUUID()}.${fileExtension}`;
      visitorPhotoKey = await this.storageService.uploadFile(objectName, visitorPhoto.buffer, visitorPhoto.mimeType, true);
    }

    // 3. Generate pass number, one-time approval nonce
    const passNumber = `SP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const jti = crypto.randomBytes(16).toString('hex');
    const approvalTokenExpiry = new Date(Date.now() + APPROVAL_TOKEN_EXPIRY_MS);
    const now = new Date();
    const validTo = new Date(now.getTime() + APPROVAL_TOKEN_EXPIRY_MS);

    // 4. Create Pass record with PENDING_SECURITY_APPROVAL status (no QR yet)
    const pass = await this.passRepository.create({
      requesterId: creatorId,
      visitorId: visitor.id,
      passNumber,
      passType: PassType.SECURITY_PASS,
      status: PassStatus.PENDING_SECURITY_APPROVAL,
      purpose: data.purpose,
      notes: data.remarks || null,
      createdByName: creatorName,
      whomToVisit: data.whomToVisit,
      expectedDuration: data.expectedDuration,
      visitorPhotoKey,
      validFrom: now,
      validTo,
      allowedGates: [data.entryGate],
      approvalToken: jti,
      approvalTokenExpiry,
    });

    // 5. Sign approve/reject JWTs per selected approver and send approval emails
    const resolvedFrontendUrl = frontendUrl || process.env.CORS_ORIGIN || 'http://localhost:5173';
    setImmediate(async () => {
      for (const approverEmail of selectedApprovers) {
        try {
          const approveToken = this.signApprovalToken({ passId: pass.id, jti, approverEmail, action: 'approve' });
          const rejectToken = this.signApprovalToken({ passId: pass.id, jti, approverEmail, action: 'reject' });
          const approveLink = `${resolvedFrontendUrl}/security-pass/respond?token=${encodeURIComponent(approveToken)}`;
          const rejectLink = `${resolvedFrontendUrl}/security-pass/respond?token=${encodeURIComponent(rejectToken)}`;

          const res = await this.emailService.sendSecurityApprovalEmail(approverEmail, pass, visitor, creatorName, approveLink, rejectLink);
          if (res && !res.success) {
            logger.error(`❌ Failed to send security approval email to ${approverEmail}: ${res.error}`);
            await prisma.emailDeliveryLog.create({
              data: {
                passId: pass.id,
                passNumber: pass.passNumber,
                visitorName: visitor.name,
                visitorEmail: approverEmail,
                status: "FAILED",
                sentTimestamp: null,
                errorMessage: res.error || "Brevo/Resend API rejected transmission",
              }
            });
          } else {
            logger.info(`📧 Security approval email successfully dispatched to ${approverEmail}`);
            await prisma.emailDeliveryLog.create({
              data: {
                passId: pass.id,
                passNumber: pass.passNumber,
                visitorName: visitor.name,
                visitorEmail: approverEmail,
                status: "SUCCESS",
                sentTimestamp: new Date(),
                errorMessage: null,
              }
            });
          }
        } catch (err: any) {
          logger.error(`❌ Unhandled exception sending security approval email to ${approverEmail}:`, err);
          try {
            await prisma.emailDeliveryLog.create({
              data: {
                passId: pass.id,
                passNumber: pass.passNumber,
                visitorName: visitor.name,
                visitorEmail: approverEmail,
                status: "FAILED",
                sentTimestamp: null,
                errorMessage: err.message || String(err),
              }
            });
          } catch (dbErr) {
            logger.error('❌ Failed to create email log in database:', dbErr);
          }
        }
      }
    });

    return pass;
  }

  private signApprovalToken(payload: SecurityApprovalTokenPayload): string {
    return jwt.sign(payload, env.SECURITY_PASS_TOKEN_SECRET, { expiresIn: APPROVAL_TOKEN_EXPIRY });
  }

  /**
   * Handle an approver clicking an approve/reject link. One-time use, 24h expiry, signed token.
   */
  async respondToSecurityPass(rawToken: string, frontendUrl?: string): Promise<SecurityPassResponseResult> {
    let decoded: SecurityApprovalTokenPayload;
    try {
      decoded = jwt.verify(rawToken, env.SECURITY_PASS_TOKEN_SECRET) as unknown as SecurityApprovalTokenPayload;
    } catch {
      return { status: 'invalid' };
    }

    const { passId, jti, approverEmail, action } = decoded;

    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      return { status: 'invalid' };
    }

    if (
      pass.status !== PassStatus.PENDING_SECURITY_APPROVAL ||
      pass.approvalToken !== jti ||
      !pass.approvalTokenExpiry ||
      new Date(pass.approvalTokenExpiry).getTime() < Date.now()
    ) {
      return { status: 'already_processed' };
    }

    // Invalidate every other outstanding link for this pass immediately
    if (action === 'approve') {
      await this.passRepository.update(passId, {
        status: PassStatus.APPROVED,
        approvedAt: new Date(),
        approvedBy: approverEmail,
        approvalToken: null,
        approvalTokenExpiry: null,
      });

      const updatedPass = await this.passService.generateAndAttachQR(passId, pass.passNumber, pass.validTo, frontendUrl);
      const finalPass = (await this.passRepository.findById(passId)) as any;

      if (finalPass) {
        setImmediate(() => {
          this.emailService.sendSecurityPassApprovedNotification(finalPass.requester.email, finalPass).catch(err => {
            logger.error('❌ Background security pass approved email to creator failed:', err);
          });
          if (finalPass.visitor.email) {
            this.emailService.sendSecurityPassApprovedNotification(finalPass.visitor.email, finalPass).catch(err => {
              logger.error('❌ Background security pass approved email to visitor failed:', err);
            });
          }
        });

        await this.notificationService.createNotification(
          finalPass.requesterId,
          'Security Pass Approved 🎉',
          `Security Pass [${finalPass.passNumber}] for ${finalPass.visitor.name} has been approved by ${approverEmail}.`,
          'PASS_APPROVED',
          passId
        );
      }

      return { status: 'approved', pass: updatedPass };
    } else {
      const updatedPass = await this.passRepository.update(passId, {
        status: PassStatus.REJECTED,
        rejectedAt: new Date(),
        rejectedBy: approverEmail,
        approvalToken: null,
        approvalTokenExpiry: null,
      });

      const finalPass = (await this.passRepository.findById(passId)) as any;
      if (finalPass) {
        setImmediate(() => {
          this.emailService.sendSecurityPassRejectedNotification(finalPass.requester.email, finalPass).catch(err => {
            logger.error('❌ Background security pass rejected email to creator failed:', err);
          });
          if (finalPass.visitor.email) {
            this.emailService.sendSecurityPassRejectedNotification(finalPass.visitor.email, finalPass).catch(err => {
              logger.error('❌ Background security pass rejected email to visitor failed:', err);
            });
          }
        });

        await this.notificationService.createNotification(
          finalPass.requesterId,
          'Security Pass Rejected ❌',
          `Security Pass [${finalPass.passNumber}] for ${finalPass.visitor.name} has been rejected by ${approverEmail}.`,
          'PASS_REJECTED',
          passId
        );
      }

      return { status: 'rejected', pass: updatedPass };
    }
  }

  /**
   * List Security Passes, scoped: creators see their own, admins/guards see all (mirrors view_all_passes scoping)
   */
  async listSecurityPasses(userId: string, role: UserRole, filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const result = await this.passRepository.list({
      userId,
      role,
      skip,
      take: limit,
      search: filters.search,
      status: filters.status,
      passType: PassType.SECURITY_PASS,
    });

    if (role === UserRole.SECURITY_GUARD) {
      const ownOnly = result.passes.filter((p: any) => p.requesterId === userId);
      return { passes: ownOnly, count: ownOnly.length };
    }

    return result;
  }
}

export default SecurityPassService;
