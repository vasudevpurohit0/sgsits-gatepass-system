import crypto from 'crypto';
import { Visitor } from '@prisma/client';
import { VisitorRepository } from '../repositories/visitor.repository';
import { StorageService } from './storage.service';
import ApiError from '../utils/ApiError';

export class VisitorService {
  private visitorRepository: VisitorRepository;
  private storageService: StorageService;

  constructor() {
    this.visitorRepository = new VisitorRepository();
    this.storageService = new StorageService();
  }

  /**
   * Find an existing visitor by credentials or create a new visitor.
   * Enforces immediate block if visitor is blacklisted.
   */
  async findOrCreateVisitor(
    data: any, 
    idPhotoBuffer?: Buffer, 
    idPhotoMimeType?: string
  ): Promise<Visitor> {
    // 1. Query by unique phone number or unique ID document code
    let visitor = await this.visitorRepository.findByPhone(data.phone);
    if (!visitor) {
      visitor = await this.visitorRepository.findByIdNumber(data.idNumber);
    }

    if (visitor) {
      // Enforce blacklist check (BR-VIS-03)
      if (visitor.blacklisted) {
        throw new ApiError(403, `Access Denied: This visitor is blacklisted. Reason: ${visitor.blacklistReason || 'Violated security policy.'}`);
      }
      
      // Update info if different
      const updateData: any = {};
      if (data.name && data.name !== visitor.name) updateData.name = data.name;
      if (data.email && data.email !== visitor.email) updateData.email = data.email;
      if (data.category && data.category !== visitor.category) updateData.category = data.category;
      
      if (Object.keys(updateData).length > 0) {
        visitor = await this.visitorRepository.update(visitor.id, updateData);
      }
      return visitor;
    }

    // 2. Upload ID photo to MinIO with server-side encryption
    let idPhotoKey: string | null = null;
    if (idPhotoBuffer && idPhotoMimeType) {
      const fileExtension = idPhotoMimeType.split('/').pop() || 'png';
      const objectName = `visitor-ids/${crypto.randomUUID()}.${fileExtension}`;
      
      idPhotoKey = await this.storageService.uploadFile(objectName, idPhotoBuffer, idPhotoMimeType, true);
    }

    // 3. Create visitor database record
    return this.visitorRepository.create({
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      idType: data.idType,
      idNumber: data.idNumber,
      idPhotoKey,
      category: data.category || 'GENERAL',
    });
  }

  /**
   * Fetch visitor details and generate temporary presigned download URL for ID photo
   */
  async getVisitorById(id: string): Promise<Visitor & { idPhotoUrl?: string }> {
    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) {
      throw new ApiError(404, 'Visitor not found');
    }

    let idPhotoUrl: string | undefined = undefined;
    if (visitor.idPhotoKey) {
      idPhotoUrl = await this.storageService.getPresignedUrl(visitor.idPhotoKey, 300); // 5 minutes link TTL
    }

    return {
      ...visitor,
      idPhotoUrl,
    };
  }

  /**
   * Search and paginate visitor list
   */
  async listVisitors(filters: any) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    return this.visitorRepository.list({
      skip,
      take: limit,
      search: filters.search,
      blacklisted: filters.blacklisted,
    });
  }

  /**
   * Toggle visitor blacklist status
   */
  async setBlacklistStatus(id: string, blacklisted: boolean, reason?: string | null): Promise<Visitor> {
    const visitor = await this.visitorRepository.findById(id);
    if (!visitor) {
      throw new ApiError(404, 'Visitor not found');
    }

    return this.visitorRepository.update(id, {
      blacklisted,
      blacklistReason: blacklisted ? reason || 'Violated campus guidelines' : null,
    });
  }
}

export default VisitorService;
