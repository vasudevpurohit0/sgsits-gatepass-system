import QRCode from 'qrcode';
import { Pass, PassStatus, PassType, UserRole, ApprovalStatus } from '@prisma/client';
import { PassRepository } from '../repositories/pass.repository';
import { VisitorService } from './visitor.service';
import { StorageService } from './storage.service';
import { EmailService } from './email.service';
import { NotificationService } from './notification.service';
import { encryptQRToken } from '../utils/qrCrypto';
import ApiError from '../utils/ApiError';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export class PassService {
  private passRepository: PassRepository;
  private visitorService: VisitorService;
  private storageService: StorageService;
  private emailService: EmailService;
  private notificationService: NotificationService;

  constructor() {
    this.passRepository = new PassRepository();
    this.visitorService = new VisitorService();
    this.storageService = new StorageService();
    this.emailService = new EmailService();
    this.notificationService = new NotificationService();
  }

  /**
   * Request a new gate pass. Implements VIP auto-approvals and conditional modules.
   */
  async createPass(requesterId: string, data: any, idPhotoBuffer?: Buffer, idPhotoMimeType?: string, frontendUrl?: string): Promise<Pass> {
    // 1. Resolve visitor details
    const visitor = await this.visitorService.findOrCreateVisitor(
      data.visitor,
      idPhotoBuffer,
      idPhotoMimeType
    );

    // 2. Generate unique pass number: GP-YYYY-XXXXXX
    const passNumber = `GP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const validFrom = new Date(data.validFrom);
    const validTo = new Date(data.validTo);

    // 3. Determine Initial Status
    let status: PassStatus = PassStatus.PENDING_APPROVAL;
    let approvedAt: Date | null = null;

    // BR-VIS-05: VIP visitors bypass normal approval; pass is auto-approved on creation
    const isVIP = visitor.category === 'VIP';
    if (isVIP) {
      status = PassStatus.APPROVED;
      approvedAt = new Date();
    }

    // Start database transaction to ensure atomicity
    const pass = await prisma.$transaction(async (tx) => {
      // 4. Create Pass record
      const createdPass = await tx.pass.create({
        data: {
          requesterId,
          visitorId: visitor.id,
          eventId: data.eventId || null,
          passNumber,
          passType: data.passType,
          status,
          purpose: data.purpose,
          notes: data.notes || null,
          createdByName: data.createdByName || null,
          creatorDept: data.creatorDept || null,
          comingFrom: data.comingFrom || null,
          validFrom,
          validTo,
          allowedGates: data.allowedGates,
          isMultiEntry: data.isMultiEntry || false,
          approvedAt,
        },
      });

      // 5. Link Vehicle Pass details if PassType is VEHICLE
      if (data.passType === PassType.VEHICLE && data.vehicleDetails) {
        const vehicle = await tx.vehicle.upsert({
          where: { numberPlate: data.vehicleDetails.numberPlate },
          create: {
            ownerId: requesterId,
            numberPlate: data.vehicleDetails.numberPlate,
            vehicleType: data.vehicleDetails.vehicleType,
            make: data.vehicleDetails.make || null,
            model: data.vehicleDetails.model || null,
            color: data.vehicleDetails.color || null,
          },
          update: {},
        });

        await tx.vehiclePass.create({
          data: {
            passId: createdPass.id,
            vehicleId: vehicle.id,
            driverName: data.vehicleDetails.driverName,
            driverPhone: data.vehicleDetails.driverPhone,
          },
        });
      }

      // 6. Link Hostel Guest details if PassType is HOSTEL_GUEST
      if (data.passType === PassType.HOSTEL_GUEST && data.hostelDetails) {
        await tx.hostelGuest.create({
          data: {
            passId: createdPass.id,
            wardenId: data.hostelDetails.wardenId,
            hostelBlock: data.hostelDetails.hostelBlock,
            roomNumber: data.hostelDetails.roomNumber,
            plannedNights: data.hostelDetails.plannedNights,
          },
        });
      }

      return createdPass;
    });

    // 7. If Auto-approved (VIP), generate QR details
    if (isVIP) {
      const updatedPass = await this.generateAndAttachQR(pass.id, passNumber, validTo, frontendUrl);
      
      // Send approval notification and email in the background (non-blocking, deferred)
      const finalPass = (await this.passRepository.findById(updatedPass.id)) as any;
      if (finalPass) {
        setImmediate(async () => {
          this.emailService.sendPassApprovedEmail(finalPass.requester.email, finalPass).catch(err => {
            logger.error('❌ Background email to requester failed:', err);
          });
          if (finalPass.visitor.email) {
            try {
              const res = await this.emailService.sendPassApprovedEmail(finalPass.visitor.email, finalPass);
              await prisma.emailDeliveryLog.create({
                data: {
                  passId: finalPass.id,
                  passNumber: finalPass.passNumber,
                  visitorName: finalPass.visitor.name,
                  visitorEmail: finalPass.visitor.email,
                  approvalTimestamp: finalPass.approvedAt || new Date(),
                  status: res.success ? "SUCCESS" : "FAILED",
                  sentTimestamp: res.success ? new Date() : null,
                  errorMessage: res.error || null,
                }
              });
            } catch (err: any) {
              logger.error('❌ Background email to visitor failed:', err);
              await prisma.emailDeliveryLog.create({
                data: {
                  passId: finalPass.id,
                  passNumber: finalPass.passNumber,
                  visitorName: finalPass.visitor.name,
                  visitorEmail: finalPass.visitor.email,
                  approvalTimestamp: finalPass.approvedAt || new Date(),
                  status: "FAILED",
                  sentTimestamp: null,
                  errorMessage: err.message || String(err),
                }
              });
            }
          }
        });
      }
      return updatedPass;
    }

    // 8. If Normal Approval required, trigger notification
    const fullPass = (await this.passRepository.findById(pass.id)) as any;
    if (fullPass) {
      setImmediate(() => {
        this.emailService.sendPassCreatedEmail(fullPass.requester.email, fullPass).catch(err => {
          logger.error('❌ Background email to requester failed:', err);
        });
      });
      
      // Notify Warden if hostel pass
      if (fullPass.passType === PassType.HOSTEL_GUEST && fullPass.hostelGuest) {
        await this.notificationService.createNotification(
          fullPass.hostelGuest.wardenId,
          'Warden Review Required',
          `Hostel guest pass request [${passNumber}] requires your review.`,
          'PASS_CREATED',
          fullPass.id
        );
      }
    }

    return fullPass || pass;
  }

  /**
   * Helper to generate encrypted QR code payload and upload image to MinIO
   */
  async generateAndAttachQR(passId: string, passNumber: string, validTo: Date, frontendUrlParam?: string): Promise<Pass> {
    // 1. Encrypt token payload (AES-256-CBC + HMAC-SHA256)
    const qrToken = encryptQRToken({
      passId,
      passNumber,
      validTo: validTo.toISOString(),
    });

    // 2. Generate QR Image Buffer containing the verification URL
    const frontendUrl = frontendUrlParam || process.env.CORS_ORIGIN || 'http://localhost:5173';
    const qrCodeUrl = `${frontendUrl}/terminal?token=${encodeURIComponent(qrToken)}`;

    const qrImageBuffer = await QRCode.toBuffer(qrCodeUrl, {
      type: 'png',
      margin: 1,
      width: 300,
    });

    // 3. Upload to MinIO
    const qrImageKey = `qr-passes/${passId}.png`;
    await this.storageService.uploadFile(qrImageKey, qrImageBuffer, 'image/png');

    // 4. Update Database
    return this.passRepository.update(passId, {
      qrToken,
      qrImageKey,
    });
  }

  /**
   * Retrieve a single pass by ID, appending presigned URL for visitor photo and QR code
   */
  async getPassById(id: string): Promise<any> {
    let pass = (await this.passRepository.findById(id)) as any;
    if (!pass) {
      throw new ApiError(404, 'Pass not found');
    }

    // Self-heal: an approval can succeed while the QR upload fails (e.g. storage
    // outage), leaving an APPROVED/ACTIVE pass permanently stuck without a QR.
    // Retry attaching the QR on read instead of leaving it locked forever.
    const canHaveQr = pass.status === PassStatus.APPROVED || pass.status === PassStatus.ACTIVE;
    if (canHaveQr && !pass.qrImageKey) {
      try {
        pass = await this.generateAndAttachQR(pass.id, pass.passNumber, pass.validTo, process.env.CORS_ORIGIN);
        pass = (await this.passRepository.findById(id)) as any;
      } catch (err) {
        logger.error(`❌ Retry QR generation failed for pass "${id}":`, err);
      }
    }

    let visitorPhotoUrl = undefined;
    if (pass.visitor.idPhotoKey) {
      visitorPhotoUrl = await this.storageService.getPresignedUrl(pass.visitor.idPhotoKey, 300);
    }

    let qrImageUrl = undefined;
    if (pass.qrImageKey) {
      qrImageUrl = await this.storageService.getPresignedUrl(pass.qrImageKey, 300);
    }

    return {
      ...pass,
      visitorPhotoUrl,
      qrImageUrl,
    };
  }

  /**
   * List/search passes with role scoping
   */
  async listPasses(userId: string, role: UserRole, filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    return this.passRepository.list({
      userId,
      role,
      skip,
      take: limit,
      search: filters.search,
      status: filters.status,
      passType: filters.passType,
    });
  }

  /**
   * Process approval or rejection of a pass request
   */
  async approveOrRejectPass(passId: string, approverId: string, approved: boolean, remarks?: string | null, frontendUrl?: string): Promise<Pass> {
    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      throw new ApiError(404, 'Pass not found');
    }

    if (pass.status !== PassStatus.PENDING_APPROVAL) {
      throw new ApiError(400, 'Pass is not pending approval review');
    }

    // Write approval log to database
    await prisma.approval.create({
      data: {
        passId,
        approverId,
        status: approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED,
        remarks: remarks || null,
        decidedAt: new Date(),
      },
    });

    if (approved) {
      // 1. Update status to APPROVED
      await this.passRepository.update(passId, {
        status: PassStatus.APPROVED,
        approvedAt: new Date(),
      });

      // 2. Generate and attach QR code assets
      const updatedPass = await this.generateAndAttachQR(passId, pass.passNumber, pass.validTo, frontendUrl);

      // 3. Dispatch Emails
      const finalPass = (await this.passRepository.findById(passId)) as any;
      let emailWarning: string | undefined = undefined;

      if (finalPass) {
        // Send email to requester in the background (non-blocking)
        setImmediate(() => {
          this.emailService.sendPassApprovedEmail(finalPass.requester.email, finalPass).catch(err => {
            logger.error('❌ Background email to requester failed:', err);
          });
        });

        // Send email to visitor synchronously so we can return warning to admin
        if (finalPass.visitor.email) {
          try {
            const emailResult = await this.emailService.sendPassApprovedEmail(finalPass.visitor.email, finalPass);
            await prisma.emailDeliveryLog.create({
              data: {
                passId: finalPass.id,
                passNumber: finalPass.passNumber,
                visitorName: finalPass.visitor.name,
                visitorEmail: finalPass.visitor.email,
                approvalTimestamp: finalPass.approvedAt || new Date(),
                status: emailResult.success ? "SUCCESS" : "FAILED",
                sentTimestamp: emailResult.success ? new Date() : null,
                errorMessage: emailResult.error || null,
              }
            });

            if (!emailResult.success) {
              emailWarning = emailResult.error;
            }
          } catch (err: any) {
            logger.error('❌ Email to visitor failed:', err);
            await prisma.emailDeliveryLog.create({
              data: {
                passId: finalPass.id,
                passNumber: finalPass.passNumber,
                visitorName: finalPass.visitor.name,
                visitorEmail: finalPass.visitor.email,
                approvalTimestamp: finalPass.approvedAt || new Date(),
                status: "FAILED",
                sentTimestamp: null,
                errorMessage: err.message || String(err),
              }
            });
            emailWarning = err.message || String(err);
          }
        }

        // Notify requester in-app
        await this.notificationService.createNotification(
          finalPass.requesterId,
          'Pass Approved 🎉',
          `Your pass request [${pass.passNumber}] for ${pass.visitor.name} has been approved.`,
          'PASS_APPROVED',
          passId
        );
      }

      const returnPass = { ...updatedPass } as any;
      if (emailWarning) {
        returnPass.emailWarning = emailWarning;
      }
      return returnPass;
    } else {
      // 1. Update status to REJECTED
      const updatedPass = await this.passRepository.update(passId, {
        status: PassStatus.REJECTED,
      });

      // 2. Dispatch rejection notifications in the background (non-blocking, deferred)
      const finalPass = (await this.passRepository.findById(passId)) as any;
      if (finalPass) {
        setImmediate(() => {
          this.emailService.sendPassRejectedEmail(finalPass.requester.email, finalPass, remarks || '').catch(err => {
            logger.error('❌ Background rejection email failed:', err);
          });
        });
        
        await this.notificationService.createNotification(
          finalPass.requesterId,
          'Pass Rejected ❌',
          `Your pass request [${pass.passNumber}] has been rejected.`,
          'PASS_REJECTED',
          passId
        );
      }

      return updatedPass;
    }
  }

  /**
   * Revoke an active pass
   */
  async revokePass(passId: string, revokerId: string, revokerRole: UserRole, reason: string): Promise<Pass> {
    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      throw new ApiError(404, 'Pass not found');
    }

    if (pass.status !== PassStatus.APPROVED && pass.status !== PassStatus.ACTIVE) {
      throw new ApiError(400, 'Only active or approved passes can be revoked');
    }

    // Verify requester ownership if student or faculty is attempting revocation
    const isOwner = pass.requesterId === revokerId;
    const isSecAdmin = ([UserRole.SECURITY_ADMIN, UserRole.SUPER_ADMIN] as UserRole[]).includes(revokerRole);
    const isWarden = revokerRole === UserRole.HOSTEL_WARDEN && pass.hostelGuest?.wardenId === revokerId;

    if (!isOwner && !isSecAdmin && !isWarden) {
      throw new ApiError(403, 'Forbidden: You do not have permission to revoke this pass');
    }

    // Revoke pass in database
    const updatedPass = await this.passRepository.update(passId, {
      status: PassStatus.REVOKED,
      revokedAt: new Date(),
      revokedReason: reason,
    });

    // Delete QR code from storage to prevent validation
    if (pass.qrImageKey) {
      try {
        await this.storageService.deleteFile(pass.qrImageKey);
      } catch (err) {
        logger.error('Failed to clean up QR code file on revocation:', err);
      }
    }

    // Notify requester and visitor in the background (non-blocking, deferred)
    const finalPass = (await this.passRepository.findById(passId)) as any;
    if (finalPass) {
      setImmediate(() => {
        this.emailService.sendPassRevokedEmail(finalPass.requester.email, finalPass, reason).catch(err => {
          logger.error('❌ Background revocation email failed:', err);
        });
      });
      
      await this.notificationService.createNotification(
        finalPass.requesterId,
        'Pass Revoked 🛡️',
        `Pass [${pass.passNumber}] has been revoked.`,
        'PASS_REVOKED',
        passId
      );
    }

    return updatedPass;
  }

  /**
   * Resend approved visitor pass email manually
   */
  async resendApprovedPassEmail(passId: string): Promise<{ success: boolean; error?: string }> {
    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      throw new ApiError(404, 'Pass not found');
    }

    if (pass.status !== PassStatus.APPROVED && pass.status !== PassStatus.ACTIVE) {
      throw new ApiError(400, `Pass is in status "${pass.status}" and cannot be emailed. Only APPROVED or ACTIVE passes can be resent.`);
    }

    if (!pass.visitor.email) {
      throw new ApiError(400, 'Visitor has no email address configured.');
    }

    try {
      const emailResult = await this.emailService.sendPassApprovedEmail(pass.visitor.email, pass);
      
      // Save log in db
      await prisma.emailDeliveryLog.create({
        data: {
          passId: pass.id,
          passNumber: pass.passNumber,
          visitorName: pass.visitor.name,
          visitorEmail: pass.visitor.email,
          approvalTimestamp: pass.approvedAt || new Date(),
          status: emailResult.success ? "SUCCESS" : "FAILED",
          sentTimestamp: emailResult.success ? new Date() : null,
          errorMessage: emailResult.error || null,
        }
      });

      return emailResult;
    } catch (err: any) {
      logger.error('❌ Failed to resend pass email:', err);
      
      await prisma.emailDeliveryLog.create({
        data: {
          passId: pass.id,
          passNumber: pass.passNumber,
          visitorName: pass.visitor.name,
          visitorEmail: pass.visitor.email,
          approvalTimestamp: pass.approvedAt || new Date(),
          status: "FAILED",
          sentTimestamp: null,
          errorMessage: err.message || String(err),
        }
      });

      return { success: false, error: err.message || String(err) };
    }
  }
}

export default PassService;
