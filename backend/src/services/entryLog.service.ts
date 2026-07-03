import { EntryLog, LogType, PassStatus } from '@prisma/client';
import { EntryLogRepository } from '../repositories/entryLog.repository';
import { PassRepository } from '../repositories/pass.repository';
import { NotificationService } from './notification.service';
import { decryptAndVerifyQRToken } from '../utils/qrCrypto';
import ApiError from '../utils/ApiError';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

export class EntryLogService {
  private entryLogRepository: EntryLogRepository;
  private passRepository: PassRepository;
  private notificationService: NotificationService;

  constructor() {
    this.entryLogRepository = new EntryLogRepository();
    this.passRepository = new PassRepository();
    this.notificationService = new NotificationService();
  }

  /**
   * Scan and verify a visitor's QR code token.
   * Performs gate routing checks, validity checks, and logs entry or exit.
   */
  async scanAndVerifyQR(guardId: string, qrToken: string, gate: string): Promise<EntryLog> {
    // 1. Decrypt and verify QR Token
    let decryptedPayload;
    try {
      decryptedPayload = decryptAndVerifyQRToken(qrToken);
    } catch (err: any) {
      throw new ApiError(400, `Invalid or tampered QR code: ${err.message}`);
    }

    const { passId, passNumber } = decryptedPayload;

    // 2. Fetch pass details
    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      throw new ApiError(404, 'Gate pass record not found');
    }

    // 3. Perform Business Rule Checks
    const now = new Date();
    const validFrom = new Date(pass.validFrom);
    const validTo = new Date(pass.validTo);

    const formatIST = (d: Date) => d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });

    // Check pass status
    if (
      pass.status !== PassStatus.APPROVED &&
      pass.status !== PassStatus.ACTIVE
    ) {
      throw new ApiError(403, `Access Denied: Pass status is "${pass.status}"`);
    }

    // Check validity window
    if (now < validFrom) {
      throw new ApiError(
        403,
        `Access Denied: Pass is not active yet. Valid From: ${formatIST(validFrom)} | Server Time: ${formatIST(now)}`
      );
    }

    if (now > validTo) {
      // Auto-update pass status to EXPIRED
      await this.passRepository.update(passId, { status: PassStatus.EXPIRED });
      throw new ApiError(
        403,
        `Access Denied: Pass expired at ${formatIST(validTo)} | Server Time: ${formatIST(now)}`
      );
    }

    // Check allowed gates
    if (!pass.allowedGates.includes(gate)) {
      throw new ApiError(403, `Access Denied: Pass is not valid for gate "${gate}". Allowed gates: ${pass.allowedGates.join(', ')}`);
    }

    // 4. Determine Log Type (ENTRY or EXIT)
    const lastLog = await this.entryLogRepository.findLastLogByPassId(passId);
    let logType: LogType = LogType.ENTRY;
    
    if (lastLog && lastLog.logType === LogType.ENTRY && !lastLog.exitAt) {
      // Last log was an ENTRY and has no EXIT logged yet: this is an EXIT check out!
      logType = LogType.EXIT;
    }



    // Calculate total scans already registered
    const logs = await prisma.entryLog.findMany({ where: { passId } });
    const scanCount = logs.reduce((acc, log) => acc + (log.exitAt ? 2 : 1), 0);

    // 5. Check Single-Entry reuse constraints (Max 4 scans = 2 entries + 2 exits allowed)
    if (logType === LogType.ENTRY && !pass.isMultiEntry && scanCount >= 4) {
      await this.passRepository.update(passId, { status: PassStatus.USED });
      throw new ApiError(403, 'Access Denied: Single-entry pass has exceeded its scan reuse limit (Max 4 scans)');
    }

    // 6. Process entry/exit log and database updates
    return prisma.$transaction(async (tx) => {
      let loggedAction;

      if (logType === LogType.ENTRY) {
        loggedAction = await tx.entryLog.create({
          data: {
            passId,
            guardId,
            gate,
            logType: LogType.ENTRY,
            entryAt: now,
            vehiclePlate: pass.vehiclePass?.vehicle?.numberPlate || null,
          },
          include: {
            pass: {
              include: { visitor: true },
            },
          },
        });

        // Set pass status to ACTIVE
        await tx.pass.update({
          where: { id: passId },
          data: { status: PassStatus.ACTIVE },
        });

        // Notify requester in-app and email
        await this.notificationService.createNotification(
          pass.requesterId,
          'Visitor Entered Campus 🚪',
          `Your visitor ${pass.visitor.name} has checked in at "${gate}".`,
          'VISITOR_ENTERED',
          passId
        );
      } else {
        // Log is an EXIT
        const entryTime = lastLog!.entryAt ? new Date(lastLog!.entryAt).getTime() : lastLog!.createdAt.getTime();
        const exitTime = now.getTime();
        const dwellMinutes = Math.round((exitTime - entryTime) / 60000);

        loggedAction = await tx.entryLog.update({
          where: { id: lastLog!.id },
          data: {
            exitAt: now,
            logType: LogType.EXIT,
            dwellMinutes,
          },
          include: {
            pass: {
              include: { visitor: true },
            },
          },
        });

        // If single-entry and total scans reached 4 or more, mark pass as USED
        const updatedLogs = await tx.entryLog.findMany({ where: { passId } });
        const updatedScanCount = updatedLogs.reduce((acc, log) => acc + (log.exitAt ? 2 : 1), 0);

        if (!pass.isMultiEntry && updatedScanCount >= 4) {
          await tx.pass.update({
            where: { id: passId },
            data: { status: PassStatus.USED },
          });
        }

        // Notify requester
        await this.notificationService.createNotification(
          pass.requesterId,
          'Visitor Exited Campus 🚪',
          `Your visitor ${pass.visitor.name} has checked out at "${gate}" (Dwell: ${dwellMinutes} mins).`,
          'VISITOR_EXITED',
          passId
        );
      }

      logger.info(`🚪 Logged ${logType} for pass ${passNumber} at gate ${gate}`);
      return loggedAction;
    });
  }

  /**
   * Log manual entry/exit override (triggered by guard upon security approval)
   */
  async logManualOverride(
    guardId: string,
    passId: string,
    gate: string,
    logType: LogType,
    overrideReason: string
  ): Promise<EntryLog> {
    const pass = (await this.passRepository.findById(passId)) as any;
    if (!pass) {
      throw new ApiError(404, 'Pass not found');
    }

    return prisma.$transaction(async (tx) => {
      let loggedAction;
      const now = new Date();

      if (logType === LogType.ENTRY) {
        loggedAction = await tx.entryLog.create({
          data: {
            passId,
            guardId,
            gate,
            logType: LogType.ENTRY,
            entryAt: now,
            isManualOverride: true,
            overrideReason,
            vehiclePlate: pass.vehiclePass?.vehicle?.numberPlate || null,
          },
          include: {
            pass: {
              include: { visitor: true },
            },
          },
        });

        await tx.pass.update({
          where: { id: passId },
          data: { status: PassStatus.ACTIVE },
        });

        await this.notificationService.createNotification(
          pass.requesterId,
          'Visitor Entered (Manual Override) 🚪',
          `Your visitor ${pass.visitor.name} was checked in manually at "${gate}".`,
          'VISITOR_ENTERED',
          passId
        );
      } else {
        const lastLog = await this.entryLogRepository.findLastLogByPassId(passId);
        const entryTime = lastLog?.entryAt ? new Date(lastLog.entryAt).getTime() : now.getTime();
        const dwellMinutes = Math.round((now.getTime() - entryTime) / 60000);

        if (lastLog) {
          loggedAction = await tx.entryLog.update({
            where: { id: lastLog.id },
            data: {
              exitAt: now,
              logType: LogType.EXIT,
              isManualOverride: true,
              overrideReason,
              dwellMinutes,
            },
            include: {
              pass: {
                include: { visitor: true },
              },
            },
          });
        } else {
          // Fallback if no entry was logged (forced exit override)
          loggedAction = await tx.entryLog.create({
            data: {
              passId,
              guardId,
              gate,
              logType: LogType.EXIT,
              exitAt: now,
              isManualOverride: true,
              overrideReason,
              dwellMinutes: 0,
            },
            include: {
              pass: {
                include: { visitor: true },
              },
            },
          });
        }

        // If single-entry and total scans reached 4 or more, mark pass as USED
        const updatedLogs = await tx.entryLog.findMany({ where: { passId } });
        const updatedScanCount = updatedLogs.reduce((acc: number, log: any) => acc + (log.exitAt ? 2 : 1), 0);

        if (!pass.isMultiEntry && updatedScanCount >= 4) {
          await tx.pass.update({
            where: { id: passId },
            data: { status: PassStatus.USED },
          });
        }

        await this.notificationService.createNotification(
          pass.requesterId,
          'Visitor Exited (Manual Override) 🚪',
          `Your visitor ${pass.visitor.name} was checked out manually at "${gate}".`,
          'VISITOR_EXITED',
          passId
        );
      }

      logger.warn(`🛡️ Manual override logged: ${logType} for pass ${pass.passNumber} by guard ${guardId}`);
      return loggedAction;
    });
  }

  /**
   * List entry log history
   */
  async listLogs(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    return this.entryLogRepository.list({
      skip,
      take: limit,
      gate: filters.gate,
      logType: filters.logType,
      passId: filters.passId,
    });
  }
}

export default EntryLogService;
